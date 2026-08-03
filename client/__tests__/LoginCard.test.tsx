import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginCard from "../components/LoginCard";
import { AuthProvider } from "../context/AuthContext";
import { useAuth } from "../hooks/useAuth";

// LoginCard tests
describe("LoginCard", () => {
  it("renders email and password fields", () => {
    render(<LoginCard onLogin={vi.fn()} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("pre-fills with default credentials", () => {
    render(<LoginCard onLogin={vi.fn()} />);
    expect(screen.getByDisplayValue("owner@ara-research.dev")).toBeInTheDocument();
  });

  it("calls onLogin with email and password on submit", async () => {
    const mockLogin = vi.fn().mockResolvedValueOnce(undefined);
    render(<LoginCard onLogin={mockLogin} />);

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("owner@ara-research.dev", "password123");
    });
  });

  it("shows error message when onLogin throws", async () => {
    const mockLogin = vi.fn().mockRejectedValueOnce(new Error("Invalid credentials"));
    render(<LoginCard onLogin={mockLogin} />);

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});

// AuthContext + useAuth hook tests
function TestConsumer() {
  const { authenticated } = useAuth();
  return (
    <div data-testid="auth-status">{authenticated ? "authenticated" : "not-authenticated"}</div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("provides unauthenticated state by default", async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent("not-authenticated");
    });
  });

  it("throws when useAuth is used outside provider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow("useAuth must be used within an AuthProvider");
    consoleError.mockRestore();
  });
});
