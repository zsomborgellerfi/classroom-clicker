import { z } from 'zod';

export const createClassSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    description: z.string().optional()
  })
});

export const updateClassSchema = createClassSchema;

export const addStudentSchema = z.object({
  body: z.object({
    studentId: z.string().uuid()
  }),
  params: z.object({
    id: z.string().uuid()
  })
});

export type CreateClassInput = z.infer<typeof createClassSchema>['body'];
export type UpdateClassInput = z.infer<typeof updateClassSchema>['body'];
export type AddStudentInput = z.infer<typeof addStudentSchema>['body']; 