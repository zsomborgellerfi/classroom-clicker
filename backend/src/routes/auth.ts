import { Router } from "express";

import authController from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth";
import validate from "../middleware/validate";
import {
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "../schemas/auth.schema";

const router = Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.get("/me", authMiddleware, authController.me);
router.post(
  "/password/forgot",
  validate(requestPasswordResetSchema),
  authController.requestPasswordReset,
);
router.post(
  "/password/reset",
  validate(resetPasswordSchema),
  authController.resetPassword,
);

export default router;
