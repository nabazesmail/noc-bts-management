import { Navigate, Outlet } from 'react-router-dom';

export default function AuthRoute({ session }: { session: any }) {
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}