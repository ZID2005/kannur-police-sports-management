import { AccountStatus, UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  account_status: AccountStatus;
  profile_photo_url: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
