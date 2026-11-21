"use server";

import { cookies } from "next/headers";
import { metricsChoiceCookie } from "@/lib/analytics-choice";
import { visitorCookie } from "@/lib/server/activity";

export async function setProductMetrics(form: FormData) {
  const choice = form.get("choice");
  if (choice !== "on" && choice !== "off") return;
  const jar = await cookies();
  const options = { path: "/", sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge: 30 * 86400 };
  if (choice === "on") {
    jar.set(metricsChoiceCookie, "on", options);
    jar.set(visitorCookie, crypto.randomUUID(), { ...options, httpOnly: true });
  } else {
    jar.delete(metricsChoiceCookie);
    jar.delete(visitorCookie);
  }
}
