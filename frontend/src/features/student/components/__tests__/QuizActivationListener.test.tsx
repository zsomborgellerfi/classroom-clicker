import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { UserRole } from "@/enums/userRole";
import { QuizActivationListener } from "../QuizActivationListener";

const mockDisconnectSocket = vi.fn();
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  connected: true,
  disconnected: false,
};
const mockConnectSocket = vi.fn(() => mockSocket);
const mockUseAppSelector = vi.fn(() => ({
  user: { id: "user-1", role: UserRole.STUDENT },
  token: "test-token",
}));
const mockNavigate = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock("@/lib/socket", () => ({
  connectSocket: (token: string) => mockConnectSocket(token),
  disconnectSocket: () => mockDisconnectSocket(),
}));

vi.mock("@/store/hooks", () => ({
  useAppSelector: (selector: any) => mockUseAppSelector(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      if (params) {
        return `${key} ${JSON.stringify(params)}`;
      }
      return key;
    },
  }),
}));

describe("QuizActivationListener", () => {
  beforeEach(() => {
    mockConnectSocket.mockReturnValue(mockSocket);
    mockDisconnectSocket.mockClear();
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    mockNavigate.mockClear();
    mockInvalidateQueries.mockClear();
    mockUseAppSelector.mockReturnValue({
      user: { id: "user-1", role: UserRole.STUDENT },
      token: "test-token",
    });
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders nothing when no notification", () => {
    const { container } = render(<QuizActivationListener />);
    expect(container.firstChild).toBeNull();
  });

  it("connects socket when user is student and token exists", async () => {
    render(<QuizActivationListener />);

    await waitFor(() => {
      // The component calls connectSocket with token from the selector
      expect(mockConnectSocket).toHaveBeenCalledWith("test-token");
    });
  });

  it("listens for quiz:activated event", () => {
    render(<QuizActivationListener />);

    expect(mockSocket.on).toHaveBeenCalledWith(
      "quiz:activated",
      expect.any(Function),
    );
  });

  it("disconnects socket when user is not student", () => {
    mockUseAppSelector.mockReturnValue({
      user: { id: "user-1", role: UserRole.TEACHER },
      token: "test-token",
    });

    render(<QuizActivationListener />);

    expect(mockDisconnectSocket).toHaveBeenCalled();
  });

  it("disconnects socket when token is missing", () => {
    mockUseAppSelector.mockReturnValue({
      user: { id: "user-1", role: UserRole.STUDENT },
      token: null,
    });

    render(<QuizActivationListener />);

    expect(mockDisconnectSocket).toHaveBeenCalled();
  });

  it("displays notification when quiz is activated", async () => {
    render(<QuizActivationListener />);

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    const handleQuizActivated = mockSocket.on.mock.calls.find(
      (call) => call[0] === "quiz:activated",
    )?.[1];

    if (handleQuizActivated) {
      act(() => {
        handleQuizActivated({
          quizId: "quiz-1",
          quizTitle: "Test Quiz",
          classId: "class-1",
          className: "Test Class",
          lessonId: "lesson-1",
          lessonTitle: "Test Lesson",
        });
      });
    }

    await waitFor(() => {
      expect(screen.getByText("student.notifications.quizActivated.title")).toBeInTheDocument();
      expect(screen.getByText("Test Quiz")).toBeInTheDocument();
    });
  });

  it("navigates to quiz when CTA button is clicked", async () => {
    const user = userEvent.setup();
    render(<QuizActivationListener />);

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    const handleQuizActivated = mockSocket.on.mock.calls.find(
      (call) => call[0] === "quiz:activated",
    )?.[1];

    if (handleQuizActivated) {
      act(() => {
        handleQuizActivated({
          quizId: "quiz-1",
          quizTitle: "Test Quiz",
          classId: "class-1",
          className: "Test Class",
          lessonId: "lesson-1",
          lessonTitle: "Test Lesson",
        });
      });
    }

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /student.notifications.quizActivated.cta/i,
        }),
      ).toBeInTheDocument();
    });

    const ctaButton = screen.getByRole("button", {
      name: /student.notifications.quizActivated.cta/i,
    });
    await user.click(ctaButton);

    expect(mockNavigate).toHaveBeenCalledWith(
      "/student/classes/class-1/lessons/lesson-1/quizzes/quiz-1",
    );
  });

  it("dismisses notification when dismiss button is clicked", async () => {
    const user = userEvent.setup();
    render(<QuizActivationListener />);

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    const handleQuizActivated = mockSocket.on.mock.calls.find(
      (call) => call[0] === "quiz:activated",
    )?.[1];

    if (handleQuizActivated) {
      act(() => {
        handleQuizActivated({
          quizId: "quiz-1",
          quizTitle: "Test Quiz",
          classId: "class-1",
          className: "Test Class",
          lessonId: "lesson-1",
          lessonTitle: "Test Lesson",
        });
      });
    }

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /student.notifications.quizActivated.dismiss/i,
        }),
      ).toBeInTheDocument();
    });

    const dismissButton = screen.getByRole("button", {
      name: /student.notifications.quizActivated.dismiss/i,
    });
    await user.click(dismissButton);

    await waitFor(() => {
      expect(
        screen.queryByText("student.notifications.quizActivated.title"),
      ).not.toBeInTheDocument();
    });
  });

  it("does not show duplicate notifications for same quiz", async () => {
    render(<QuizActivationListener />);

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    const handleQuizActivated = mockSocket.on.mock.calls.find(
      (call) => call[0] === "quiz:activated",
    )?.[1];

    const payload = {
      quizId: "quiz-1",
      quizTitle: "Test Quiz",
      classId: "class-1",
      className: "Test Class",
      lessonId: "lesson-1",
      lessonTitle: "Test Lesson",
    };

    if (handleQuizActivated) {
      act(() => {
        handleQuizActivated(payload);
        handleQuizActivated(payload); // Second call should be ignored
      });
    }

    await waitFor(() => {
      const notifications = screen.queryAllByText(
        "student.notifications.quizActivated.title",
      );
      expect(notifications.length).toBeLessThanOrEqual(1);
    });
  });
});

