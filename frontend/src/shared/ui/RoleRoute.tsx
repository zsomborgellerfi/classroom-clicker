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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Normalize role to enum value for comparison
  const userRole = user.role as UserRole;
  const hasAccess = roles.includes(userRole);

  if (!hasAccess) {
    // Redirect to appropriate dashboard based on user role
    if (userRole === UserRole.ADMIN) {
      return <Navigate to="/admin" replace />;
    }
    if (userRole === UserRole.TEACHER) {
      return <Navigate to="/teacher" replace />;
    }
    if (userRole === UserRole.STUDENT) {
      return <Navigate to="/student" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
