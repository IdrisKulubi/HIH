import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import db from "../../db/drizzle";
import { users, sessions, accounts, verifications, userProfiles } from "../../db/schema";
import { eq } from "drizzle-orm";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            user: users,
            session: sessions,
            account: accounts,
            verification: verifications
        },
    }),
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
        spotify: {
            clientId: process.env.SPOTIFY_CLIENT_ID!,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
        }
    },
    user: {
        additionalFields: {
            role: { type: "string", required: false, defaultValue: "user" },
        }
    },
    callbacks: {
        async session({ session, user }: { session: any; user: { id: string } }) {
            const profile = await db.query.userProfiles.findFirst({
                where: eq(userProfiles.userId, user.id)
            });
            return {
                ...session,
                user: {
                    ...session.user,
                    role: profile?.role || "applicant",
                    hasProfile: !!profile,
                    profileCompleted: profile?.isCompleted || false
                }
            }
        }
    }
});
