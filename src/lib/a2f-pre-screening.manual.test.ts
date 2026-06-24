import assert from "node:assert/strict";
import {
  calculatePreScreening,
  getRevenueRating,
  PRE_SCREENING_CRITERIA,
  type PreScreeningRatings,
  type PreScreeningTrack,
} from "./a2f-pre-screening";

function ratingsFor(track: PreScreeningTrack, optionId: string) {
  return Object.fromEntries(
    PRE_SCREENING_CRITERIA.map((criterion) => [
      criterion.id,
      criterion.options[track].find((option) => option.id === optionId)?.id ??
        criterion.options[track][0].id,
    ])
  ) as PreScreeningRatings;
}

const foundationStrong = calculatePreScreening(
  "foundation",
  2_500_000,
  ratingsFor("foundation", "strong")
);
assert.equal(foundationStrong.totalScore, 100);
assert.equal(foundationStrong.outcome, "pass");
assert.deepEqual(foundationStrong.hardStopReasons, []);

const acceleratorStrong = calculatePreScreening(
  "acceleration",
  6_000_000,
  ratingsFor("acceleration", "strong")
);
assert.equal(acceleratorStrong.totalScore, 100);
assert.equal(acceleratorStrong.outcome, "pass");

assert.equal(getRevenueRating("foundation", 500_000), "weak");
assert.equal(getRevenueRating("foundation", 3_000_000), "strong");
assert.equal(getRevenueRating("foundation", 3_000_001), "fail");
assert.equal(getRevenueRating("acceleration", 3_000_000), "fail");
assert.equal(getRevenueRating("acceleration", 3_000_001), "weak");

const hardStopRatings = ratingsFor("foundation", "strong");
hardStopRatings.revenueMomentum = "fail";
const hardStop = calculatePreScreening("foundation", 2_500_000, hardStopRatings);
assert.equal(hardStop.outcome, "stop");
assert.equal(hardStop.hardStopReasons.length, 1);

const innovationStopRatings = ratingsFor("acceleration", "strong");
innovationStopRatings.innovation = "fail";
const innovationStop = calculatePreScreening(
  "acceleration",
  6_000_000,
  innovationStopRatings
);
assert.equal(innovationStop.outcome, "stop");

const foundationConditionalRatings = ratingsFor("foundation", "moderate");
foundationConditionalRatings.differentiation = "weak";
const foundationConditional = calculatePreScreening(
  "foundation",
  1_500_000,
  foundationConditionalRatings
);
assert.ok(foundationConditional.totalScore >= 52);
assert.ok(foundationConditional.totalScore <= 59);
assert.equal(foundationConditional.outcome, "conditional");

const incomplete = calculatePreScreening("foundation", 2_500_000, {});
assert.equal(incomplete.missing.length, 11);

const manualRevenue = calculatePreScreening("foundation", 2_500_000, { revenue: "moderate" });
assert.equal(manualRevenue.ratings.revenue, "moderate");
assert.equal(manualRevenue.scores.revenue, 6);

console.log("A2F pre-screening rubric tests passed");
