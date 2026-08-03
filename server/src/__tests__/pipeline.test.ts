import { doesRuleLikelyMatch } from "../services/pipeline";
import { EventDocument } from "../models/Event";
import { RuleConditions } from "../models/Rule";

function makeEvent(
  overrides: Partial<{
    type: string;
    amount: number;
    accountId: string;
  }>
): EventDocument {
  return {
    type: overrides.type ?? "payment_received",
    amount: overrides.amount ?? 1000,
    accountId: overrides.accountId ?? "acc_001"
  } as unknown as EventDocument;
}

describe("doesRuleLikelyMatch", () => {
  describe("eventType condition", () => {
    it("matches when no eventType is set on the rule", () => {
      const conditions: RuleConditions = {};
      expect(doesRuleLikelyMatch(makeEvent({}), conditions)).toBe(true);
    });

    it("matches when eventType matches the event", () => {
      const conditions: RuleConditions = { eventType: "payment_received" };
      expect(doesRuleLikelyMatch(makeEvent({ type: "payment_received" }), conditions)).toBe(true);
    });

    it("does not match when eventType differs", () => {
      const conditions: RuleConditions = { eventType: "overdue" };
      expect(doesRuleLikelyMatch(makeEvent({ type: "payment_received" }), conditions)).toBe(false);
    });
  });

  describe("minAmount condition", () => {
    it("matches when no minAmount is set", () => {
      const conditions: RuleConditions = {};
      expect(doesRuleLikelyMatch(makeEvent({ amount: 0 }), conditions)).toBe(true);
    });

    it("matches when amount equals minAmount", () => {
      const conditions: RuleConditions = { minAmount: 500 };
      expect(doesRuleLikelyMatch(makeEvent({ amount: 500 }), conditions)).toBe(true);
    });

    it("matches when amount exceeds minAmount", () => {
      const conditions: RuleConditions = { minAmount: 500 };
      expect(doesRuleLikelyMatch(makeEvent({ amount: 9000 }), conditions)).toBe(true);
    });

    it("does not match when amount is below minAmount", () => {
      const conditions: RuleConditions = { minAmount: 5000 };
      expect(doesRuleLikelyMatch(makeEvent({ amount: 499 }), conditions)).toBe(false);
    });
  });

  describe("accountId condition", () => {
    it("matches when no accountId is set", () => {
      const conditions: RuleConditions = {};
      expect(doesRuleLikelyMatch(makeEvent({}), conditions)).toBe(true);
    });

    it("matches when accountId matches", () => {
      const conditions: RuleConditions = { accountId: "acc_001" };
      expect(doesRuleLikelyMatch(makeEvent({ accountId: "acc_001" }), conditions)).toBe(true);
    });

    it("does not match when accountId differs", () => {
      const conditions: RuleConditions = { accountId: "acc_999" };
      expect(doesRuleLikelyMatch(makeEvent({ accountId: "acc_001" }), conditions)).toBe(false);
    });
  });

  describe("combined conditions (AND logic)", () => {
    it("matches only when all conditions are satisfied", () => {
      const conditions: RuleConditions = {
        eventType: "payment_received",
        minAmount: 5000,
        accountId: "acc_001"
      };
      expect(
        doesRuleLikelyMatch(
          makeEvent({ type: "payment_received", amount: 8000, accountId: "acc_001" }),
          conditions
        )
      ).toBe(true);
    });

    it("does not match when one condition fails", () => {
      const conditions: RuleConditions = {
        eventType: "payment_received",
        minAmount: 5000,
        accountId: "acc_001"
      };
      // amount too low
      expect(
        doesRuleLikelyMatch(
          makeEvent({ type: "payment_received", amount: 100, accountId: "acc_001" }),
          conditions
        )
      ).toBe(false);
    });
  });
});
