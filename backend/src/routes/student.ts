import express from "express";

import classController from "../controllers/class.controller";
import lessonController from "../controllers/lesson.controller";
import quizController from "../controllers/quiz.controller";
import { UserRole } from "../enums/userRole";
import { authMiddleware, roleCheck } from "../middleware/auth";

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);
router.use(roleCheck([UserRole.STUDENT]));

// Student routes
router.get("/classes", classController.getEnrolled);
router.get("/classes/:id", classController.getById);
router.get("/classes/:classId/lessons", lessonController.getAll);
router.get("/classes/:classId/lessons/:lessonId", lessonController.getById);
router.get(
  "/classes/:classId/lessons/:lessonId/quizzes",
  quizController.getAll,
);
router.get(
  "/classes/:classId/lessons/:lessonId/quizzes/:quizId",
  quizController.getById,
);
router.post(
  "/classes/:classId/lessons/:lessonId/quizzes/:quizId/responses",
  quizController.submitResponse,
);
router.post("/classes/join", classController.joinWithInviteCode);
router.get("/progress", classController.getStudentProgress);

export default router;
