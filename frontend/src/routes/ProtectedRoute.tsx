import { Navigate } from "react-router-dom";

import { UserRole } from "../enums/userRole";
import { useAppSelector } from "../store/hooks";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (roles && user && !roles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    if (user.role === UserRole.ADMIN) {
      return <Navigate to="/admin" />;
    } else if (user.role === UserRole.TEACHER) {
      return <Navigate to="/teacher" />;
    } else if (user.role === UserRole.STUDENT) {
      return <Navigate to="/student" />;
    }
  }

  return <>{children}</>;
}
