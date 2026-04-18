/**
 * URL validator for holder-deployed agent endpoints.
 *
 * Guards against:
 *   - Non-https scheme (http, file:, javascript:, data:, etc.)
 *   - Embedded credentials (user:pass@host)
 *   - Localhost / loopback / private RFC1918 / link-local / ULA hostnames
 *     (classic SSRF targets even from browser-originated fetches when the
 *     endpoint URL is later consumed server-side, e.g. in OG generation).
 *   - Excessive length (>2048 chars).
 *
 * Called both client-side (instant UX feedback) and server-side (before
 * any ping/proxy logic) — the rules must stay pure and framework-free.
 */

export type EndpointValidation =
  | { ok: true; url: URL }
  | { ok: false; reason: string };

const MAX_URL_LENGTH = 2048;

const PRIVATE_HOSTNAME_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /\.localhost$/i,
  /^127(?:\.\d{1,3}){3}$/,
  /^10(?:\.\d{1,3}){3}$/,
  /^192\.168(?:\.\d{1,3}){2}$/,
  /^172\.(1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}$/,
  /^169\.254(?:\.\d{1,3}){2}$/,
  /^::1$/,
  /^fe80:/i,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
  /^0\.0\.0\.0$/,
];

export function validateEndpointUrl(raw: string): EndpointValidation {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: "Empty URL" };
  if (trimmed.length > MAX_URL_LENGTH) {
    return { ok: false, reason: "URL too long (>2048 chars)" };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, reason: "Not a valid URL" };
  }

  if (url.protocol !== "https:") {
    return { ok: false, reason: "Only https:// is allowed" };
  }

  if (url.username || url.password) {
    return {
      ok: false,
      reason: "URL must not embed credentials (user:pass@…)",
    };
  }

  // Strip IPv6 brackets for pattern matching.
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host) return { ok: false, reason: "Missing hostname" };

  for (const pattern of PRIVATE_HOSTNAME_PATTERNS) {
    if (pattern.test(host)) {
      return {
        ok: false,
        reason: "Private/loopback hostnames are not allowed",
      };
    }
  }

  return { ok: true, url };
}
