import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Spinner } from '../components/ui/Spinner/Spinner.jsx'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Spinner label="Restoring session" />
     </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export default ProtectedRoute
