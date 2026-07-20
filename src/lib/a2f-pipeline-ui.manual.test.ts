import assert from "node:assert/strict";
import { getEffectivePipelineStatus } from "./a2f-pipeline-ui";

assert.equal(
    getEffectivePipelineStatus({
        status: "a2f_pipeline",
        initialDdComplete: true,
    }),
    "pre_ic_scoring"
);

assert.equal(
    getEffectivePipelineStatus({
        status: "due_diligence_initial",
        initialDdComplete: true,
    }),
    "pre_ic_scoring"
);

assert.equal(
    getEffectivePipelineStatus({
        status: "due_diligence_initial",
        initialDdComplete: false,
    }),
    "due_diligence_initial"
);

assert.equal(
    getEffectivePipelineStatus({
        status: "ic_appraisal_review",
        initialDdComplete: true,
    }),
    "ic_appraisal_review"
);

console.log("A2F effective pipeline stage tests passed");
