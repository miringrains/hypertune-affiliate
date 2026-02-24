import { COOKIE_NAME, COOKIE_MAX_AGE } from "./constants";

export function getTrackingCookieOptions() {
  return {
    name: COOKIE_NAME,
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}
