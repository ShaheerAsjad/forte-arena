import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { env } from "@/config/env";

const resolvedBaseURL =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
  env.BETTER_AUTH_URL;

const rawOrigins = [
  env.BETTER_AUTH_URL,
  env.NEXT_PUBLIC_APP_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS
    ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",").map((s) => s.trim())
    : []),
].filter(Boolean) as string[];

const trustedOrigins = Array.from(new Set(rawOrigins));

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: resolvedBaseURL,
  trustedOrigins,
  advanced: {
    useSecureCookies: env.NODE_ENV === "production" || process.env.VERCEL === "1",
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "STUDENT",
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const rawEmails = env.ORGANIZER_EMAILS || "";
          const organizerEmails = rawEmails
            .split(",")
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean);

          const email = (user.email || "").trim().toLowerCase();
          const isOrganizer = organizerEmails.includes(email);

          return {
            data: {
              ...user,
              role: isOrganizer ? "ORGANIZER" : "STUDENT",
            },
          };
        },
      },
    },
  },
  plugins: [nextCookies()],
});
