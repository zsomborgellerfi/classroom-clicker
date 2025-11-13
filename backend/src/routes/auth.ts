import { Router } from "express";

import authController from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth";
import validate from "../middleware/validate";
import { loginSchema, registerSchema } from "../schemas/auth.schema";

const router = Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.get("/me", authMiddleware, authController.me);

export default router;
