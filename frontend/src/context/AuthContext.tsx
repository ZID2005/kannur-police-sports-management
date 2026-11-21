import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  ApiError,
  authApi,
  type AuthUser,
  type BackendUserRole,
  type MemberOnboardingFields,
} from '@/api/client';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterPayload {
  username?: string;
  password: string;
  full_name: string;
  email?: string | null;
  role?: 'PUBLIC' | 'GOVT_PERSONNEL';
}

export type UpdateProfilePayload = {
  full_name?: string;
  email?: string | null;
} & MemberOnboardingFields;

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function getRoleRedirectPath(role: BackendUserRole): string {
  switch (role) {
    case 'STAFF_ADMIN':
      return '/admin/dashboard';
    case 'PUBLIC':
    case 'GOVT_PERSONNEL':
    default:
      return '/';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const data = await authApi.me();
      setUser(data.user);
      return data.user;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setUser(null);
        return null;
      }
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await authApi.me();
        if (active) setUser(data.user);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload): Promise<AuthUser> => {
    const data = await authApi.login(payload);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload: RegisterPayload): Promise<AuthUser> => {
    const data = await authApi.register(payload);
    setUser(data.user);
    return data.user;
  }, []);

  const updateProfile = useCallback(async (payload: UpdateProfilePayload): Promise<AuthUser> => {
    const data = await authApi.updateProfile(payload);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      register,
      updateProfile,
      logout,
      refreshUser,
    }),
    [user, loading, login, register, updateProfile, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
}

interface ProtectedRouteProps {
  allowedRoles?: BackendUserRole[];
  children?: ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F4F7FB] px-4">
        <div className="rounded-3xl bg-white/80 backdrop-blur-2xl px-8 py-6 shadow-[0_20px_48px_rgba(0,83,205,0.08)] flex items-center gap-3 text-[#111418]">
          <span className="w-3 h-3 rounded-full bg-[#1F6FFF] animate-pulse" />
          <span className="text-[15px] font-medium">
            Verifying Kannur City Police session...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getRoleRedirectPath(user.role)} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
