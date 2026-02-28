const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;

const runtimeOnly = [
  "MAILGUN_API_KEY",
  "MAILGUN_DOMAIN",
  "MAILGUN_FROM",
] as const;

if (process.env.NODE_ENV === "production") {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  const missingRuntime = runtimeOnly.filter((key) => !process.env[key]);
  if (missingRuntime.length > 0) {
    console.warn(
      `[env] Missing runtime environment variables (emails will not send): ${missingRuntime.join(", ")}`,
    );
  }
}
