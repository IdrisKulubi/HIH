import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { FeedbackEmailSystem } from "@/components/application/admin/feedback/FeedbackEmailSystem";

export default async function FeedbackEmailPage() {
  const user = await getCurrentUser();

  if (user?.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      <div className="container mx-auto py-8">
        <FeedbackEmailSystem />
      </div>
    </div>
  );
}
