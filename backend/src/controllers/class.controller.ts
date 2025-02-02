import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();

class ClassController {
  async create(req: AuthRequest, res: Response) {
    try {
      const { name, description } = req.body;
      const teacherId = req.user?.id;

      if (!teacherId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const newClass = await prisma.class.create({
        data: {
          name,
          description,
          teacherId
        },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      res.status(201).json(newClass);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const classes = await prisma.class.findMany({
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              students: true,
              lessons: true
            }
          }
        }
      });

      res.json(classes);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const classData = await prisma.class.findUnique({
        where: { id },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          students: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          lessons: true
        }
      });

      if (!classData) {
        return res.status(404).json({ error: 'Class not found' });
      }

      res.json(classData);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      const teacherId = req.user?.id;

      const existingClass = await prisma.class.findUnique({
        where: { id }
      });

      if (!existingClass) {
        return res.status(404).json({ error: 'Class not found' });
      }

      if (existingClass.teacherId !== teacherId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const updatedClass = await prisma.class.update({
        where: { id },
        data: {
          name,
          description
        },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      res.json(updatedClass);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const teacherId = req.user?.id;

      const existingClass = await prisma.class.findUnique({
        where: { id }
      });

      if (!existingClass) {
        return res.status(404).json({ error: 'Class not found' });
      }

      if (existingClass.teacherId !== teacherId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await prisma.class.delete({
        where: { id }
      });

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async addStudent(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { studentId } = req.body;
      const teacherId = req.user?.id;

      const existingClass = await prisma.class.findUnique({
        where: { id }
      });

      if (!existingClass) {
        return res.status(404).json({ error: 'Class not found' });
      }

      if (existingClass.teacherId !== teacherId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const updatedClass = await prisma.class.update({
        where: { id },
        data: {
          students: {
            connect: { id: studentId }
          }
        },
        include: {
          students: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      res.json(updatedClass);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
}

export default new ClassController(); 