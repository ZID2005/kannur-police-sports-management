import { AccountStatus, UserRole } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';
import { recordAuditLog } from '../../utils/auditLogger';
import { signSessionToken } from '../../utils/jwt';
import { hashPassword, verifyPassword } from '../../utils/password';
import { LoginInput, RegisterInput } from './auth.schema';

const USER_PUBLIC_SELECT = {
  id: true,
  username: true,
  full_name: true,
  email: true,
  role: true,
  account_status: true,
  profile_photo_url: true,
  created_at: true,
  updated_at: true,
} as const;

export class AuthService {
  /**
   * Registers a new `PUBLIC` or `GOVT_PERSONNEL` user account.
   * Zero mobile numbers, OTPs, or Aadhaar/Government ID numbers are collected.
   */
  static async register(input: RegisterInput) {
    if (input.role !== UserRole.PUBLIC && input.role !== UserRole.GOVT_PERSONNEL) {
      throw new AppError(
        "Self-registration is only permitted for 'PUBLIC' and 'GOVT_PERSONNEL' roles.",
        403,
        'FORBIDDEN_ROLE_REGISTRATION'
      );
    }

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
        username: input.username,
        password_hash: passwordHash,
        full_name: input.full_name,
        email: input.email ?? null,
        role: input.role,
        account_status: AccountStatus.ACTIVE,
        profile_photo_url: input.profile_photo_url ?? null,
      },
      select: USER_PUBLIC_SELECT,
    });

    const token = signSessionToken({
      id: createdUser.id,
      username: createdUser.username,
      role: createdUser.role,
    });

    return { user: createdUser, token };
  }

  /**
   * Authenticates a user by username & password.
   * Explicitly blocks `BANNED` and `SUSPENDED` accounts with clear administrative messages.
   */
  static async login(input: LoginInput, ipAddress: string) {
    const user = await prisma.user.findUnique({
      where: { username: input.username },
    });

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
    if (user.role === UserRole.STAFF_ADMIN || user.role === UserRole.GATE_OFFICER) {
      await recordAuditLog({
        officerId: user.id,
        actionCategory: 'OFFICER_AUTH',
        actionDescription: `Officer '${user.username}' (${user.role}) logged into the portal.`,
        targetRefId: user.id,
        details: { username: user.username, role: user.role },
        ipAddress,
      });
    }

    const sanitizedUser = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      account_status: user.account_status,
      profile_photo_url: user.profile_photo_url,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

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

    return user;
  }
}
