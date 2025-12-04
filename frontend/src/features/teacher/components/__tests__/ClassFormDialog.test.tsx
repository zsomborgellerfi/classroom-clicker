import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import api from "@/lib/api";

import { ClassFormDialog } from "../ClassFormDialog";

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
    CLASS: {
      CREATE: () => "/classes",
      UPDATE: (id: string) => `/classes/${id}`,
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

describe("ClassFormDialog", () => {
  beforeEach(() => {
    mockOnClose.mockClear();
    vi.clearAllMocks();
  });

  it("renders create dialog when classData is not provided", () => {
    render(<ClassFormDialog open onClose={mockOnClose} />);

    expect(
      screen.getByText("teacher.classes.create.title"),
    ).toBeInTheDocument();
  });

  it("renders edit dialog when classData is provided", () => {
    const classData = {
      id: "class-1",
      name: "Mathematics 101",
      description: "Introduction to Mathematics",
      studentCount: 25,
      lessonCount: 10,
    };

    render(
      <ClassFormDialog open classData={classData} onClose={mockOnClose} />,
    );

    expect(screen.getByText("teacher.classes.edit.title")).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    render(<ClassFormDialog open={false} onClose={mockOnClose} />);

    expect(
      screen.queryByText("teacher.classes.create.title"),
    ).not.toBeInTheDocument();
  });

  it("pre-fills form fields in edit mode", () => {
    const classData = {
      id: "class-1",
      name: "Mathematics 101",
      description: "Introduction to Mathematics",
      studentCount: 25,
      lessonCount: 10,
    };

    render(
      <ClassFormDialog open classData={classData} onClose={mockOnClose} />,
    );

    const nameInput = screen.getByLabelText(
      /teacher.classes.name.label/i,
    ) as HTMLInputElement;
    const descriptionInput = screen.getByLabelText(
      /teacher.classes.description.label/i,
    ) as HTMLInputElement;

    expect(nameInput.value).toBe("Mathematics 101");
    expect(descriptionInput.value).toBe("Introduction to Mathematics");
  });

  it("calls onClose when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(<ClassFormDialog open onClose={mockOnClose} />);

    const cancelButton = screen.getByRole("button", { name: /common.cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("resets form when dialog is closed", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ClassFormDialog open onClose={mockOnClose} />);

    await user.type(
      screen.getByLabelText(/teacher.classes.name.label/i),
      "Test Class",
    );

    rerender(<ClassFormDialog open={false} onClose={mockOnClose} />);
    rerender(<ClassFormDialog open onClose={mockOnClose} />);

    const nameInput = screen.getByLabelText(
      /teacher.classes.name.label/i,
    ) as HTMLInputElement;
    expect(nameInput.value).toBe("");
  });
});
