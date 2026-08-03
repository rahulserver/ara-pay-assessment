import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RuleForm from "../components/RuleForm";

// Mock saveRule
vi.mock("../lib/api", () => ({
  saveRule: vi.fn()
}));

import { saveRule } from "../lib/api";
const mockSaveRule = vi.mocked(saveRule);

const noop = vi.fn();

describe("RuleForm", () => {
  it("renders the form fields", () => {
    render(<RuleForm onCreated={noop} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/minimum amount/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save rule/i })).toBeInTheDocument();
  });

  it("shows validation error for negative minAmount", async () => {
    render(<RuleForm onCreated={noop} />);

    await userEvent.type(screen.getByLabelText(/name/i), "Test Rule");
    await userEvent.clear(screen.getByLabelText(/minimum amount/i));
    await userEvent.type(screen.getByLabelText(/minimum amount/i), "-100");

    fireEvent.submit(screen.getByRole("button", { name: /save rule/i }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/positive number/i)).toBeInTheDocument();
    });
    expect(mockSaveRule).not.toHaveBeenCalled();
  });

  it("calls saveRule with correct payload on valid submit", async () => {
    mockSaveRule.mockResolvedValueOnce({
      _id: "rule_1",
      name: "My Rule",
      enabled: true,
      channel: "in_app",
      conditions: { eventType: "payment_received" },
      createdAt: new Date().toISOString()
    });

    render(<RuleForm onCreated={noop} />);

    await userEvent.type(screen.getByLabelText(/name/i), "My Rule");
    fireEvent.submit(screen.getByRole("button", { name: /save rule/i }).closest("form")!);

    await waitFor(() => {
      expect(mockSaveRule).toHaveBeenCalledWith(
        expect.objectContaining({ name: "My Rule", eventType: "payment_received" })
      );
    });
  });

  it("shows success message after rule is created", async () => {
    mockSaveRule.mockResolvedValueOnce({
      _id: "rule_2",
      name: "Alert Rule",
      enabled: true,
      channel: "in_app",
      conditions: {},
      createdAt: new Date().toISOString()
    });

    render(<RuleForm onCreated={noop} />);
    await userEvent.type(screen.getByLabelText(/name/i), "Alert Rule");
    fireEvent.submit(screen.getByRole("button", { name: /save rule/i }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/created successfully/i)).toBeInTheDocument();
    });
  });

  it("shows API error when saveRule fails", async () => {
    mockSaveRule.mockRejectedValueOnce(new Error('A rule named "Alert Rule" already exists.'));

    render(<RuleForm onCreated={noop} />);
    await userEvent.type(screen.getByLabelText(/name/i), "Alert Rule");
    fireEvent.submit(screen.getByRole("button", { name: /save rule/i }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });
  });
});
