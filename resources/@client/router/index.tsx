import React from 'react';
import { useRoutes, Navigate } from 'react-router-dom';

import Login from '@/pages/Auth/Login';
import Register from '@/pages/Auth/Register';
import RoleSelectPage from '@/pages/Auth/RoleSelect';

import Layout from '@/components/Layout/Layout';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';

import Dashboard from '@/pages/Dashboard/Dashboard';
import JobOrdersList from '@/pages/JobOrders/JobOrdersList';
import JobOrderDetail from '@/pages/JobOrders/JobOrderDetail';
import ChallansList from '@/pages/Challans/ChallansList';
import ChallanDetail from '@/pages/Challans/ChallanDetail';
import RejectionsList from '@/pages/Rejections/RejectionsList';
import RejectionDetail from '@/pages/Rejections/RejectionDetail';
import ReconciliationsList from '@/pages/Reconciliations/ReconciliationsList';
import ReconciliationDetail from '@/pages/Reconciliations/ReconciliationDetail';
import VendorsList from '@/pages/Vendors/VendorsList';
import VendorDetail from '@/pages/Vendors/VendorDetail';
import NotificationsPage from '@/pages/Notifications/NotificationsPage';
import WorkspaceSettingsPage from '@/pages/Workspace/WorkspaceSettingsPage';
import ProfilePage from '@/pages/Profile/ProfilePage';

function Router() {
  const routes = [
    {
      path: '/login',
      element: <Login />,
    },
    {
      path: '/register',
      element: <Register />,
    },
    {
      element: <ProtectedRoute />,
      children: [
        {
          path: '/select-role',
          element: <RoleSelectPage />,
        },
      ],
    },
    {
      element: <ProtectedRoute />,
      children: [
        {
          element: <Layout />,
          children: [
            {
              path: '/',
              element: <Navigate to="/dashboard" replace />,
            },
            {
              path: '/dashboard',
              element: <Dashboard />,
            },
            {
              path: '/job-orders',
              element: <JobOrdersList />,
            },
            {
              path: '/job-orders/:id',
              element: <JobOrderDetail />,
            },
            {
              path: '/challans',
              element: <ChallansList />,
            },
            {
              path: '/challans/:id',
              element: <ChallanDetail />,
            },
            {
              path: '/rejections',
              element: <RejectionsList />,
            },
            {
              path: '/rejections/:id',
              element: <RejectionDetail />,
            },
            {
              path: '/reconciliations',
              element: <ReconciliationsList />,
            },
            {
              path: '/reconciliations/:id',
              element: <ReconciliationDetail />,
            },
            {
              path: '/vendors',
              element: <VendorsList />,
            },
            {
              path: '/vendors/:id',
              element: <VendorDetail />,
            },
            {
              path: '/notifications',
              element: <NotificationsPage />,
            },
            {
              path: '/workspace/settings',
              element: <WorkspaceSettingsPage />,
            },
            {
              path: '/profile',
              element: <ProfilePage />,
            },
          ],
        },
      ],
    },
    {
      path: '*',
      element: <Navigate to="/dashboard" replace />,
    },
  ];

  return useRoutes(routes);
}

export default Router;
