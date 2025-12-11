import { auth as betterAuth } from "@/lib/auth";
import { headers } from "next/headers";

// Compatibility wrapper for NextAuth auth() function
export const auth = async () => {
  return await betterAuth.api.getSession({
    headers: await headers()
  });
};

export const handlers = {
  GET: () => { },
  POST: () => { }
};

// These are placeholders/wrappers. 
// Server Actions should migrate to specific Better Auth API calls if possible.
export const signIn = betterAuth.api.signInSocial;
export const signOut = betterAuth.api.signOut;
