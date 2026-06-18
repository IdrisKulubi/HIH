import assert from "node:assert/strict";
import {
  canStartPreScreeningRescreen,
  isRescreenDateReached,
} from "./a2f-pre-screening-rescreen";

assert.equal(isRescreenDateReached(null), true);
assert.equal(isRescreenDateReached(undefined), true);

const today = new Date();
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
assert.equal(isRescreenDateReached(todayStr), true);

const future = new Date(today);
future.setMonth(future.getMonth() + 4);
const futureStr = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, "0")}-${String(future.getDate()).padStart(2, "0")}`;
assert.equal(isRescreenDateReached(futureStr), false);

assert.equal(
  canStartPreScreeningRescreen({
    latestOutcome: "conditional",
    rescreenEligibleAt: null,
    canClaim: true,
  }),
  true
);

assert.equal(
  canStartPreScreeningRescreen({
    latestOutcome: "conditional",
    rescreenEligibleAt: futureStr,
    canClaim: true,
  }),
  false
);

console.log("A2F pre-screening re-screen helper tests passed");
