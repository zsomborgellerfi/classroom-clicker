import { render } from "@testing-library/react";

import { AuthInitializer } from "../AuthInitializer";

const mockDispatch = vi.fn();
const mockFetchCurrentUser = vi.fn();
const mockUseAppSelector = vi.fn(() => ({
  token: null,
  user: null,
  loading: false,
}));
const mockUseAppDispatch = vi.fn(() => mockDispatch);

vi.mock("@/store/hooks", () => ({
  useAppSelector: (selector: any) => mockUseAppSelector(),
  useAppDispatch: () => mockUseAppDispatch(),
}));

vi.mock("@/store/slices/auth", () => ({
  fetchCurrentUser: () => mockFetchCurrentUser(),
}));

describe("AuthInitializer", () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockFetchCurrentUser.mockClear();
    mockUseAppSelector.mockReturnValue({
      token: null,
      user: null,
      loading: false,
    });
  });

  it("renders nothing", () => {
    const { container } = render(<AuthInitializer />);
    expect(container.firstChild).toBeNull();
  });

  it("does not fetch user when token is missing", () => {
    mockUseAppSelector.mockReturnValue({
      token: null,
      user: null,
      loading: false,
    });

    render(<AuthInitializer />);

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("does not fetch user when user already exists", () => {
    mockUseAppSelector.mockReturnValue({
      token: "test-token",
      user: { id: "user-1", role: "STUDENT" },
      loading: false,
    });

    render(<AuthInitializer />);

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("does not fetch user when loading is true", () => {
    mockUseAppSelector.mockReturnValue({
      token: "test-token",
      user: null,
      loading: true,
    });

    render(<AuthInitializer />);

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("fetches user when token exists and user is missing", () => {
    mockUseAppSelector.mockReturnValue({
      token: "test-token",
      user: null,
      loading: false,
    });
    mockDispatch.mockReturnValue(mockFetchCurrentUser());

    render(<AuthInitializer />);

    expect(mockDispatch).toHaveBeenCalled();
  });
});

