"use client";

import { useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LocationInput } from "@/lib/actions/fieldwork-execution";

type Reading = { latitude: number; longitude: number; accuracyMeters: number };
type Outcome = { success: boolean; error?: string; data?: { result: string; reason: string | null } };
type Step = "notice" | "locating" | "confirm" | "sending" | "offline" | "done";

const ERROR_STATE: Record<number, "denied" | "unavailable" | "timeout"> = { 1: "denied", 2: "unavailable", 3: "timeout" };
const ERROR_TEXT = {
  denied: "Location permission was blocked. You can allow it in your browser settings and try again, or continue without location (a REDO will need to review the visit).",
  unavailable: "Your device could not determine its position. Move to an open area and try again, or continue without location.",
  timeout: "Finding your location took too long. Try again, or continue without location.",
} as const;
const MAX_GOOD_ACCURACY = 100;

export function FieldworkLocationDialog({ kind, enterprise, onClose, onSubmit }: {
  kind: "in" | "out";
  enterprise: string;
  onClose: () => void;
  onSubmit: (input: LocationInput) => Promise<Outcome>;
}) {
  const [step, setStep] = useState<Step>("notice");
  const [acknowledged, setAcknowledged] = useState(false);
  const [reading, setReading] = useState<Reading | null>(null);
  const [problem, setProblem] = useState<"denied" | "unavailable" | "timeout" | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [pendingInput, setPendingInput] = useState<LocationInput | null>(null);
  const verb = kind === "in" ? "Check in" : "Check out";

  function locate() {
    setProblem(null);
    if (!navigator.geolocation) { setProblem("unavailable"); setStep("notice"); return; }
    setStep("locating");
    navigator.geolocation.getCurrentPosition(
      (p) => { setReading({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracyMeters: Math.round(p.coords.accuracy) }); setStep("confirm"); },
      (error) => { setProblem(ERROR_STATE[error.code] ?? "unavailable"); setStep("notice"); },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  async function send(input: LocationInput) {
    setPendingInput(input);
    setStep("sending");
    try {
      const result = await onSubmit(input);
      setOutcome(result);
      setStep("done");
    } catch {
      // Network failure: keep the captured reading so the user can retry without re-locating.
      setStep("offline");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && step !== "sending" && step !== "locating") onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{verb} — {enterprise}</DialogTitle>
          <DialogDescription>Location is used only to confirm this visit took place.</DialogDescription>
        </DialogHeader>

        {step === "notice" && (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-muted p-3">
              <p className="font-medium">Privacy notice</p>
              <p className="mt-1 text-muted-foreground">We record a single point-in-time location (with its accuracy and time) when you check in and out of a visit. We do not track you in the background. Precise coordinates are visible only to authorised programme staff and are kept for the agreed operational period.</p>
            </div>
            {problem && <p role="alert" className="rounded-md bg-amber-50 p-2 text-amber-900">{ERROR_TEXT[problem]}</p>}
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
              <span>I have read this notice and understand how my location is used.</span>
            </label>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" disabled={!acknowledged} onClick={() => send({ consent: true, state: problem ?? "denied", reading: null })}>Continue without location</Button>
              <Button disabled={!acknowledged} onClick={locate}><MapPin className="mr-2 h-4 w-4" />Share my location</Button>
            </DialogFooter>
          </div>
        )}

        {step === "locating" && <p className="flex items-center gap-2 py-6 text-sm" role="status"><Loader2 className="h-4 w-4 animate-spin" />Finding your location…</p>}

        {step === "confirm" && reading && (
          <div className="space-y-3 text-sm">
            <p>Location found, accurate to about <strong>{reading.accuracyMeters} m</strong>.</p>
            {reading.accuracyMeters > MAX_GOOD_ACCURACY && <p role="alert" className="rounded-md bg-amber-50 p-2 text-amber-900">This is less accurate than the {MAX_GOOD_ACCURACY} m target. Moving outdoors and retrying usually helps; otherwise a REDO will review this visit.</p>}
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={locate}>Try again</Button>
              <Button onClick={() => send({ consent: true, state: "granted", reading })}>{verb}</Button>
            </DialogFooter>
          </div>
        )}

        {step === "sending" && <p className="flex items-center gap-2 py-6 text-sm" role="status"><Loader2 className="h-4 w-4 animate-spin" />Saving…</p>}

        {step === "offline" && (
          <div className="space-y-3 text-sm">
            <p role="alert" className="rounded-md bg-amber-50 p-2 text-amber-900">You appear to be offline. Nothing was lost — your reading is kept. Reconnect and retry.</p>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button onClick={() => pendingInput && send(pendingInput)}>Retry</Button>
            </DialogFooter>
          </div>
        )}

        {step === "done" && outcome && (
          <div className="space-y-3 text-sm">
            {!outcome.success ? <p role="alert" className="rounded-md bg-red-50 p-2 text-red-800">{outcome.error}</p>
              : outcome.data?.result === "verified" ? <p className="rounded-md bg-emerald-50 p-2 text-emerald-900">{verb} recorded and location verified.</p>
              : <p className="rounded-md bg-amber-50 p-2 text-amber-900">{verb} recorded, but the location could not be verified automatically{outcome.data?.reason ? ` (${outcome.data.reason})` : ""}. A REDO will review it before the report opens.</p>}
            <DialogFooter><Button onClick={onClose}>Done</Button></DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
