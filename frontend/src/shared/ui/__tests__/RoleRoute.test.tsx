import { render, screen } from "@testing-library/react";

import { UserRole } from "@/enums/userRole";
import { RoleRoute } from "../RoleRoute";

let mockAuthState = {
  isAuthenticated: false,
  user: null as null | { role?: UserRole },
};

const mockNavigate = vi.fn(({ to }: { to: string }) => (
  <div data-testid={`navigate-${to}`} />
));
const mockOutlet = vi.fn(() => <div data-testid="outlet" />);

vi.mock("react-router-dom", () => ({
  Navigate: (props: { to: string; replace?: boolean }) => mockNavigate(props),
  Outlet: () => mockOutlet(),
}));

vi.mock("@/store/hooks", () => ({
  useAppSelector: (selector: (state: { auth: typeof mockAuthState }) => any) =>
    selector({ auth: mockAuthState }),
}));

describe("RoleRoute", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockOutlet.mockClear();
  });

  it("redirects unauthenticated users to the login page", () => {
    mockAuthState = {
      isAuthenticated: false,
      user: null,
    };

    render(<RoleRoute roles={[UserRole.TEACHER]} />);

    expect(mockNavigate).toHaveBeenCalledWith({
      replace: true,
      to: "/login",
    });
  });

  it("redirects authenticated users without the required role to their dashboard", () => {
    mockAuthState = {
      isAuthenticated: true,
      user: { role: UserRole.TEACHER },
    };

    render(<RoleRoute roles={[UserRole.STUDENT]} />);

    expect(mockNavigate).toHaveBeenCalledWith({
      replace: true,
      to: "/teacher",
    });
  });

  it("renders the outlet when the user has the required role", () => {
    mockAuthState = {
      isAuthenticated: true,
      user: { role: UserRole.TEACHER },
    };

    render(<RoleRoute roles={[UserRole.TEACHER]} />);

    expect(mockOutlet).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });
});
