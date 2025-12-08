import { NextRequest, NextResponse } from "next/server";
import { verifyCodeAndCreateAccount } from "@/lib/actions/email-verification";

export async function POST(req: NextRequest) {
  try {
    const { email, code, password, name } = await req.json();

    if (!email || !code || !password || !name) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      );
    }

    const result = await verifyCodeAndCreateAccount({
      email,
      code,
      password,
      name,
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    console.error("Error in verify-code API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
} 