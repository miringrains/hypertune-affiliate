const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0 && process.env.NODE_ENV === "production") {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}`,
  );
}
