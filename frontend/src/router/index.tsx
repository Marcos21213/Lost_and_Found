/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';

const Login = lazy(() => import('@/pages/Login'));
const Home = lazy(() => import('@/pages/Home'));
const Publish = lazy(() => import('@/pages/Publish'));
const Detail = lazy(() => import('@/pages/Detail'));
const Mine = lazy(() => import('@/pages/Mine'));
const Admin = lazy(() => import('@/pages/Admin'));

const lazyElement = (element: ReactNode) => (
  <Suspense fallback={<div className="page-container" />}>{element}</Suspense>
);

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Navigate to="/home" replace />,
  },
  {
    path: '/login',
    element: lazyElement(<Login />),
  },
  {
    path: '/home',
    element: lazyElement(<Home />),
  },
  {
    path: '/publish',
    element: lazyElement(<Publish />),
  },
  {
    path: '/detail/:id',
    element: lazyElement(<Detail />),
  },
  {
    path: '/mine',
    element: lazyElement(<Mine />),
  },
  {
    path: '/admin',
    element: lazyElement(<Admin />),
  },
  {
    path: '*',
    element: <Navigate to="/home" replace />,
  },
];

export const router = createBrowserRouter(routes);
