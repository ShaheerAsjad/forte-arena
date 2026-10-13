import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { env } from "@/config/env";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
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
