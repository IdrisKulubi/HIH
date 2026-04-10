import NextAuth, { DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import Spotify from "next-auth/providers/spotify";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import db from "./db/drizzle";
import { applications, users, userProfiles } from "./db/schema";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role?: string;
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      organization?: string;
      profileCompleted?: boolean;
      hasProfile: boolean;
      /** Selected enterprise must finish KYC before using full profile (from live DB each session). */
      kycGate?: { active: boolean; verified: boolean };
    } & DefaultSession["user"];
  }

  interface User {
    kycGate?: { active: boolean; verified: boolean };
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await db
            .select()
            .from(users)
            .where(eq(users.email, (credentials.email as string).toLowerCase()))
            .limit(1);

          if (user.length === 0) {
            return null;
          }

          const foundUser = user[0];

          // Check if user has a password (for email/password auth)
          if (!foundUser.password) {
            return null;
          }

          // Check if email is verified
          if (!foundUser.emailVerified) {
            return null;
          }

          // Verify password
          const isValidPassword = await bcrypt.compare(
            credentials.password as string,
            foundUser.password
          );

          if (!isValidPassword) {
            return null;
          }

          // Update last active
          await db
            .update(users)
            .set({ lastActive: new Date() })
            .where(eq(users.id, foundUser.id));

          return {
            id: foundUser.id,
            email: foundUser.email,
            name: foundUser.name,
            image: foundUser.image,
          };
        } catch (error) {
          console.error("Error during authentication:", error);
          return null;
        }
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    Spotify({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
    }),
  ],
  adapter: DrizzleAdapter(db),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/error",
  },
  callbacks: {
    async jwt({ token, account, user }) {
      const t = token as Record<string, unknown> & { sub?: string; provider?: string };
      if (account && user) {
        t.provider = account.provider;
        t.sub = user.id;
      }
      if (!t.sub) return token;

      try {
        const profile = await db.query.userProfiles.findFirst({
          where: eq(userProfiles.userId, t.sub),
        });
        const role = profile?.role ?? "applicant";
        t.role = role;

        if (role === "applicant") {
          const app = await db.query.applications.findFirst({
            where: eq(applications.userId, t.sub),
          });
          const selected = app && (app.status === "approved" || app.status === "finalist");
          t.kycGateActive = Boolean(selected && app && app.kycStatus !== "verified");
          t.kycVerified = app?.kycStatus === "verified";
        } else {
          t.kycGateActive = false;
          t.kycVerified = false;
        }
      } catch (error) {
        console.error("JWT callback error:", error);
        t.kycGateActive = false;
        t.kycVerified = false;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.email = token.email as string;

        try {
          const profile = await db.query.userProfiles.findFirst({
            where: eq(userProfiles.userId, token.sub)
          });

          session.user.hasProfile = !!profile;
          const tok = token as Record<string, unknown>;
          session.user.role = (tok.role as string) || profile?.role || "applicant";
          session.user.profileCompleted = profile?.isCompleted || false;

          if (profile) {
            session.user.firstName = profile.firstName;
            session.user.lastName = profile.lastName;
            session.user.phoneNumber = profile.phoneNumber || undefined;
            session.user.organization = profile.organization || undefined;
          }

          session.user.kycGate = {
            active: Boolean(tok.kycGateActive),
            verified: Boolean(tok.kycVerified),
          };
        } catch (error) {
          console.error("Session callback error:", error);
          session.user.hasProfile = false;
          session.user.role = "applicant";
          session.user.profileCompleted = false;
          session.user.kycGate = { active: false, verified: false };
        }
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // Allow sign in - profile will be created during application submission
      return true;
    }
  },
});
