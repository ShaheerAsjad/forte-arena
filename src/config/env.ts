import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1).optional(),
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  SUPABASE_STORAGE_BUCKET: z.string().default("event-media"),
  ORGANIZER_EMAILS: z.string().default(""),
  APP_TIMEZONE: z.string().default("Asia/Karachi"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;
export type Env = ServerEnv & ClientEnv;

function validateEnv(): Env {
  const isServer = typeof window === "undefined";
  const skipValidation =
    process.env.SKIP_ENV_VALIDATION === "true" ||
    process.env.npm_lifecycle_event === "build";

  const clientResult = clientSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });

  if (!clientResult.success && !skipValidation) {
    console.error("❌ Invalid client environment variables:", clientResult.error.flatten().fieldErrors);
    throw new Error("Invalid client environment variables");
  }

  const clientData = clientResult.success
    ? clientResult.data
    : {
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      };

  if (!isServer) {
    // Return proxy that forbids server keys on the client
    return new Proxy({ ...clientData } as Env, {
      get(target, prop: string) {
        if (!prop.startsWith("NEXT_PUBLIC_")) {
          throw new Error(
            `❌ Attempted to access server environment variable "${prop}" on the client.`
          );
        }
        return Reflect.get(target, prop);
      },
    });
  }

  const serverResult = serverSchema.safeParse(process.env);

  if (!serverResult.success) {
    if (!skipValidation) {
      console.error(
        "❌ Invalid server environment variables:",
        serverResult.error.flatten().fieldErrors
      );
      throw new Error("Invalid server environment variables");
    }
  }

  const serverData = serverResult.success
    ? serverResult.data
    : ({
        DATABASE_URL: process.env.DATABASE_URL || "",
        DIRECT_URL: process.env.DIRECT_URL,
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "",
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
        SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || "event-media",
        ORGANIZER_EMAILS: process.env.ORGANIZER_EMAILS || "",
        APP_TIMEZONE: process.env.APP_TIMEZONE || "Asia/Karachi",
        NODE_ENV: (process.env.NODE_ENV as "development" | "test" | "production") || "development",
      } as ServerEnv);

  return {
    ...serverData,
    ...clientData,
  };
}

export const env: Env = validateEnv();
