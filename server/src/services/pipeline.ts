import { EventDocument } from "../models/Event";
import { NotificationModel } from "../models/Notification";
import { RuleConditions, RuleModel } from "../models/Rule";

export function doesRuleLikelyMatch(event: EventDocument, conditions: RuleConditions): boolean {
  const { eventType, minAmount, accountId } = conditions;

  const typeMatches = eventType === event.type;
  const amountMatches = minAmount === undefined || event.amount >= minAmount;
  const accountMatches = accountId === undefined || accountId === event.accountId;

  return typeMatches && amountMatches && accountMatches;
}

/**
 * Returns the specificity score of a rule's optional conditions.
 * eventType is required on all rules and does not differentiate.
 * Only the narrowing conditions (minAmount, accountId) add specificity.
 */
function conditionScore(conditions: RuleConditions): number {
  return [conditions.minAmount, conditions.accountId].filter((v) => v !== undefined).length;
}

export async function processEvent(event: EventDocument): Promise<void> {
  const activeRules = await RuleModel.find({ enabled: true }).lean();

  if (activeRules.length === 0) {
    return;
  }

  const matchingRules = activeRules.filter((rule) => doesRuleLikelyMatch(event, rule.conditions));

  if (matchingRules.length === 0) {
    return;
  }

  // DONE: implement full rule evaluation engine.
  // Fire only the most specific matching rule(s) to avoid duplicate notifications
  // on the shared feed. Specificity = number of optional narrowing conditions set.
  // Rules with equal score both fire (they represent different concerns: amount vs account).
  const maxScore = Math.max(...matchingRules.map((r) => conditionScore(r.conditions)));
  const rulesToFire = matchingRules.filter((r) => conditionScore(r.conditions) === maxScore);

  for (const rule of rulesToFire) {
    try {
      const message = `Rule "${rule.name}" matched: ${event.type} $${event.amount} ${event.currency} on ${event.accountId}`;

      // DONE: create notification records for all matching rules.
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
    // DONE: handle failures without dropping entire event processing.
  }
}
