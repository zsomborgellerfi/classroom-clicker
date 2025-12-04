import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LessonFormDialog } from "../LessonFormDialog";

const mockOnClose = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useMutation: (options: any) => {
    const mutation = {
      mutate: vi.fn((data) => {
        if (options?.mutationFn) {
          Promise.resolve(options.mutationFn(data))
            .then((result) => options?.onSuccess?.(result))
            .catch((error) => options?.onError?.(error));
        }
      }),
      isPending: false,
    };
    return mutation;
  },
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock("@/lib/api", () => ({
  default: {
    post: vi.fn(),
    put: vi.fn(),
  },
  ENDPOINTS: {
    LESSON: {
      CREATE: (classId: string) => `/classes/${classId}/lessons`,
      UPDATE: (classId: string, lessonId: string) =>
        `/classes/${classId}/lessons/${lessonId}`,
    },
  },
}));

vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import api from "@/lib/api";

describe("LessonFormDialog", () => {
  beforeEach(() => {
    mockOnClose.mockClear();
    vi.clearAllMocks();
  });

  const mockLesson = {
    id: "lesson-1",
    title: "Introduction to Algebra",
    content: "This lesson covers basic algebraic concepts",
    classId: "class-1",
    createdAt: new Date().toISOString(),
  };

  it("renders create dialog when lesson is not provided", () => {
    render(
      <LessonFormDialog classId="class-1" open onClose={mockOnClose} />,
    );

    expect(screen.getByText("teacher.lessons.create.title")).toBeInTheDocument();
  });

  it("renders edit dialog when lesson is provided", () => {
    render(
      <LessonFormDialog
        classId="class-1"
        lesson={mockLesson}
        open
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText("teacher.lessons.edit.title")).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    render(
      <LessonFormDialog classId="class-1" open={false} onClose={mockOnClose} />,
    );

    expect(
      screen.queryByText("teacher.lessons.create.title"),
    ).not.toBeInTheDocument();
  });

  it("pre-fills form fields in edit mode", () => {
    render(
      <LessonFormDialog
        classId="class-1"
        lesson={mockLesson}
        open
        onClose={mockOnClose}
      />,
    );

    const titleInput = screen.getByLabelText(
      /teacher.lessons.titleInput.label/i,
    ) as HTMLInputElement;
    const contentInput = screen.getByLabelText(
      /teacher.lessons.content.label/i,
    ) as HTMLInputElement;

    expect(titleInput.value).toBe("Introduction to Algebra");
    expect(contentInput.value).toBe("This lesson covers basic algebraic concepts");
  });

  it("calls onClose when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <LessonFormDialog classId="class-1" open onClose={mockOnClose} />,
    );

    const cancelButton = screen.getByRole("button", { name: /common.cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});

