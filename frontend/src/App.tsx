import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { Provider } from "react-redux";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { useNavigate } from "react-router-dom";

import { NotFound } from "./components/common/NotFound";
import { RoleRoute } from "./components/common/RoleRoute";
import { UserRole } from "./enums/userRole";
import Login from "./pages/Login";
import TeacherDashboard from "./pages/TeacherDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import StudentClassDetails from "./pages/student/ClassDetails";
import StudentProgress from "./pages/student/Progress";
import StudentQuiz from "./pages/student/Quiz";
import StudentClasses from "./pages/student/StudentClasses";
import ClassDetails from "./pages/teacher/ClassDetails";
import ClassProgress from "./pages/teacher/ClassProgress";
import LessonQuizzes from "./pages/teacher/LessonQuizzes";
import { QuizDetails } from "./pages/teacher/QuizDetails";
import TeacherClasses from "./pages/teacher/TeacherClasses";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { store } from "./store";
import { useAppSelector } from "./store/hooks";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Login />} />

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
              <Route path="/student" element={<StudentClasses />} />
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
