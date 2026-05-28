/** Reserved under `/a2f/[id]` — not numeric pipeline IDs. */
export const A2F_RESERVED_SEGMENTS = new Set(["committee", "commitee"]);

export function isA2fCommitteePathSegment(id: string): boolean {
    return id === "committee" || id === "commitee";
}

export function parseA2fPipelineId(id: string): number | null {
    if (A2F_RESERVED_SEGMENTS.has(id)) return null;
    if (!/^\d+$/.test(id)) return null;
    const n = Number(id);
    return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export function normalizeA2fTypoPath(pathname: string): string | null {
    if (pathname === "/a2f/commitee" || pathname.startsWith("/a2f/commitee/")) {
        return pathname.replace(/^\/a2f\/commitee/, "/a2f/committee");
    }
    return null;
}
