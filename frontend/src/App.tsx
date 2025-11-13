import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { Provider } from "react-redux";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { useNavigate } from "react-router-dom";

import { UserRole } from "@/enums/userRole";
import AdminDashboard from "@/features/admin/pages/AdminDashboard";
import UserManagement from "@/features/admin/pages/UserManagement";
import { AuthInitializer } from "@/features/auth/components/AuthInitializer";
import ForgotPassword from "@/features/auth/pages/ForgotPassword";
import Login from "@/features/auth/pages/Login";
import ResetPassword from "@/features/auth/pages/ResetPassword";
import StudentClassDetails from "@/features/student/pages/ClassDetails";
import StudentProgress from "@/features/student/pages/Progress";
import StudentClasses from "@/features/student/pages/StudentClasses";
import StudentDashboard from "@/features/student/pages/StudentDashboard";
import StudentQuiz from "@/features/student/pages/StudentQuiz";
import ClassDetails from "@/features/teacher/pages/ClassDetails";
import ClassProgress from "@/features/teacher/pages/ClassProgress";
import LessonQuizzes from "@/features/teacher/pages/LessonQuizzes";
import { QuizDetails } from "@/features/teacher/pages/QuizDetails";
import TeacherClasses from "@/features/teacher/pages/TeacherClasses";
import TeacherDashboard from "@/features/teacher/pages/TeacherDashboard";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { NotFound } from "@/shared/ui/NotFound";
import { RoleRoute } from "@/shared/ui/RoleRoute";
import { store } from "@/store";
import { useAppSelector } from "@/store/hooks";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <AuthInitializer />
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Teacher routes */}
            <Route element={<RoleRoute roles={[UserRole.TEACHER]} />}>
              <Route path="/teacher" element={<TeacherDashboard />} />
              <Route path="/teacher/classes" element={<TeacherClasses />} />
              <Route
                path="/teacher/classes/:classId"
                element={<ClassDetails />}
              />
              <Route
                path="/teacher/classes/:classId/progress"
                element={<ClassProgress />}
              />
              <Route
                path="/teacher/classes/:classId/lessons/:lessonId/quizzes"
                element={<LessonQuizzes />}
              />
              <Route
                path="/teacher/classes/:classId/lessons/:lessonId/quizzes/:quizId"
                element={<QuizDetails />}
              />
            </Route>

            {/* Admin routes */}
            <Route element={<RoleRoute roles={[UserRole.ADMIN]} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<UserManagement />} />
            </Route>

            {/* Student routes */}
            <Route element={<RoleRoute roles={[UserRole.STUDENT]} />}>
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/classes" element={<StudentClasses />} />
              <Route
                path="/student/classes/:classId"
                element={<StudentClassDetails />}
              />
              <Route
                path="/student/classes/:classId/lessons/:lessonId/quizzes/:quizId"
                element={<StudentQuiz />}
              />
              <Route path="/student/progress" element={<StudentProgress />} />
            </Route>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <RoleBasedRedirect />
                </ProtectedRoute>
              }
            />
            {/* Catch-all route - show 404 page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster position="top-right" />
        </Router>
      </Provider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;

// Helper component to redirect based on user role
function RoleBasedRedirect() {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === UserRole.ADMIN) {
      navigate("/admin");
    } else if (user?.role === UserRole.TEACHER) {
      navigate("/teacher");
    } else if (user?.role === UserRole.STUDENT) {
      navigate("/student");
    }
  }, [user, navigate]);

  return null;
}
