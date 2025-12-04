import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Breadcrumbs } from "../Breadcrumbs";

vi.mock("react-router-dom", () => {
  const React = require("react");
  const MockLink = React.forwardRef<
    HTMLAnchorElement,
    { to: string; children: React.ReactNode }
  >(({ to, children, ...props }, ref: React.Ref<HTMLAnchorElement>) => (
    <a ref={ref} href={to} {...props}>
      {children}
    </a>
  ));
  MockLink.displayName = "MockLink";
  return {
    Link: MockLink,
  };
});

describe("Breadcrumbs", () => {
  it("renders breadcrumb items", () => {
    const items = [
      { label: "Home", path: "/" },
      { label: "Classes", path: "/classes" },
      { label: "Current Page" },
    ];

    render(<Breadcrumbs items={items} />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Classes")).toBeInTheDocument();
    expect(screen.getByText("Current Page")).toBeInTheDocument();
  });

  it("renders last item as non-clickable text", () => {
    const items = [{ label: "Home", path: "/" }, { label: "Current Page" }];

    render(<Breadcrumbs items={items} />);

    const currentPage = screen.getByText("Current Page");
    expect(currentPage.tagName).toBe("P"); // Typography renders as <p>
  });

  it("renders non-last items as links", () => {
    const items = [
      { label: "Home", path: "/" },
      { label: "Classes", path: "/classes" },
      { label: "Current Page" },
    ];

    render(<Breadcrumbs items={items} />);

    const homeLink = screen.getByText("Home");
    expect(homeLink.tagName).toBe("A");
    expect(homeLink).toHaveAttribute("href", "/");

    const classesLink = screen.getByText("Classes");
    expect(classesLink.tagName).toBe("A");
    expect(classesLink).toHaveAttribute("href", "/classes");
  });

  it("uses default path for items without path", () => {
    const items = [{ label: "Home" }, { label: "Current Page" }];

    render(<Breadcrumbs items={items} />);

    const homeLink = screen.getByText("Home");
    expect(homeLink).toHaveAttribute("href", "#");
  });

  it("handles empty items array", () => {
    render(<Breadcrumbs items={[]} />);
    // Should render without errors
    expect(screen.queryByText("Home")).not.toBeInTheDocument();
  });

  it("handles single item", () => {
    const items = [{ label: "Current Page" }];

    render(<Breadcrumbs items={items} />);

    expect(screen.getByText("Current Page")).toBeInTheDocument();
    const currentPage = screen.getByText("Current Page");
    expect(currentPage.tagName).toBe("P"); // Should be non-clickable
  });
});

