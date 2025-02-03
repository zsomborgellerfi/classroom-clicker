import express from "express";

import adminController from "../controllers/admin.controller";
import { UserRole } from "../enums/userRole";
import { authMiddleware, roleCheck } from "../middleware/auth";

const router = express.Router();

// Apply auth middleware to all admin routes
router.use(authMiddleware);
router.use(roleCheck([UserRole.ADMIN]));

// User management routes
router.get("/users", adminController.getUsers);
router.put("/users/:id", adminController.updateUser);
router.delete("/users/:id", adminController.deleteUser);

export default router;
