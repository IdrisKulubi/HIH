import assert from "node:assert/strict";
import {
  resolveEffectivePreScreeningOutcome,
  validatePreScreeningOutcomeOverride,
} from "./a2f-pre-screening-outcome";

assert.equal(resolveEffectivePreScreeningOutcome("conditional"), "conditional");
assert.equal(resolveEffectivePreScreeningOutcome("conditional", "pass"), "pass");
assert.equal(resolveEffectivePreScreeningOutcome("stop", "conditional"), "conditional");
assert.equal(resolveEffectivePreScreeningOutcome(null), null);

assert.equal(
  validatePreScreeningOutcomeOverride({
    currentOutcome: "conditional",
    newOutcome: "pass",
    hardStopReasons: [],
    matchingGrantDraftExists: false,
  }),
  null
);
assert.match(
  validatePreScreeningOutcomeOverride({
    currentOutcome: "stop",
    newOutcome: "pass",
    hardStopReasons: ["No credible innovation"],
    matchingGrantDraftExists: false,
  }) ?? "",
  /hard stop/i
);
assert.match(
  validatePreScreeningOutcomeOverride({
    currentOutcome: "pass",
    newOutcome: "conditional",
    hardStopReasons: [],
    matchingGrantDraftExists: true,
  }) ?? "",
  /cannot be downgraded/i
);
assert.match(
  validatePreScreeningOutcomeOverride({
    currentOutcome: "pass",
    newOutcome: "pass",
    hardStopReasons: [],
    matchingGrantDraftExists: false,
  }) ?? "",
  /different/i
);

console.log("A2F effective outcome override tests passed.");
