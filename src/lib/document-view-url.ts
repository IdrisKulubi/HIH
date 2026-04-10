const OFFICE_ONLINE_VIEW = "https://view.officeapps.live.com/op/view.aspx";

function fileExtension(fileNameOrUrl: string): string {
  if (!fileNameOrUrl) return "";
  try {
    const pathPart = fileNameOrUrl.includes("://") ? new URL(fileNameOrUrl).pathname : fileNameOrUrl;
    const base = pathPart.split("/").pop() ?? "";
    const i = base.lastIndexOf(".");
    if (i === -1) return "";
    return base.slice(i + 1).toLowerCase().replace(/[^a-z0-9]/g, "");
  } catch {
    const m = fileNameOrUrl.match(/\.([a-z0-9]+)(?:\?|#|$)/i);
    return m ? m[1].toLowerCase() : "";
  }
}

const INLINE_IMAGE_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

/**
 * URL to open in a new tab for viewing: avoids UploadThing/CDN attachment downloads where possible.
 * — PDF: proxied with Content-Disposition: inline
 * — DOC/DOCX: Microsoft Office Online viewer (public file URL required)
 * — Images: direct URL (usually displays in-tab)
 */
export function getDocumentViewerHref(fileUrl: string, fileName = ""): string {
  if (!fileUrl?.trim()) return fileUrl;

  const ext = fileExtension(fileName) || fileExtension(fileUrl);

  if (INLINE_IMAGE_EXT.has(ext)) {
    return fileUrl;
  }

  if (ext === "pdf") {
    return `/api/document-view?url=${encodeURIComponent(fileUrl)}`;
  }

  if (ext === "doc" || ext === "docx") {
    try {
      const u = new URL(fileUrl);
      if (u.protocol === "https:" || u.protocol === "http:") {
        return `${OFFICE_ONLINE_VIEW}?src=${encodeURIComponent(u.toString())}`;
      }
    } catch {
      /* fall through */
    }
  }

  return `/api/document-view?url=${encodeURIComponent(fileUrl)}`;
}
