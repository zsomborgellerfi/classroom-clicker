import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ClassCard } from "../ClassCard";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("ClassCard", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  const mockClass = {
    id: "class-1",
    name: "Mathematics 101",
    description: "Introduction to Mathematics",
    teacher: {
      id: "teacher-1",
      firstName: "John",
      lastName: "Doe",
    },
    _count: {
      students: 25,
      lessons: 10,
    },
  };

  it("renders class name", () => {
    render(<ClassCard classItem={mockClass} />);

    expect(screen.getByText("Mathematics 101")).toBeInTheDocument();
  });

  it("renders class description when provided", () => {
    render(<ClassCard classItem={mockClass} />);

    expect(screen.getByText("Introduction to Mathematics")).toBeInTheDocument();
  });

  it("does not render description when not provided", () => {
    const classWithoutDescription = {
      ...mockClass,
      description: null,
    };
    render(<ClassCard classItem={classWithoutDescription} />);

    expect(
      screen.queryByText("Introduction to Mathematics"),
    ).not.toBeInTheDocument();
  });

  it("renders teacher name", () => {
    render(<ClassCard classItem={mockClass} />);

    expect(screen.getByText(/student.classes.card.teacher/i)).toBeInTheDocument();
    expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
  });

  it("renders lesson count", () => {
    render(<ClassCard classItem={mockClass} />);

    const lessonsText = screen.getByText(/student.classes.card.lessons/i);
    expect(lessonsText).toBeInTheDocument();
    // Check that the count appears in the same element or nearby
    expect(lessonsText.textContent).toContain("10");
  });

  it("renders student count", () => {
    render(<ClassCard classItem={mockClass} />);

    const studentsText = screen.getByText(/student.classes.card.students/i);
    expect(studentsText).toBeInTheDocument();
    // Check that the count appears in the same element or nearby
    expect(studentsText.textContent).toContain("25");
  });

  it("renders view details button", () => {
    render(<ClassCard classItem={mockClass} />);

    expect(
      screen.getByRole("button", { name: /student.classes.actions.viewDetails/i }),
    ).toBeInTheDocument();
  });

  it("navigates to class details when view details button is clicked", async () => {
    const user = userEvent.setup();
    render(<ClassCard classItem={mockClass} />);

    const viewDetailsButton = screen.getByRole("button", {
      name: /student.classes.actions.viewDetails/i,
    });
    await user.click(viewDetailsButton);

    expect(mockNavigate).toHaveBeenCalledWith("/student/classes/class-1");
  });

  it("handles missing teacher information", () => {
    const classWithoutTeacher = {
      ...mockClass,
      teacher: undefined,
    };
    render(<ClassCard classItem={classWithoutTeacher} />);

    expect(screen.getByText(/student.classes.card.teacher/i)).toBeInTheDocument();
  });

  it("handles missing count information", () => {
    const classWithoutCount = {
      ...mockClass,
      _count: undefined,
    };
    render(<ClassCard classItem={classWithoutCount} />);

    const lessonsText = screen.getByText(/student.classes.card.lessons/i);
    expect(lessonsText).toBeInTheDocument();
    expect(lessonsText.textContent).toContain("0");
  });
});

