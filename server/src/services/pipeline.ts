import { EventDocument } from "../models/Event";
import { RuleConditions, RuleModel } from "../models/Rule";

function doesRuleLikelyMatch(event: EventDocument, conditions: RuleConditions): boolean {
  if (conditions.eventType && conditions.eventType !== event.type) {
    return false;
  }

  if (typeof conditions.minAmount === "number" && event.amount < conditions.minAmount) {
    return false;
  }

  if (conditions.accountId && conditions.accountId !== event.accountId) {
    return false;
  }

  return true;
}

export async function processEvent(event: EventDocument): Promise<void> {
  const activeRules = await RuleModel.find({ enabled: true }).lean();

  if (activeRules.length === 0) {
    return;
  }

  for (const rule of activeRules) {
    try {
      const maybeMatch = doesRuleLikelyMatch(event, rule.conditions || {});

      if (!maybeMatch) {
        continue;
      }

      // TODO: implement full rule evaluation engine.
      // TODO: create notification records for all matching rules.
      // TODO: handle failures without dropping entire event processing.
      // Intentionally left as a stub for now.
    } catch (error) {
      console.error("[pipeline] failed evaluating rule", {
        eventId: String(event._id),
        ruleId: String(rule._id),
        error
      });
    }
  }
}
