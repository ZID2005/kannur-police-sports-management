import { Navigate, createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '@/context/AuthContext';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AdminLayout } from '@/layouts/AdminLayout';

import HomePage from '@/pages/public/HomePage';
import LoginPage from '@/pages/public/LoginPage';
import RegisterPage from '@/pages/public/RegisterPage';
import BookingsPage from '@/pages/public/BookingsPage';
import BookingTicketPage from '@/pages/public/BookingTicketPage';
import MyBookingsPage from '@/pages/public/MyBookingsPage';
import AccountPage from '@/pages/public/AccountPage';
import MembershipPage from '@/pages/public/membership/MembershipPage';
import MembershipPassPage from '@/pages/public/MembershipPassPage';

import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminBookingsPage from '@/pages/admin/AdminBookingsPage';
import AdminMembershipsPage from '@/pages/admin/AdminMembershipsPage';
import AdminFacilitiesPage from '@/pages/admin/AdminFacilitiesPage';
import AdminPaymentsPage from '@/pages/admin/AdminPaymentsPage';
import AdminAuditLogPage from '@/pages/admin/AdminAuditLogPage';

import NotFoundPage from '@/pages/NotFoundPage';

export const router = createBrowserRouter([
  /* ---------------- Member Portal ---------------- */
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
      { path: '/bookings/receipt', element: <BookingTicketPage /> },
      { path: '/my-bookings', element: <MyBookingsPage /> },
      { path: '/account', element: <AccountPage /> },
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
      { path: 'facilities', element: <AdminFacilitiesPage /> },
      { path: 'bookings', element: <AdminBookingsPage /> },
      { path: 'members', element: <AdminMembershipsPage /> },
      { path: 'memberships', element: <Navigate to="/admin/members" replace /> },
      { path: 'payments', element: <AdminPaymentsPage /> },
      { path: 'audit-log', element: <AdminAuditLogPage /> },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
]);
