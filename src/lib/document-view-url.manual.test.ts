import assert from "node:assert/strict";
import { getDocumentViewerHref, isAllowedDocumentFileHost } from "./document-view-url";

assert.equal(isAllowedDocumentFileHost("utfs.io"), true);
assert.equal(isAllowedDocumentFileHost("abc.ufs.sh"), true);
assert.equal(isAllowedDocumentFileHost("localhost"), false);

assert.equal(
  getDocumentViewerHref("https://utfs.io/f/abc.pdf"),
  "/api/document-view?url=" + encodeURIComponent("https://utfs.io/f/abc.pdf")
);
assert.equal(
  getDocumentViewerHref("https://utfs.io/f/abc.jpg"),
  "https://utfs.io/f/abc.jpg"
);
assert.equal(
  getDocumentViewerHref("https://utfs.io/f/no-extension"),
  "https://utfs.io/f/no-extension"
);

console.log("document-view-url.manual.test.ts: all assertions passed");
