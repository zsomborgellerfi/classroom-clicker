import { Navigate, Outlet } from "react-router-dom";

import { UserRole } from "@/enums/userRole";
import { useAppSelector } from "@/store/hooks";

interface RoleRouteProps {
  roles: UserRole[];
}

export function RoleRoute({ roles }: RoleRouteProps) {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user || !roles.includes(user.role)) {
    // Redirect to appropriate dashboard based on user role
    if (user?.role === UserRole.ADMIN) {
      return <Navigate to="/admin" replace />;
    }
    if (user?.role === UserRole.TEACHER) {
      return <Navigate to="/teacher" replace />;
    }
    if (user?.role === UserRole.STUDENT) {
      return <Navigate to="/student" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
} 
