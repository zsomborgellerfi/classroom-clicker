import express from "express";

import classController from "../controllers/class.controller";
import lessonController from "../controllers/lesson.controller";
import quizController from "../controllers/quiz.controller";
import teacherController from "../controllers/teacher.controller";
import { UserRole } from "../enums/userRole";
import { authMiddleware, roleCheck } from "../middleware/auth";

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);
router.use(roleCheck([UserRole.TEACHER]));

// Class management
router.get("/classes", classController.getAll);
router.post("/classes", classController.create);
router.get("/classes/:id", classController.getById);
router.put("/classes/:id", classController.update);
router.delete("/classes/:id", classController.delete);
router.post("/classes/:id/students", classController.addStudent);
router.post("/classes/:id/students/bulk", classController.bulkAddStudents);
router.get(
  "/classes/:id/students/:studentId",
  classController.getStudentDetails,
);
router.delete(
  "/classes/:id/students/:studentId",
  classController.removeStudent,
);
router.get("/classes/:id/invites", classController.getInvites);
router.post("/classes/:id/invites", classController.createInvite);
router.delete(
  "/classes/:classId/invites/:inviteId",
  classController.deleteInvite,
);
router.get("/classes/:id/progress", classController.getClassProgress);

// Lesson management
router.get("/classes/:classId/lessons", lessonController.getAll);
router.post("/classes/:classId/lessons", lessonController.create);
router.get("/classes/:classId/lessons/:lessonId", lessonController.getById);
router.put("/classes/:classId/lessons/:lessonId", lessonController.update);
router.delete("/classes/:classId/lessons/:lessonId", lessonController.delete);

// Quiz management
router.get(
  "/classes/:classId/lessons/:lessonId/quizzes",
  quizController.getAll,
);
router.post(
  "/classes/:classId/lessons/:lessonId/quizzes",
  quizController.create,
);
router.get(
  "/classes/:classId/lessons/:lessonId/quizzes/:quizId",
  quizController.getById,
);
router.put(
  "/classes/:classId/lessons/:lessonId/quizzes/:quizId",
  quizController.update,
);
router.delete(
  "/classes/:classId/lessons/:lessonId/quizzes/:quizId",
  quizController.delete,
);
router.get(
  "/classes/:classId/lessons/:lessonId/quizzes/:quizId/responses",
  quizController.getResponses,
);

// Dashboard & student helpers
router.get("/dashboard", teacherController.getDashboard);
router.get("/students", teacherController.getStudents);

export default router;
