/** Same-origin API client. Vite proxies /v1 to FastAPI in development. */
export type ApiErrorDetails = { status: number; message: string };
const csrf = () =>
  document.cookie
    .split("; ")
    .find((c) => c.startsWith("ovael_csrf="))
    ?.split("=")
    .slice(1)
    .join("=") || "";
let refreshing: Promise<boolean> | null = null;
let refreshVersion = 0;
export async function refreshCookie(): Promise<boolean> {
  if (!refreshing)
    refreshing = fetch("/v1/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": decodeURIComponent(csrf()),
      },
      body: "{}",
    })
      .then((r) => {
        if (r.ok) refreshVersion++;
        return r.ok;
      })
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  return refreshing;
}
export async function api(
  path: string,
  method = "GET",
  body?: unknown,
  idempotencyKey?: string,
): Promise<any> {
  const requestVersion = refreshVersion;
  const headers: Record<string, string> = {};
  if (method !== "GET") {
    headers["X-CSRF-Token"] = decodeURIComponent(csrf());
    headers["Idempotency-Key"] = idempotencyKey || crypto.randomUUID();
  }
  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body as BodyInit,
      credentials: "same-origin",
    });
    if (
      response.status === 401 &&
      !/^\/v1\/auth\/(login|register|refresh|logout)$/.test(path) &&
      (requestVersion !== refreshVersion || (await refreshCookie()))
    ) {
      // Retry the same serialized body and idempotency key after cookie rotation.
      if (method !== "GET")
        headers["X-CSRF-Token"] = decodeURIComponent(csrf());
      response = await fetch(path, {
        method,
        headers,
        body: body as BodyInit,
        credentials: "same-origin",
      });
    }
  } catch {
    throw new Error(
      "Connection interrupted. Your response is kept here; reconnect and retry.",
    );
  }
  const raw = await response.text();
  let data: any;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }
  if (!response.ok) {
    const detail = data?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : typeof detail?.message === "string"
          ? detail.message
          : response.status === 401
            ? "Session expired. Please sign in again."
            : response.status === 413
              ? "The uploaded file exceeds the server limit."
              : response.status === 503
                ? "The requested model or extraction engine is unavailable."
                : `${response.status} ${response.statusText}`;
    throw Object.assign(new Error(message), { status: response.status });
  }
  return data;
}
