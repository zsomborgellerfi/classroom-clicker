import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AlertDialog } from "../AlertDialog";

vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("AlertDialog", () => {
  it("renders the provided content", () => {
    render(
      <AlertDialog
        open
        title="Delete class"
        message="Are you sure?"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        confirmText="Confirm"
        cancelText="Cancel"
      />,
    );

    expect(screen.getByText("Delete class")).toBeInTheDocument();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });

  it("calls the confirm and close callbacks when confirming", async () => {
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <AlertDialog
        open
        title="Delete class"
        message="Are you sure?"
        onClose={handleClose}
        onConfirm={handleConfirm}
        confirmText="Confirm"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
