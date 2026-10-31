import { supabase } from "./supabase";

const rawApiUrl = (import.meta.env.VITE_API_URL || "")
  .trim()
  .replace(/\/+$/, "");
const isBrowserLocalhost =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
const apiBaseUrl = isBrowserLocalhost
  ? ""
  : rawApiUrl ||
    (import.meta.env.PROD ? "https://edutrack-q07f.onrender.com" : "");

export function apiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiBaseUrl}${cleanPath}`;
}

export class ApiTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`The request timed out after ${timeoutMs} ms.`);
    this.name = "ApiTimeoutError";
  }
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  timeoutMs = 20_000,
): Promise<Response> {
  const controller = new AbortController();
  const externalSignal = init.signal;
  const abortFromCaller = () => controller.abort(externalSignal?.reason);
  if (externalSignal?.aborted) abortFromCaller();
  else
    externalSignal?.addEventListener("abort", abortFromCaller, { once: true });

  let timedOut = false;
  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const sessionResult = await Promise.race([
      supabase.auth.getSession(),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener(
          "abort",
          () =>
            reject(
              timedOut
                ? new ApiTimeoutError(timeoutMs)
                : controller.signal.reason,
            ),
          { once: true },
        );
      }),
    ]);
    const headers = new Headers(init.headers);
    if (
      sessionResult.data.session?.access_token &&
      !headers.has("Authorization")
    ) {
      headers.set(
        "Authorization",
        `Bearer ${sessionResult.data.session.access_token}`,
      );
    }
    return await fetch(apiUrl(path), {
      ...init,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (timedOut) throw new ApiTimeoutError(timeoutMs);
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", abortFromCaller);
  }
}
