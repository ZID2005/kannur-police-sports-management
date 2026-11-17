import { Navigate, createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '@/context/AuthContext';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { GateScannerLayout } from '@/layouts/GateScannerLayout';

import HomePage from '@/pages/public/HomePage';
import LoginPage from '@/pages/public/LoginPage';
import RegisterPage from '@/pages/public/RegisterPage';
import BookingsPage from '@/pages/public/BookingsPage';
import BookingTicketPage from '@/pages/public/BookingTicketPage';
import MembershipPage from '@/pages/public/membership/MembershipPage';
import MembershipPassPage from '@/pages/public/MembershipPassPage';

import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminMembershipsPage from '@/pages/admin/AdminMembershipsPage';
import AdminMembershipDetailPage from '@/pages/admin/AdminMembershipDetailPage';
import AdminFacilitiesPage from '@/pages/admin/AdminFacilitiesPage';
import AdminPaymentsPage from '@/pages/admin/AdminPaymentsPage';
import AdminGateEntriesPage from '@/pages/admin/AdminGateEntriesPage';
import AdminAuditLogPage from '@/pages/admin/AdminAuditLogPage';

import GateScannerPage from '@/pages/gate/GateScannerPage';
import NotFoundPage from '@/pages/NotFoundPage';

export const router = createBrowserRouter([
  /* ---------------- Public User ---------------- */
  {
    element: <PublicLayout variant="auth" />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <PublicLayout variant="app" />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/bookings', element: <BookingsPage /> },
      { path: '/bookings/ticket', element: <BookingTicketPage /> },
      { path: '/membership', element: <MembershipPage /> },
      { path: '/membership/pass', element: <MembershipPassPage /> },
    ],
  },

  /* ---------------- Staff & Officer Admin ---------------- */
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['STAFF_ADMIN']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboardPage /> },
      { path: 'memberships', element: <AdminMembershipsPage /> },
      { path: 'memberships/:id', element: <AdminMembershipDetailPage /> },
      { path: 'facilities', element: <AdminFacilitiesPage /> },
      { path: 'payments', element: <AdminPaymentsPage /> },
      { path: 'gate-entries', element: <AdminGateEntriesPage /> },
      { path: 'audit-log', element: <AdminAuditLogPage /> },
    ],
  },

  /* ---------------- Gate Verification ---------------- */
  {
    path: '/gate',
    element: (
      <ProtectedRoute allowedRoles={['GATE_OFFICER', 'STAFF_ADMIN']}>
        <GateScannerLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/gate/scanner" replace /> },
      { path: 'scanner', element: <GateScannerPage /> },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
]);
