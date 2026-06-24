import assert from "node:assert/strict";
import { inferMatchingGrantTrackFromRevenue } from "./a2f-constants";
import { formatRevenueTrackMismatchError } from "./server/a2f-track-sync";

assert.equal(inferMatchingGrantTrackFromRevenue(12_000_000), "acceleration");
assert.equal(inferMatchingGrantTrackFromRevenue(2_500_000), "foundation");
assert.equal(inferMatchingGrantTrackFromRevenue(3_000_000), "foundation");
assert.equal(inferMatchingGrantTrackFromRevenue(3_000_001), "acceleration");
assert.equal(inferMatchingGrantTrackFromRevenue(500_000), "foundation");
assert.equal(inferMatchingGrantTrackFromRevenue(499_999), null);
assert.equal(inferMatchingGrantTrackFromRevenue(0), null);

assert.match(
  formatRevenueTrackMismatchError(400_000),
  /outside both Foundation \(500k–3M\) and Accelerator \(>3M\) ranges/
);

console.log("A2F track sync helper tests passed");
