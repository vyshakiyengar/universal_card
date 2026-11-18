import "server-only";

export function isSameOriginForm(headers: Headers, appOrigin: string): boolean {
  const origin = headers.get("origin");
  if (origin !== null && origin !== "null") return origin === appOrigin;

  // no-referrer can suppress Origin on navigations. Fetch Metadata still
  // tells us whether the browser started the form on this exact origin.
  return headers.get("sec-fetch-site") === "same-origin";
}
