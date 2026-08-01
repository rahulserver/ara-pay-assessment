import { EventDocument } from "../models/Event";
import { NotificationModel } from "../models/Notification";
import { RuleConditions, RuleModel } from "../models/Rule";

function doesRuleMatch(event: EventDocument, conditions: RuleConditions): boolean {
  const { eventType, minAmount, accountId } = conditions;

  const typeMatches = !eventType || eventType === event.type;
  const amountMatches = minAmount === undefined || event.amount >= minAmount;
  const accountMatches = !accountId || accountId === event.accountId;

  return typeMatches && amountMatches && accountMatches;
}

export async function processEvent(event: EventDocument): Promise<void> {
  const activeRules = await RuleModel.find({ enabled: true }).lean();

  if (activeRules.length === 0) {
    return;
  }

  for (const rule of activeRules) {
    try {
      const maybeMatch = doesRuleMatch(event, rule.conditions || {});

      if (!maybeMatch) {
        continue;
      }

      const message = `Rule "${rule.name}" matched: ${event.type} $${event.amount} ${event.currency} on ${event.accountId}`;

      await NotificationModel.create({
        eventId: event._id,
        ruleId: rule._id,
        status: "pending",
        message
      });

      console.log("[pipeline] notification created", {
        eventId: String(event._id),
        ruleId: String(rule._id),
        ruleName: rule.name
      });
    } catch (error) {
      console.error("[pipeline] failed evaluating rule", {
        eventId: String(event._id),
        ruleId: String(rule._id),
        error
      });
    }
  }
}
