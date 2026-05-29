import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { normalizeA2fTypoPath } from "@/lib/a2f-routes";
import { parseA2fStaffPipelinePath } from "@/lib/a2f-nav";

function nextWithPathname(request: Request, pathname: string) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);
    return NextResponse.next({
        request: { headers: requestHeaders },
    });
}

export default auth((req) => {
    const path = req.nextUrl.pathname;
    const role = req.auth?.user?.role;

    const committeeTypoRedirect = normalizeA2fTypoPath(path);
    if (committeeTypoRedirect) {
        const url = req.nextUrl.clone();
        url.pathname = committeeTypoRedirect;
        return NextResponse.redirect(url);
    }

    if (role === "a2f_committee") {
        const pipeline = parseA2fStaffPipelinePath(path);
        if (pipeline) {
            const url = req.nextUrl.clone();
            url.pathname = `/a2f/committee/${pipeline.a2fId}`;
            return NextResponse.redirect(url);
        }
        if (path === "/a2f" || (path.startsWith("/a2f/") && !path.startsWith("/a2f/committee"))) {
            const url = req.nextUrl.clone();
            url.pathname = "/a2f/committee";
            return NextResponse.redirect(url);
        }
    }

    if (path.startsWith("/a2f")) {
        return nextWithPathname(req, path);
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        "/a2f/commitee",
        "/a2f/commitee/:path*",
        "/a2f/:path*",
    ],
};
