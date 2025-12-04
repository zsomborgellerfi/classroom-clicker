enum UserRole {
  ADMIN = "ADMIN",
  STUDENT = "STUDENT",
  TEACHER = "TEACHER",
} 

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  externalId?: string; // Unique identifier from external source (e.g., university ID)
  role: UserRole;
  createdAt: string;
}
