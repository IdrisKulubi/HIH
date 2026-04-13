import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const path = req.nextUrl.pathname;
  if (path !== "/profile" && path !== "/profile/edit") {
    return NextResponse.next();
  }

  const user = req.auth?.user;
  if (!user?.id) return NextResponse.next();
  if (user.role !== "applicant") return NextResponse.next();

  const gate = user.kycGate;
  if (gate?.active) {
    return NextResponse.redirect(new URL("/kyc", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/profile", "/profile/edit"],
};
