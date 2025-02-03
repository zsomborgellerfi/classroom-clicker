export const en = {
  auth: {
    signIn: "Sign in to your account",
    email: "Email address",
    password: "Password",
    signingIn: "Signing in...",
    signInButton: "Sign in",
    rememberMe: "Remember me",
    loginSuccess: "Login successful!",
    loginFailed: "Login failed. Please check your credentials.",
    logout: "Logout",
  },
  admin: {
    dashboard: {
      title: "Admin Dashboard",
      welcome: "Welcome to Admin Dashboard",
    },
    users: {
      title: "User Management",
      table: {
        name: "Name",
        email: "Email",
        role: "Role",
        createdAt: "Created At",
        actions: "Actions",
      },
      actions: {
        edit: "Edit User",
        delete: "Delete User",
      },
      create: {
        title: "Create New User",
        button: "Create User",
        loading: "Creating...",
        success: "User created successfully",
        error: "Failed to create user",
      },
      name: {
        label: "Name",
        min: "Name must be at least 2 characters",
      },
      email: {
        label: "Email",
        invalid: "Invalid email address",
      },
      password: {
        label: "Password",
        min: "Password must be at least 6 characters",
      },
      role: {
        label: "Role",
        student: "Student",
        teacher: "Teacher",
        admin: "Admin",
      },
      edit: {
        title: "Edit User",
        button: "Save Changes",
        loading: "Saving...",
        success: "User updated successfully",
        error: "Failed to update user",
      },
      delete: {
        title: "Delete User",
        confirm:
          "Are you sure you want to delete this user? This action cannot be undone.",
        success: "User deleted successfully",
        error: "Failed to delete user",
      },
    },
  },
  teacher: {
    dashboard: {
      title: "Teacher Dashboard",
      welcome: "Welcome to Teacher Dashboard",
    },
    classes: {
      title: "Classes",
      empty: "No classes yet",
      create: {
        title: "Create New Class",
        button: "Create Class",
        loading: "Creating...",
        success: "Class created successfully",
        error: "Failed to create class",
      },
      name: {
        label: "Class Name",
        min: "Name must be at least 2 characters",
      },
      description: {
        label: "Description",
        min: "Description must be at least 10 characters",
      },
      table: {
        name: "Name",
        description: "Description",
        students: "Students",
        lessons: "Lessons",
        actions: "Actions",
      },
      actions: {
        view: "View Class",
        edit: "Edit Class",
        delete: "Delete Class",
      },
      delete: {
        title: "Delete Class",
        confirm:
          "Are you sure you want to delete this class? This action cannot be undone.",
        success: "Class deleted successfully",
        error: "Failed to delete class",
      },
      edit: {
        title: "Edit Class",
        button: "Save Changes",
        loading: "Saving...",
        success: "Class updated successfully",
        error: "Failed to update class",
      },
    },
    lessons: {
      create: {
        title: "Create New Lesson",
        button: "Create Lesson",
        loading: "Creating...",
        success: "Lesson created successfully",
        error: "Failed to create lesson",
      },
      title: {
        label: "Lesson Title",
        min: "Title must be at least 2 characters",
      },
      description: {
        label: "Description",
        min: "Description must be at least 10 characters",
      },
      content: {
        label: "Lesson Content",
        min: "Content must be at least 10 characters",
      },
      table: {
        title: "Title",
        content: "Content",
        createdAt: "Created At",
        actions: "Actions",
      },
      empty: "No lessons yet",
      actions: {
        viewQuizzes: "View Quizzes",
        edit: "Edit Lesson",
        delete: "Delete Lesson",
      },
      delete: {
        title: "Delete Lesson",
        confirm:
          "Are you sure you want to delete this lesson? This action cannot be undone.",
        success: "Lesson deleted successfully",
        error: "Failed to delete lesson",
      },
      edit: {
        title: "Edit Lesson",
        button: "Save Changes",
        loading: "Saving...",
        success: "Lesson updated successfully",
        error: "Failed to update lesson",
      },
    },
    quizzes: {
      title: "Quizzes",
      empty: "No quizzes yet",
      create: {
        title: "Create New Quiz",
        button: "Create Quiz",
        loading: "Creating...",
        success: "Quiz created successfully",
        error: "Failed to create quiz",
      },
      table: {
        title: "Title",
        questions: "Questions",
        responses: "Responses",
        createdAt: "Created At",
        actions: "Actions",
      },
      actions: {
        view: "View Quiz",
        edit: "Edit Quiz",
        delete: "Delete Quiz",
      },
      delete: {
        title: "Delete Quiz",
        confirm:
          "Are you sure you want to delete this quiz? This action cannot be undone.",
        success: "Quiz deleted successfully",
        error: "Failed to delete quiz",
      },
      title: {
        label: "Quiz Title",
        min: "Title must be at least 2 characters",
      },
      question: {
        label: "Question",
        min: "Question must be at least 5 characters",
      },
      option: {
        label: "Option {{number}}",
        correct: "Correct Answer",
      },
      options: {
        title: "Answer Options",
        add: "Add Option",
        remove: "Remove Option",
        min: "Must have at least 2 options",
        max: "Cannot have more than 10 options",
      },
      edit: {
        title: "Edit Quiz",
        button: "Save Changes",
        loading: "Saving...",
        success: "Quiz updated successfully",
        error: "Failed to update quiz",
      },
      title: "Quiz Details",
      stats: {
        totalResponses: "Total Responses",
        averageScore: "Average Score",
        noResponses: "N/A",
      },
      correctAnswer: "Correct Answer",
      individualResponses: "Individual Responses",
      student: "Student",
      score: "Score",
      submittedAt: "Submitted At",
      questionPrefix: "Question",
      responseCount: "responses",
      percentageFormat: "%",
      list: {
        title: "Quizzes",
      },
    },
  },
  validation: {
    required: "This field is required",
  },
  common: {
    cancel: "Cancel",
    confirm: "Confirm",
    delete: "Delete",
    loading: "Loading...",
    notFound: {
      title: "Page Not Found",
      message: "The page you're looking for doesn't exist or has been moved.",
      backHome: "Back to Home",
    },
  },
};

export type Translations = typeof en;
