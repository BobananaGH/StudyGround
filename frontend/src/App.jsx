import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layout/AppLayout/AppLayout.jsx'
import { Login } from './pages/Login/Login.jsx'
import { Register } from './pages/Register/Register.jsx'
import { Dashboard } from './pages/Dashboard/Dashboard.jsx'
import { CreateCourse } from './pages/CreateCourse/CreateCourse.jsx'
import { CourseDetail } from './pages/CourseDetail/CourseDetail.jsx'
import { ConversationDetail } from './pages/ConversationDetail/ConversationDetail.jsx'
import { Settings } from './pages/Settings/Settings.jsx'
import { ProtectedRoute } from './routes/ProtectedRoute.jsx'
import { PublicRoute } from './routes/PublicRoute.jsx'
import { useAuth } from './context/AuthContext.jsx'

function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return null
  }
  
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
     </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/courses/new" element={<CreateCourse />} />
          <Route path="/courses/:courseId" element={<CourseDetail />} />
          <Route path="/conversations/:conversationId" element={<ConversationDetail />} />
          <Route path="/settings" element={<Settings />} />
       </Route>
     </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
   </Routes>
  )
}

export default App
