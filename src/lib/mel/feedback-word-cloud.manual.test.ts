import assert from "node:assert/strict";
import { buildFeedbackWordClouds, buildWordCloudTerms } from "./feedback-word-cloud";

function testBuildWordCloudTerms() {
  const terms = buildWordCloudTerms([
    "Access to finance, market access, skills",
    "Market access, access to finance, regulatory issues",
  ]);
  assert.ok(terms.length >= 3);
  assert.equal(terms[0].text, "access to finance");
  assert.ok(terms[0].value >= 2);

  const empty = buildWordCloudTerms([]);
  assert.equal(empty.length, 0);

  const negative = buildWordCloudTerms(["None observed", "Delayed payments from buyers", "None"]);
  assert.ok(negative.some((term) => term.text === "none"));
  assert.equal(negative.some((term) => term.text === "none observed"), false);
  assert.ok(negative.some((term) => term.text.includes("delayed payments")));

  const noneOnly = buildWordCloudTerms(["None", "None observed", "N/A", "No negative impact"]);
  assert.deepEqual(noneOnly, [{ text: "none", value: 4 }]);

  const filler = buildWordCloudTerms(["In addition, leadership and record keeping"]);
  assert.equal(filler.some((term) => term.text === "in addition"), false);
  assert.ok(filler.some((term) => term.text.includes("leadership")));
}

function testBuildFeedbackWordClouds() {
  const clouds = buildFeedbackWordClouds({
    positiveProgrammeImpacts: ["Improved market access, mentorship support"],
    mainChallenges: ["Access to finance, inputs"],
    additionalSupportNeeded: ["Training, mentorship"],
    negativeProgrammeImpacts: ["None observed", "Increased workload"],
  });
  assert.ok(clouds.positiveEffects.some((term) => term.text.includes("market access")));
  assert.ok(clouds.enterpriseChallenges.some((term) => term.text === "access to finance"));
  assert.ok(clouds.supportNeeded.some((term) => term.text === "training"));
  assert.ok(clouds.negativeEffects.some((term) => term.text === "none"));
  assert.equal(clouds.negativeEffects.some((term) => term.text === "none observed"), false);
  assert.ok(clouds.negativeEffects.some((term) => term.text === "increased workload"));
}

testBuildWordCloudTerms();
testBuildFeedbackWordClouds();
console.log("feedback-word-cloud.manual.test.ts passed");
