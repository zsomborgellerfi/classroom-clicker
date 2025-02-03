enum UserRole {
  ADMIN = "ADMIN",
  STUDENT = "STUDENT",
  TEACHER = "TEACHER",
} 

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}
