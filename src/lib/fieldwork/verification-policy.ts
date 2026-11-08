/**
 * Visit location verification policy. Pure and configurable: thresholds come from the environment
 * (with safe defaults) so nothing is hard-coded in the UI.
 */
export type LocationState = "granted" | "denied" | "unavailable" | "timeout";
export type Coordinates = { latitude: number; longitude: number };
export type Reading = Coordinates & { accuracyMeters: number };
export type VerificationPolicy = { radiusMeters: number; maxAccuracyMeters: number };
export type Evaluation = { result: "verified" | "needs_review"; reason: string | null; distanceMeters: number | null };

export function getVerificationPolicy(env: Record<string, string | undefined> = process.env): VerificationPolicy {
  const number = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };
  return {
    radiusMeters: number(env.FIELDWORK_VERIFY_RADIUS_METERS, 300),
    maxAccuracyMeters: number(env.FIELDWORK_MAX_ACCURACY_METERS, 100),
  };
}

/** Parses the KYC "lat, lng" text. Returns null for anything untrustworthy (malformed, out of range, 0,0). */
export function parseCoordinates(raw: string | null | undefined): Coordinates | null {
  if (!raw) return null;
  const match = raw.trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
}

export function distanceMeters(a: Coordinates, b: Coordinates) {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

const STATE_LABEL: Record<Exclude<LocationState, "granted">, string> = {
  denied: "Location permission was denied",
  unavailable: "Device location was unavailable",
  timeout: "Location lookup timed out",
};

/** Never silently accepts a failure: anything short of a good, close reading needs review. */
export function evaluateReading(
  input: { enterprise: Coordinates | null; reading: Reading | null; state: LocationState },
  policy: VerificationPolicy,
): Evaluation {
  if (input.state !== "granted" || !input.reading) {
    return { result: "needs_review", reason: STATE_LABEL[input.state === "granted" ? "unavailable" : input.state], distanceMeters: null };
  }
  const distance = input.enterprise ? distanceMeters(input.enterprise, input.reading) : null;
  if (!input.enterprise) return { result: "needs_review", reason: "No trusted enterprise coordinates on file", distanceMeters: null };
  if (input.reading.accuracyMeters > policy.maxAccuracyMeters) {
    return { result: "needs_review", reason: `Location accuracy ${input.reading.accuracyMeters} m is worse than the ${policy.maxAccuracyMeters} m limit`, distanceMeters: distance };
  }
  if (distance! > policy.radiusMeters) {
    return { result: "needs_review", reason: `${distance} m from the enterprise (limit ${policy.radiusMeters} m)`, distanceMeters: distance };
  }
  return { result: "verified", reason: null, distanceMeters: distance };
}

/** A visit is verified only when both check-in and check-out are verified. */
export function combineEvaluations(checkIn: Evaluation | null, checkOut: Evaluation | null) {
  if (checkIn?.result === "verified" && checkOut?.result === "verified") return { result: "verified" as const, notes: null };
  const notes = [checkIn?.reason && `Check-in: ${checkIn.reason}`, checkOut?.reason && `Check-out: ${checkOut.reason}`, !checkIn && "Check-in missing"].filter(Boolean).join("; ");
  return { result: "needs_review" as const, notes: notes || "Verification incomplete" };
}
