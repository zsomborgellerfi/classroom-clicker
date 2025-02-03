import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { UserRole } from "src/enums/userRole";

// Load .env from the root directory
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: process.env.ADMIN_EMAIL || "admin@example.com" },
  });

  if (existingAdmin) {
    console.log("Database already seeded. Skipping...");
    return;
  }

  console.log("Seeding database...");

  // Create default admin user
  const hashedPassword = await bcrypt.hash(
    process.env.ADMIN_PASSWORD || "admin123",
    10,
  );

  const admin = await prisma.user.create({
    data: {
      email: process.env.ADMIN_EMAIL || "admin@example.com",
      password: hashedPassword,
      name: "Admin User",
      role: UserRole.ADMIN,
    },
  });

  // Create a teacher
  const teacher = await prisma.user.create({
    data: {
      email: "teacher@example.com",
      password: await bcrypt.hash("teacher123", 10),
      name: "Sample Teacher",
      role: UserRole.TEACHER,
    },
  });

  // Create two students
  const student1 = await prisma.user.create({
    data: {
      email: "student1@example.com",
      password: await bcrypt.hash("student123", 10),
      name: "Student One",
      role: UserRole.STUDENT,
    },
  });

  const student2 = await prisma.user.create({
    data: {
      email: "student2@example.com",
      password: await bcrypt.hash("student123", 10),
      name: "Student Two",
      role: UserRole.STUDENT,
    },
  });

  // Create two classes
  const class1 = await prisma.class.create({
    data: {
      name: "Introduction to Web Development",
      description: "Learn the basics of web development",
      teacherId: teacher.id,
      students: {
        connect: [{ id: student1.id }, { id: student2.id }],
      },
    },
  });

  const class2 = await prisma.class.create({
    data: {
      name: "Advanced Programming Concepts",
      description: "Deep dive into programming concepts",
      teacherId: teacher.id,
      students: {
        connect: [{ id: student1.id }, { id: student2.id }],
      },
    },
  });

  // Create lessons for class 1
  const class1Lesson1 = await prisma.lesson.create({
    data: {
      title: "HTML & CSS Fundamentals",
      content: "Learn the basics of HTML and CSS for web development",
      classId: class1.id,
    },
  });

  const class1Lesson2 = await prisma.lesson.create({
    data: {
      title: "JavaScript Basics",
      content: "Introduction to JavaScript programming",
      classId: class1.id,
    },
  });

  // Create lessons for class 2
  const class2Lesson1 = await prisma.lesson.create({
    data: {
      title: "Data Structures",
      content: "Understanding basic data structures",
      classId: class2.id,
    },
  });

  const class2Lesson2 = await prisma.lesson.create({
    data: {
      title: "Algorithms",
      content: "Introduction to algorithmic thinking",
      classId: class2.id,
    },
  });

  // Create quizzes and responses for each lesson
  async function createQuizWithResponses(
    lessonId: string,
    title: string,
    question: string,
  ) {
    const quiz = await prisma.quiz.create({
      data: {
        title,
        lessonId,
        questions: {
          create: [
            {
              text: question,
              options: {
                create: [
                  { text: "Option A", isCorrect: true },
                  { text: "Option B", isCorrect: false },
                  { text: "Option C", isCorrect: false },
                  { text: "Option D", isCorrect: false },
                ],
              },
            },
          ],
        },
      },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    // Create responses for both students
    for (const student of [student1, student2]) {
      const response = await prisma.response.create({
        data: {
          quizId: quiz.id,
          userId: student.id,
          score: 1.0,
          answers: {
            create: [
              {
                questionId: quiz.questions[0].id,
                selectedOptionId: quiz.questions[0].options[0].id,
              },
            ],
          },
        },
      });
    }

    return quiz;
  }

  // Create quizzes for class 1, lesson 1
  await createQuizWithResponses(
    class1Lesson1.id,
    "HTML Quiz 1",
    "What does HTML stand for?",
  );
  await createQuizWithResponses(
    class1Lesson1.id,
    "HTML Quiz 2",
    "Which tag is used for creating links?",
  );

  // Create quizzes for class 1, lesson 2
  await createQuizWithResponses(
    class1Lesson2.id,
    "JavaScript Quiz 1",
    "What is a variable?",
  );
  await createQuizWithResponses(
    class1Lesson2.id,
    "JavaScript Quiz 2",
    "What is a function?",
  );

  // Create quizzes for class 2, lesson 1
  await createQuizWithResponses(
    class2Lesson1.id,
    "Data Structures Quiz 1",
    "What is an array?",
  );
  await createQuizWithResponses(
    class2Lesson1.id,
    "Data Structures Quiz 2",
    "What is a linked list?",
  );

  // Create quizzes for class 2, lesson 2
  await createQuizWithResponses(
    class2Lesson2.id,
    "Algorithms Quiz 1",
    "What is a sorting algorithm?",
  );
  await createQuizWithResponses(
    class2Lesson2.id,
    "Algorithms Quiz 2",
    "What is recursion?",
  );

  console.log("Database has been seeded with:");
  console.log("1. Admin User");
  console.log(`   Email: ${process.env.ADMIN_EMAIL || "admin@example.com"}`);
  console.log(`   Password: ${process.env.ADMIN_PASSWORD || "admin123"}`);
  console.log("2. Teacher");
  console.log("   Email: teacher@example.com");
  console.log("   Password: teacher123");
  console.log("3. Students");
  console.log("   - student1@example.com (password: student123)");
  console.log("   - student2@example.com (password: student123)");
  console.log("4. Two classes with two lessons each");
  console.log("5. Two quizzes per lesson");
  console.log("6. Quiz responses from both students");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
