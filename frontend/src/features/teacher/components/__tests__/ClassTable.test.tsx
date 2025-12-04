import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ClassTable } from "../ClassTable";

const mockOnEdit = vi.fn();
const mockOnDelete = vi.fn();
const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => ({
    data: undefined,
    isLoading: false,
  })),
}));

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
  },
  ENDPOINTS: {
    CLASS: {
      LIST: () => "/classes",
    },
  },
}));

vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { useQuery } from "@tanstack/react-query";

describe("ClassTable", () => {
  beforeEach(() => {
    mockOnEdit.mockClear();
    mockOnDelete.mockClear();
    mockNavigate.mockClear();
    vi.clearAllMocks();
  });

  const mockClasses = [
    {
      id: "class-1",
      name: "Mathematics 101",
      description: "Introduction to Mathematics",
      _count: {
        students: 25,
        lessons: 10,
      },
    },
    {
      id: "class-2",
      name: "Physics 201",
      description: "Advanced Physics",
      _count: {
        students: 15,
        lessons: 8,
      },
    },
  ];

  it("renders loading state", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    render(<ClassTable onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByText("common.loading")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<ClassTable onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByText("teacher.classes.empty")).toBeInTheDocument();
  });

  it("renders classes table with data", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: mockClasses,
      isLoading: false,
    });

    render(<ClassTable onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByText("Mathematics 101")).toBeInTheDocument();
    expect(screen.getByText("Physics 201")).toBeInTheDocument();
    expect(screen.getByText("Introduction to Mathematics")).toBeInTheDocument();
  });

  it("calls onEdit when edit button is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(useQuery).mockReturnValue({
      data: mockClasses,
      isLoading: false,
    });

    render(<ClassTable onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const editButtons = screen.getAllByLabelText(/teacher.classes.actions.edit/i);
    await user.click(editButtons[0]);

    expect(mockOnEdit).toHaveBeenCalledWith(mockClasses[0]);
  });

  it("calls onDelete when delete button is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(useQuery).mockReturnValue({
      data: mockClasses,
      isLoading: false,
    });

    render(<ClassTable onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const deleteButtons = screen.getAllByLabelText(/teacher.classes.actions.delete/i);
    await user.click(deleteButtons[0]);

    expect(mockOnDelete).toHaveBeenCalledWith(mockClasses[0]);
  });

  it("navigates to class details when view button is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(useQuery).mockReturnValue({
      data: mockClasses,
      isLoading: false,
    });

    render(<ClassTable onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const viewButtons = screen.getAllByLabelText(/teacher.classes.actions.view/i);
    await user.click(viewButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith("/teacher/classes/class-1");
  });

  it("displays student and lesson counts", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: mockClasses,
      isLoading: false,
    });

    render(<ClassTable onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });
});

