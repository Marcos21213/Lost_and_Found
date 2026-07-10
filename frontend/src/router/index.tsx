/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { getRoleHomePath, getToken, getUserRole } from '@/utils/storage';
import type { UserRole } from '@/utils/storage';

const Login = lazy(() => import('@/pages/Login'));
const Home = lazy(() => import('@/pages/Home'));
const Publish = lazy(() => import('@/pages/Publish'));
const Detail = lazy(() => import('@/pages/Detail'));
const Mine = lazy(() => import('@/pages/Mine'));
const Admin = lazy(() => import('@/pages/Admin'));

const lazyElement = (element: ReactNode) => (
  <Suspense fallback={<div className="page-container" />}>{element}</Suspense>
);

const AuthRoute = ({ children, requiredRole }: { children: ReactNode; requiredRole?: UserRole }) => {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }

  const currentRole = getUserRole();

  if (requiredRole && currentRole !== requiredRole) {
    return <Navigate to={getRoleHomePath(currentRole)} replace />;
  }

  return <>{children}</>;
};

const protectedElement = (element: ReactNode, requiredRole?: UserRole) => (
  <AuthRoute requiredRole={requiredRole}>{lazyElement(element)}</AuthRoute>
);

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: lazyElement(<Login />),
  },
  {
    path: '/home',
    element: protectedElement(<Home />),
  },
  {
    path: '/publish',
    element: protectedElement(<Publish />, 'user'),
  },
  {
    path: '/detail/:id',
    element: protectedElement(<Detail />),
  },
  {
    path: '/mine',
    element: protectedElement(<Mine />),
  },
  {
    path: '/admin',
    element: protectedElement(<Admin />, 'admin'),
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
];

export const router = createBrowserRouter(routes);
