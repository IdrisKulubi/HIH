import { NextRequest, NextResponse } from "next/server";
import { isAllowedDocumentFileHost } from "@/lib/document-view-url";

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get("url");
  if (!urlParam) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(urlParam);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.json({ error: "Invalid protocol" }, { status: 400 });
  }

  if (!isAllowedDocumentFileHost(target.hostname)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const upstream = await fetch(target.toString(), {
    redirect: "follow",
    headers: { Accept: "*/*" },
  });

  if (!upstream.ok) {
    return NextResponse.json({ error: "Failed to fetch file" }, { status: 502 });
  }

  const rawType = upstream.headers.get("content-type");
  const contentType = rawType?.split(";")[0]?.trim() || "application/octet-stream";

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Content-Disposition", "inline");

  const cacheControl = upstream.headers.get("cache-control");
  if (cacheControl) {
    headers.set("Cache-Control", cacheControl);
  }

  if (!upstream.body) {
    const buffer = await upstream.arrayBuffer();
    return new NextResponse(buffer, { status: 200, headers });
  }

  return new NextResponse(upstream.body, { status: 200, headers });
}
