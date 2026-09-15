import { auth } from "@/auth";
import { getMentorTool } from "@/lib/mentorship/mentor-tools";

const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function canDownloadMentorTools(role: string | null | undefined) {
  return role === "mentor" || role === "admin";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !canDownloadMentorTools(session.user.role ?? null)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;
  const tool = getMentorTool(slug);
  if (!tool) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const upstream = await fetch(tool.url, { cache: "force-cache" });
  if (!upstream.ok) {
    return Response.json({ error: "Template file unavailable" }, { status: 502 });
  }

  const body = await upstream.arrayBuffer();
  return new Response(body, {
    headers: {
      "Content-Type": DOCX_TYPE,
      "Content-Disposition": `attachment; filename="${tool.fileName}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
