import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import LoginPage from '@/pages/LoginPage';
import AdminLayout from '@/layouts/AdminLayout';
import UserLayout from '@/layouts/UserLayout';
import AdminDashboard from '@/pages/admin/Dashboard';
import OfficesPage from '@/pages/admin/Offices';

import TaskLogsPage from '@/pages/admin/TaskLogs';
import UsersPage from '@/pages/admin/Users';
import DailyTasks from '@/pages/user/DailyTasks';
import TaskSummary from '@/pages/user/TaskSummary';
import MeetingAgenda from '@/pages/user/MeetingAgenda';
import MinutesOfMeeting from '@/pages/user/MinutesOfMeeting';

import DeptHeadLayout from '@/layouts/DeptHeadLayout';
import DeptDashboard from '@/pages/dept-head/Dashboard';
import DeptEmployees from '@/pages/dept-head/Employees';
import DeptTaskLogs from '@/pages/dept-head/TaskLogs';
import DepartmentHeadsPage from '@/pages/admin/DepartmentHeads';
import MeetingsMonitor from '@/pages/admin/MeetingsMonitor';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
});

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute requiredRole="admin">
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'offices', element: <OfficesPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'dept-heads', element: <DepartmentHeadsPage /> },
      { path: 'logs', element: <TaskLogsPage /> },
      { path: 'summary', element: <TaskSummary /> },
      { path: 'meetings', element: <MeetingsMonitor /> },
    ],
  },
  {
    path: '/user',
    element: (
      <ProtectedRoute requiredRole="user">
        <UserLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DailyTasks /> },
      { path: 'summary', element: <TaskSummary /> },
      { path: 'agenda', element: <MeetingAgenda /> },
      { path: 'minutes', element: <MinutesOfMeeting /> },
      { path: 'minutes', element: <MinutesOfMeeting /> },
    ],
  },
  {
    path: '/dept-head',
    element: (
      <ProtectedRoute requiredRole="department_head">
        <DeptHeadLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DeptDashboard /> },
      { path: 'employees', element: <DeptEmployees /> },
      { path: 'logs', element: <DeptTaskLogs /> },
      { path: 'agenda', element: <MeetingAgenda /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <RouterProvider router={router} />
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
