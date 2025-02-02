import { Router } from 'express';
import classController from '../controllers/class.controller';
import { authMiddleware, roleCheck } from '../middleware/auth';
import validate from '../middleware/validate';
import {
  createClassSchema,
  updateClassSchema,
  addStudentSchema
} from '../schemas/class.schema';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Routes that require teacher or admin role
router.post(
  '/',
  roleCheck(['TEACHER', 'ADMIN']),
  validate(createClassSchema),
  classController.create
);

router.put(
  '/:id',
  roleCheck(['TEACHER', 'ADMIN']),
  validate(updateClassSchema),
  classController.update
);

router.delete(
  '/:id',
  roleCheck(['TEACHER', 'ADMIN']),
  classController.delete
);

router.post(
  '/:id/students',
  roleCheck(['TEACHER', 'ADMIN']),
  validate(addStudentSchema),
  classController.addStudent
);

// Routes accessible to all authenticated users
router.get('/', classController.getAll);
router.get('/:id', classController.getById);

export default router; 