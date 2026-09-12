import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PublicRoute } from '@/components/PublicRoute';
import { MainLayout } from '@/components/layout/MainLayout';

import Login from '@/pages/Login/Login';
import Register from '@/pages/Register/Register';
import Dashboard from '@/pages/Dashboard/Dashboard';
import CourseDetail from '@/pages/CourseDetail/CourseDetail';
import ConversationDetail from '@/pages/ConversationDetail/ConversationDetail';
import CreateCourse from '@/pages/CreateCourse/CreateCourse';

const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: '/dashboard', element: <Dashboard /> },
          { path: '/courses/new', element: <CreateCourse /> },
          { path: '/courses/:courseId', element: <CourseDetail /> },
          { path: '/conversations/:conversationId', element: <ConversationDetail /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ToastProvider>
  );
}