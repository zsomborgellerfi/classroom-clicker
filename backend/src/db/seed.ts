import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { UserRole } from "src/enums/userRole";

dotenv.config();

const prisma = new PrismaClient();

type UserRecord = Awaited<ReturnType<typeof prisma.user.create>>;

type QuizQuestionSeed = {
  text: string;
  explanation?: string;
  options: {
    text: string;
    isCorrect: boolean;
  }[];
};

type ResponseSeed = {
  user: UserRecord;
  attemptNumber?: number;
  answers: {
    questionIndex: number;
    optionIndex: number;
  }[];
  score?: number;
  submittedAtOffsetMinutes?: number;
};

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set in the .env file",
    );
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log("Database already seeded. Skipping…");
    return;
  }

  console.log(
    "Seeding database with demo users, classes, lessons and quizzes…",
  );

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      role: UserRole.ADMIN,
      externalId: "ADM001",
    },
  });

  const teacher = await prisma.user.create({
    data: {
      email: "teacher@example.com",
      password: await bcrypt.hash("test", 10),
      firstName: "Sample",
      lastName: "Teacher",
      role: UserRole.TEACHER,
      externalId: "TCH001",
    },
  });

  const studentSeedData = [
    {
      email: "student1@example.com",
      firstName: "Student",
      lastName: "One",
      externalId: "STU2024001",
    },
    {
      email: "student2@example.com",
      firstName: "Student",
      lastName: "Two",
      externalId: "STU2024002",
    },
    {
      email: "student3@example.com",
      firstName: "Student",
      lastName: "Three",
      externalId: "STU2024003",
    },
    {
      email: "student4@example.com",
      firstName: "Student",
      lastName: "Four",
      externalId: "STU2024004",
    },
    {
      email: "student5@example.com",
      firstName: "Student",
      lastName: "Five",
      externalId: "STU2024005",
    },
  ];

  const studentRecords = await Promise.all(
    studentSeedData.map(async (student) =>
      prisma.user.create({
        data: {
          email: student.email,
          password: await bcrypt.hash("test", 10),
          firstName: student.firstName,
          lastName: student.lastName,
          role: UserRole.STUDENT,
          externalId: student.externalId,
        },
      }),
    ),
  );

  const [student1, student2, ...unassignedStudents] = studentRecords;

  const connectStudents = {
    connect: [{ id: student1.id }, { id: student2.id }],
  };

  const introClass = await prisma.class.create({
    data: {
      name: "Introduction to Web Development",
      description: "Learn the basics of HTML, CSS and JavaScript",
      teacherId: teacher.id,
      students: connectStudents,
    },
  });

  const advancedClass = await prisma.class.create({
    data: {
      name: "Advanced Programming Concepts",
      description: "Data structures, algorithms and optimization",
      teacherId: teacher.id,
      students: connectStudents,
    },
  });

  const lessons = await prisma.$transaction([
    prisma.lesson.create({
      data: {
        title: "HTML & CSS Fundamentals",
        content: "Building a semantic, responsive layout",
        classId: introClass.id,
      },
    }),
    prisma.lesson.create({
      data: {
        title: "JavaScript Basics",
        content: "Variables, functions and the DOM",
        classId: introClass.id,
      },
    }),
    prisma.lesson.create({
      data: {
        title: "Data Structures",
        content: "Arrays, linked lists and hash tables",
        classId: advancedClass.id,
      },
    }),
    prisma.lesson.create({
      data: {
        title: "Algorithms",
        content: "Sorting, recursion and runtime analysis",
        classId: advancedClass.id,
      },
    }),
  ]);

  const [htmlLesson, jsLesson, dsLesson, algoLesson] = lessons;

  const now = new Date();
  const minutesFromNow = (mins: number) =>
    new Date(now.getTime() + mins * 60 * 1000);
  const yearsFromNow = (years: number) => {
    const future = new Date(now.getTime());
    future.setFullYear(future.getFullYear() + years);
    return future;
  };

  async function createQuizWithResponses({
    lessonId,
    title,
    isActive = false,
    attemptLimit = 1,
    timeLimitSeconds = null,
    availableUntil = null,
    activatedOffsetMinutes = -10,
    questions,
    responses = [],
  }: {
    lessonId: string;
    title: string;
    isActive?: boolean;
    attemptLimit?: number | null;
    timeLimitSeconds?: number | null;
    availableUntil?: Date | null;
    activatedOffsetMinutes?: number;
    questions: QuizQuestionSeed[];
    responses?: ResponseSeed[];
  }) {
    const quiz = await prisma.quiz.create({
      data: {
        title,
        lessonId,
        isActive,
        attemptLimit,
        timeLimitSeconds,
        availableUntil,
        activatedAt: isActive ? minutesFromNow(activatedOffsetMinutes) : null,
        questions: {
          create: questions.map((question, questionIndex) => ({
            text: question.text,
            explanation: question.explanation,
            order: questionIndex,
            options: {
              create: question.options.map((option) => ({
                text: option.text,
                isCorrect: option.isCorrect,
              })),
            },
          })),
        },
      },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: {
            options: true,
          },
        },
      },
    });

    for (const response of responses) {
      const answersToCreate = response.answers.map((answer) => {
        const question = quiz.questions[answer.questionIndex];
        const desiredOptionText =
          questions[answer.questionIndex]?.options?.[answer.optionIndex]?.text;
        const option =
          question?.options.find((opt) => opt.text === desiredOptionText) ||
          question?.options[0];

        if (!question || !option) {
          throw new Error(
            `Invalid answer reference in seed for quiz "${title}".`,
          );
        }

        return {
          questionId: question.id,
          selectedOptionId: option.id,
          isCorrect: option.isCorrect,
        };
      });

      const correctCount = answersToCreate.reduce(
        (total, answer) => total + (answer.isCorrect ? 1 : 0),
        0,
      );
      const computedScore =
        questions.length > 0 ? correctCount / questions.length : 0;
      const normalizedScore =
        response.score !== undefined ? response.score : computedScore;
      const finalScore =
        Math.abs(normalizedScore - computedScore) > 0.0001
          ? computedScore
          : Math.min(Math.max(normalizedScore, 0), 1);

      await prisma.response.create({
        data: {
          quizId: quiz.id,
          userId: response.user.id,
          score: finalScore,
          attemptNumber: response.attemptNumber ?? 1,
          submittedAt: response.submittedAtOffsetMinutes
            ? minutesFromNow(response.submittedAtOffsetMinutes)
            : new Date(),
          answers: {
            create: answersToCreate.map(({ isCorrect, ...answer }) => answer),
          },
        },
      });
    }
  }

  await createQuizWithResponses({
    lessonId: htmlLesson.id,
    title: "HTML Layout Challenge",
    isActive: true,
    attemptLimit: 1,
    timeLimitSeconds: 600,
    availableUntil: yearsFromNow(3),
    questions: [
      {
        text: "Which element best represents a navigation menu?",
        explanation: "<nav> groups primary navigation links.",
        options: [
          { text: "<section>", isCorrect: false },
          { text: "<nav>", isCorrect: true },
          { text: "<article>", isCorrect: false },
          { text: "<aside>", isCorrect: false },
        ],
      },
      {
        text: "Which CSS layout technique ensures columns stay aligned?",
        options: [
          { text: "Flexbox", isCorrect: true },
          { text: "Floats", isCorrect: false },
          { text: "Absolute positioning", isCorrect: false },
          { text: "Using tables", isCorrect: false },
        ],
      },
    ],
    responses: [
      {
        user: student1,
        score: 1.0, // 2/2 = 100%
        answers: [
          { questionIndex: 0, optionIndex: 1 },
          { questionIndex: 1, optionIndex: 0 },
        ],
      },
      {
        user: student2,
        score: 0.5, // 1/2 = 50%
        answers: [
          { questionIndex: 0, optionIndex: 0 },
          { questionIndex: 1, optionIndex: 0 },
        ],
      },
    ],
  });

  await createQuizWithResponses({
    lessonId: htmlLesson.id,
    title: "Semantic HTML Sprint",
    isActive: true,
    attemptLimit: 2,
    timeLimitSeconds: 300,
    availableUntil: yearsFromNow(3),
    questions: [
      {
        text: "Which element represents the header for a document or section?",
        options: [
          { text: "<header>", isCorrect: true },
          { text: "<top>", isCorrect: false },
          { text: "<section>", isCorrect: false },
          { text: '<div class="header">', isCorrect: false },
        ],
      },
      {
        text: "Choose the best element for wrapping blog post content.",
        options: [
          { text: "<main>", isCorrect: false },
          { text: "<article>", isCorrect: true },
          { text: "<footer>", isCorrect: false },
          { text: "<figure>", isCorrect: false },
        ],
      },
      {
        text: "Which attribute improves accessibility for images?",
        options: [
          { text: "role", isCorrect: false },
          { text: "data-label", isCorrect: false },
          { text: "alt", isCorrect: true },
          { text: "aria-only", isCorrect: false },
        ],
      },
    ],
    responses: [
      {
        user: student1,
        score: 1 / 3, // 1/3 = 33.33%
        answers: [
          { questionIndex: 0, optionIndex: 1 },
          { questionIndex: 1, optionIndex: 0 },
          { questionIndex: 2, optionIndex: 2 },
        ],
        attemptNumber: 1,
      },
      {
        user: student1,
        score: 1.0, // 3/3 = 100%
        answers: [
          { questionIndex: 0, optionIndex: 0 },
          { questionIndex: 1, optionIndex: 1 },
          { questionIndex: 2, optionIndex: 2 },
        ],
        attemptNumber: 2,
        submittedAtOffsetMinutes: 20,
      },
      {
        user: student2,
        score: 1 / 3, // 1/3 = 33.33%
        answers: [
          { questionIndex: 0, optionIndex: 3 },
          { questionIndex: 1, optionIndex: 1 },
          { questionIndex: 2, optionIndex: 0 },
        ],
      },
    ],
  });

  await createQuizWithResponses({
    lessonId: jsLesson.id,
    title: "JavaScript Foundations",
    isActive: true,
    attemptLimit: 3,
    timeLimitSeconds: 900,
    availableUntil: yearsFromNow(3),
    questions: [
      {
        text: "Which keyword declares a block-scoped variable?",
        options: [
          { text: "var", isCorrect: false },
          { text: "let", isCorrect: true },
          { text: "const", isCorrect: false },
          { text: "scope", isCorrect: false },
        ],
      },
      {
        text: "What does DOM stand for?",
        options: [
          { text: "Document Object Model", isCorrect: true },
          { text: "Data Object Mapper", isCorrect: false },
          { text: "Document Oriented Map", isCorrect: false },
          { text: "Digital Object Model", isCorrect: false },
        ],
      },
    ],
    responses: [
      {
        user: student1,
        score: 0.5, // 1/2 = 50%
        attemptNumber: 1,
        answers: [
          { questionIndex: 0, optionIndex: 0 },
          { questionIndex: 1, optionIndex: 0 },
        ],
      },
      {
        user: student1,
        score: 1.0, // 2/2 = 100%
        attemptNumber: 2,
        answers: [
          { questionIndex: 0, optionIndex: 1 },
          { questionIndex: 1, optionIndex: 0 },
        ],
      },
      {
        user: student2,
        score: 1.0, // 2/2 = 100%
        answers: [
          { questionIndex: 0, optionIndex: 1 },
          { questionIndex: 1, optionIndex: 0 },
        ],
      },
    ],
  });

  await createQuizWithResponses({
    lessonId: jsLesson.id,
    title: "Async JavaScript Mini Quiz",
    isActive: true,
    attemptLimit: 1,
    timeLimitSeconds: 420,
    availableUntil: yearsFromNow(3),
    questions: [
      {
        text: "Which API schedules work after the current call stack clears?",
        options: [
          { text: "setTimeout", isCorrect: true },
          { text: "JSON.stringify", isCorrect: false },
          { text: "Promise.resolve", isCorrect: false },
          { text: "queueMicrotask", isCorrect: false },
        ],
      },
      {
        text: "What does the async keyword do?",
        explanation: "It ensures the function returns a Promise.",
        options: [
          { text: "Creates a new thread", isCorrect: false },
          { text: "Marks a function so it returns a Promise", isCorrect: true },
          { text: "Blocks the event loop", isCorrect: false },
          { text: "Automatically retries network calls", isCorrect: false },
        ],
      },
    ],
    responses: [
      {
        user: student2,
        score: 0.5, // 1/2 = 50%
        answers: [
          { questionIndex: 0, optionIndex: 0 },
          { questionIndex: 1, optionIndex: 2 },
        ],
        submittedAtOffsetMinutes: -90,
      },
    ],
  });

  await createQuizWithResponses({
    lessonId: dsLesson.id,
    title: "Data Structures Warm-up",
    isActive: true,
    attemptLimit: 2,
    timeLimitSeconds: 600,
    availableUntil: yearsFromNow(3),
    questions: [
      {
        text: "Which data structure provides O(1) average lookup?",
        options: [
          { text: "Hash table", isCorrect: true },
          { text: "Array", isCorrect: false },
          { text: "Linked list", isCorrect: false },
          { text: "Binary tree", isCorrect: false },
        ],
      },
      {
        text: "When would you prefer a linked list over an array?",
        options: [
          { text: "When random access is critical", isCorrect: false },
          { text: "When frequent insertions/deletions occur", isCorrect: true },
          { text: "For constant-time lookups", isCorrect: false },
          { text: "When memory should be contiguous", isCorrect: false },
        ],
      },
      {
        text: "Which structure is LIFO?",
        options: [
          { text: "Queue", isCorrect: false },
          { text: "Stack", isCorrect: true },
          { text: "Priority queue", isCorrect: false },
          { text: "Graph", isCorrect: false },
        ],
      },
    ],
    responses: [
      {
        user: student1,
        score: 1.0, // 3/3 = 100%
        answers: [
          { questionIndex: 0, optionIndex: 0 },
          { questionIndex: 1, optionIndex: 1 },
          { questionIndex: 2, optionIndex: 1 },
        ],
      },
      {
        user: student2,
        score: 2 / 3, // 2/3 = 66.67%
        answers: [
          { questionIndex: 0, optionIndex: 0 },
          { questionIndex: 1, optionIndex: 3 },
          { questionIndex: 2, optionIndex: 1 },
        ],
      },
    ],
  });

  await createQuizWithResponses({
    lessonId: algoLesson.id,
    title: "Algorithmic Thinking Drill",
    isActive: true,
    attemptLimit: 1,
    timeLimitSeconds: 480,
    availableUntil: yearsFromNow(3),
    questions: [
      {
        text: "Which algorithm has O(n log n) average complexity?",
        options: [
          { text: "Merge sort", isCorrect: true },
          { text: "Bubble sort", isCorrect: false },
          { text: "Linear search", isCorrect: false },
          { text: "Hash lookup", isCorrect: false },
        ],
      },
      {
        text: "Why use recursion?",
        options: [
          { text: "It is always faster", isCorrect: false },
          {
            text: "It provides a natural expression for divide-and-conquer problems",
            isCorrect: true,
          },
          { text: "It reduces memory", isCorrect: false },
          { text: "It eliminates loops entirely", isCorrect: false },
        ],
      },
    ],
    responses: [
      {
        user: student1,
        score: 1.0, // 2/2 = 100%
        answers: [
          { questionIndex: 0, optionIndex: 0 },
          { questionIndex: 1, optionIndex: 1 },
        ],
        submittedAtOffsetMinutes: -200,
      },
    ],
  });

  // Fresh fillable quizzes to try right after seeding
  await createQuizWithResponses({
    lessonId: htmlLesson.id,
    title: "Responsive Layout Check-in",
    isActive: true,
    attemptLimit: 2,
    timeLimitSeconds: null,
    availableUntil: yearsFromNow(5),
    activatedOffsetMinutes: 0,
    questions: [
      {
        text: "Which CSS unit adapts best to viewport width?",
        options: [
          { text: "vw", isCorrect: true },
          { text: "px", isCorrect: false },
          { text: "pt", isCorrect: false },
          { text: "cm", isCorrect: false },
        ],
      },
      {
        text: "What media query targets devices wider than 1024px?",
        options: [
          { text: "@media (min-width: 1024px)", isCorrect: true },
          { text: "@media screen and (max-width: 480px)", isCorrect: false },
          { text: "@media orientation: landscape", isCorrect: false },
          { text: "@media (prefers-reduced-motion)", isCorrect: false },
        ],
      },
    ],
    responses: [],
  });

  await createQuizWithResponses({
    lessonId: jsLesson.id,
    title: "ESNext Features Preview",
    isActive: true,
    attemptLimit: 2,
    timeLimitSeconds: null,
    availableUntil: yearsFromNow(5),
    activatedOffsetMinutes: 0,
    questions: [
      {
        text: "Which syntax correctly declares an async arrow function?",
        options: [
          { text: "const run = async () => {}", isCorrect: true },
          { text: "async => const run() {}", isCorrect: false },
          { text: "const run = () async {}", isCorrect: false },
          { text: "function async run() {}", isCorrect: false },
        ],
      },
      {
        text: "What does optional chaining prevent?",
        options: [
          {
            text: "Errors when accessing properties on undefined/null values",
            isCorrect: true,
          },
          { text: "Network latency", isCorrect: false },
          { text: "Promise rejection", isCorrect: false },
          { text: "Variable hoisting", isCorrect: false },
        ],
      },
    ],
    responses: [],
  });

  await createQuizWithResponses({
    lessonId: dsLesson.id,
    title: "Graph Basics Warmup",
    isActive: true,
    attemptLimit: 2,
    timeLimitSeconds: null,
    availableUntil: yearsFromNow(5),
    activatedOffsetMinutes: 0,
    questions: [
      {
        text: "Which traversal uses a queue?",
        options: [
          { text: "Breadth-first search", isCorrect: true },
          { text: "Depth-first search", isCorrect: false },
          { text: "Binary search", isCorrect: false },
          { text: "Merge sort", isCorrect: false },
        ],
      },
      {
        text: "What defines a connected graph?",
        options: [
          {
            text: "Every vertex is reachable from any other vertex",
            isCorrect: true,
          },
          { text: "All nodes have the same degree", isCorrect: false },
          { text: "Edges only point one direction", isCorrect: false },
          { text: "No cycles exist", isCorrect: false },
        ],
      },
    ],
    responses: [],
  });

  console.log("✅ Seed complete:");
  console.log(`- Admin: ${adminEmail}`);
  console.log("- Teacher: teacher@example.com / test");
  console.log(
    "- Enrolled students: student1@example.com, student2@example.com (password: test)",
  );
  if (unassignedStudents.length) {
    console.log(
      `- Additional students ready to enroll: ${unassignedStudents
        .map((student) => student.email)
        .join(", ")} (password: test)`,
    );
  }
  console.log(
    "- Classes: Introduction to Web Development, Advanced Programming Concepts",
  );
  console.log("- Lessons per class: 2");
  console.log(
    "- Quizzes: multi-question with deadlines, timers and retake data",
  );
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
