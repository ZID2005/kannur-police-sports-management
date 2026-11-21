import crypto from 'crypto';
import { AccountStatus, UserRole } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';
import { recordAuditLog } from '../../utils/auditLogger';
import { signSessionToken } from '../../utils/jwt';
import { hashPassword, verifyPassword } from '../../utils/password';
import { LoginInput, RegisterInput, UpdateProfileInput } from './auth.schema';

/**
 * Derives a clean, URL/handle-safe lowercase username from a member's full name
 * (e.g., "Anil Kumar" -> "anil.kumar").
 */
export function deriveUsernameBaseFromFullName(fullName: string): string {
  const slug = fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.{2,}/g, '.')
    .slice(0, 56);

  if (slug.length >= 3) {
    return slug;
  }
  return slug ? `${slug}.member` : 'kcp.member';
}

const USER_PUBLIC_SELECT = {
  id: true,
  username: true,
  full_name: true,
  email: true,
  role: true,
  account_status: true,
  profile_photo_url: true,
  gender: true,
  date_of_birth: true,
  parent_name: true,
  present_address: true,
  city_locality: true,
  pin_code: true,
  permanent_address: true,
  designation: true,
  office_address: true,
  track_purpose: true,
  is_registered_sportsperson: true,
  sport_discipline: true,
  association_details: true,
  created_at: true,
  updated_at: true,
} as const;

function sanitizeUserRecord(user: any) {
  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    email: user.email ?? null,
    role: user.role,
    account_status: user.account_status,
    profile_photo_url: user.profile_photo_url ?? null,
    gender: user.gender ?? null,
    date_of_birth: user.date_of_birth ?? null,
    parent_name: user.parent_name ?? null,
    present_address: user.present_address ?? null,
    city_locality: user.city_locality ?? null,
    pin_code: user.pin_code ?? null,
    permanent_address: user.permanent_address ?? null,
    designation: user.designation ?? null,
    office_address: user.office_address ?? null,
    track_purpose: user.track_purpose ?? null,
    is_registered_sportsperson: Boolean(user.is_registered_sportsperson),
    sport_discipline: user.sport_discipline ?? null,
    association_details: user.association_details ?? null,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export class AuthService {
  /**
   * Registers a new `PUBLIC` or `GOVT_PERSONNEL` user account.
   * Zero mobile numbers, OTPs, or Government ID numbers are collected.
   */
  static async register(input: RegisterInput) {
    if (input.role !== UserRole.PUBLIC && input.role !== UserRole.GOVT_PERSONNEL) {
      throw new AppError(
        "Self-registration is only permitted for 'PUBLIC' and 'GOVT_PERSONNEL' roles.",
        403,
        'FORBIDDEN_ROLE_REGISTRATION'
      );
    }

    let resolvedUsername: string;

    if (input.username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username: input.username },
        select: { id: true },
      });

      if (existingUsername) {
        throw new AppError(
          `Username '${input.username}' is already registered.`,
          409,
          'USERNAME_ALREADY_EXISTS'
        );
      }
      resolvedUsername = input.username;
    } else {
      const baseUsername = deriveUsernameBaseFromFullName(input.full_name);
      let candidate = baseUsername;

      const baseExists = await prisma.user.findUnique({
        where: { username: candidate },
        select: { id: true },
      });

      if (baseExists) {
        let assigned: string | null = null;
        for (let suffix = 2; suffix <= 99; suffix++) {
          const nextCandidate = `${baseUsername.slice(0, 60)}${suffix}`;
          const taken = await prisma.user.findUnique({
            where: { username: nextCandidate },
            select: { id: true },
          });
          if (!taken) {
            assigned = nextCandidate;
            break;
          }
        }
        candidate =
          assigned ?? `${baseUsername.slice(0, 55)}.${crypto.randomBytes(3).toString('hex')}`;
      }

      resolvedUsername = candidate;
    }

    if (input.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });

      if (existingEmail) {
        throw new AppError(
          `Email '${input.email}' is already associated with an existing account.`,
          409,
          'EMAIL_ALREADY_EXISTS'
        );
      }
    }

    const passwordHash = await hashPassword(input.password);

    const createdUser = await prisma.user.create({
      data: {
        username: resolvedUsername,
        password_hash: passwordHash,
        full_name: input.full_name,
        email: input.email ?? null,
        role: input.role,
        account_status: AccountStatus.ACTIVE,
        profile_photo_url: input.profile_photo_url ?? null,
        gender: input.gender ?? null,
        date_of_birth: input.date_of_birth ?? null,
        parent_name: input.parent_name ?? null,
        present_address: input.present_address ?? null,
        city_locality: input.city_locality ?? null,
        pin_code: input.pin_code ?? null,
        permanent_address: input.permanent_address ?? null,
        designation: input.designation ?? null,
        office_address: input.office_address ?? null,
        track_purpose: input.track_purpose ?? null,
        is_registered_sportsperson: input.is_registered_sportsperson ?? false,
        sport_discipline: input.sport_discipline ?? null,
        association_details: input.association_details ?? null,
      },
      select: USER_PUBLIC_SELECT,
    });

    const token = signSessionToken({
      id: createdUser.id,
      username: createdUser.username,
      role: createdUser.role,
    });

    return { user: sanitizeUserRecord(createdUser), token };
  }

  /**
   * Authenticates a user by username & password.
   * Explicitly blocks `BANNED` and `SUSPENDED` accounts with clear administrative messages.
   */
  static async login(input: LoginInput, ipAddress: string) {
    let user = await prisma.user.findUnique({
      where: { username: input.username },
    });

    // Also allow signing in by entering Full Name (e.g., "Anil Kumar" -> "anil.kumar")
    if (!user) {
      const derivedFromName = deriveUsernameBaseFromFullName(input.username);
      if (derivedFromName !== input.username) {
        user = await prisma.user.findUnique({
          where: { username: derivedFromName },
        });
      }
    }

    if (!user) {
      throw new AppError('Invalid username or password.', 401, 'INVALID_CREDENTIALS');
    }

    const isPasswordValid = await verifyPassword(input.password, user.password_hash);
    if (!isPasswordValid) {
      throw new AppError('Invalid username or password.', 401, 'INVALID_CREDENTIALS');
    }

    if (user.account_status === AccountStatus.BANNED) {
      const reasonText = user.ban_reason
        ? ` Reason: ${user.ban_reason}`
        : ' Please contact the Kannur City Police Sports Administration Office for details.';
      throw new AppError(
        `Login blocked: Your account has been permanently BANNED.${reasonText}`,
        403,
        'ACCOUNT_BANNED'
      );
    }

    if (user.account_status === AccountStatus.SUSPENDED) {
      const reasonText = user.ban_reason
        ? ` Reason: ${user.ban_reason}`
        : ' Please contact the Kannur City Police Sports Administration Office for assistance.';
      throw new AppError(
        `Login blocked: Your account is currently SUSPENDED.${reasonText}`,
        403,
        'ACCOUNT_SUSPENDED'
      );
    }

    const token = signSessionToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    // Record officer logins to the immutable local audit ledger
    if (user.role === UserRole.STAFF_ADMIN) {
      await recordAuditLog({
        officerId: user.id,
        actionCategory: 'OFFICER_AUTH',
        actionDescription: `Officer '${user.username}' (${user.role}) logged into the portal.`,
        targetRefId: user.id,
        details: {
          officer_username: user.username,
          officer_role: user.role,
          target_entity: 'USER',
          username: user.username,
          role: user.role,
          reason: 'Authenticated into Kannur City Police Sports Administration Portal.',
        },
        ipAddress,
      });
    }

    const sanitizedUser = sanitizeUserRecord(user);

    return { user: sanitizedUser, token };
  }

  /**
   * Fetches the currently authenticated user's profile.
   */
  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: USER_PUBLIC_SELECT,
    });

    if (!user) {
      throw new AppError('Authenticated user record not found.', 404, 'USER_NOT_FOUND');
    }

    return sanitizeUserRecord(user);
  }

  /**
   * Updates the currently authenticated user's benign profile & onboarding fields
   * (Gender, Date of Birth, Residential Address, Employment/Track Profile).
   * Strictly excludes role escalation, mobile/OTP, and Government ID numbers.
   */
  static async updateProfile(userId: string, input: UpdateProfileInput) {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!existingUser) {
      throw new AppError('Authenticated user record not found.', 404, 'USER_NOT_FOUND');
    }

    if (input.email && input.email !== existingUser.email) {
      const emailOwner = await prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });
      if (emailOwner && emailOwner.id !== userId) {
        throw new AppError(
          `Email '${input.email}' is already associated with an existing account.`,
          409,
          'EMAIL_ALREADY_EXISTS'
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    const assignIfDefined = <K extends keyof UpdateProfileInput>(key: K) => {
      if (input[key] !== undefined) {
        updateData[key] = input[key];
      }
    };

    assignIfDefined('full_name');
    assignIfDefined('email');
    assignIfDefined('gender');
    assignIfDefined('date_of_birth');
    assignIfDefined('parent_name');
    assignIfDefined('present_address');
    assignIfDefined('city_locality');
    assignIfDefined('pin_code');
    assignIfDefined('permanent_address');
    assignIfDefined('designation');
    assignIfDefined('office_address');
    assignIfDefined('track_purpose');
    assignIfDefined('is_registered_sportsperson');
    assignIfDefined('sport_discipline');
    assignIfDefined('association_details');

    if (input.is_registered_sportsperson === false) {
      updateData.sport_discipline = null;
      updateData.association_details = null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: USER_PUBLIC_SELECT,
    });

    return sanitizeUserRecord(updatedUser);
  }
}
