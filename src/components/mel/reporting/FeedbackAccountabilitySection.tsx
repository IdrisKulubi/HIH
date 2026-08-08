import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WordCloudTerm } from "@/lib/mel/feedback-word-cloud";
import { WordCloudChart } from "./WordCloudChart";

type FeedbackAccountabilitySectionProps = {
  periodLabel: string;
  responseCount: number;
  enterpriseChallenges: WordCloudTerm[];
  supportNeeded: WordCloudTerm[];
  negativeEffects: WordCloudTerm[];
};

export function FeedbackAccountabilitySection({
  periodLabel,
  responseCount,
  enterpriseChallenges,
  supportNeeded,
  negativeEffects,
}: FeedbackAccountabilitySectionProps) {
  return (
    <section className="space-y-3" aria-labelledby="feedback-accountability-heading">
      <div>
        <h2 id="feedback-accountability-heading" className="text-lg font-semibold text-slate-900">
          Feedback &amp; Accountability
        </h2>
        <p className="text-sm text-slate-600">
          Qualitative responses from {responseCount} approved report{responseCount === 1 ? "" : "s"} in{" "}
          <span className="font-medium text-slate-800">{periodLabel}</span>. Dashboard filters apply.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-900">Enterprise challenges</CardTitle>
          </CardHeader>
          <CardContent>
            <WordCloudChart
              terms={enterpriseChallenges}
              ariaLabel={`Enterprise challenges word cloud for ${periodLabel}`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-900">Support needed</CardTitle>
          </CardHeader>
          <CardContent>
            <WordCloudChart
              terms={supportNeeded}
              ariaLabel={`Support needed word cloud for ${periodLabel}`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-900">
              Negative effects of participating in the BIRE project
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WordCloudChart
              terms={negativeEffects}
              ariaLabel={`Negative programme effects word cloud for ${periodLabel}`}
            />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
