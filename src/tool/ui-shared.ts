import { DEFAULT_STATE, encodeBasicAuth, type Mode, type ToolState } from './types';
export type { ToolState, Mode };

export const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: 'header', label: 'Header', hint: 'Authorization header value' },
  { value: 'curl', label: 'cURL', hint: 'cURL command with the header' },
  { value: 'fetch', label: 'Fetch', hint: 'fetch/XHR header snippet' },
  { value: 'url', label: 'URL', hint: 'URL with embedded credentials' },
  { value: 'decode', label: 'Decode', hint: 'decode a Basic header back to user:pass' },
];

/** Escape credentials for the https://user:pass@host URL form. */
export function encodeURIComponentRFC3986(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, '%20');
}

/** Escape for a shell single-quoted string (single quotes doubled). */
export function shellEscapeSingle(value: string): string {
  return value.replace(/'/g, "'\\''");
}

/** "Basic <base64>" header value from credentials. */
export function basicHeader(username: string, password: string): string {
  return `Basic ${encodeBasicAuth(username, password)}`;
}

/** The user:pass pair encoded to base64. */
export function credentialsBase64(username: string, password: string): string {
  return encodeBasicAuth(username, password);
}

/** URL with embedded credentials, or null when the host is unusable. */
export function credentialedUrl(username: string, password: string, host: string): string | null {
  const trimmed = host.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (!/^https?:$/.test(url.protocol)) return null;
    const base = `${url.protocol}//${url.host}${url.pathname}${url.search}${url.hash}`;
    const u = encodeURIComponentRFC3986(username);
    const p = encodeURIComponentRFC3986(password);
    return `${url.protocol}//${u}:${p}@${url.host}${url.pathname}${url.search}${url.hash}` || base;
  } catch {
    return null;
  }
}

/** Full cURL command with the Authorization header. */
export function curlSnippet(username: string, password: string, host: string): string {
  const header = basicHeader(username, password);
  const target = sanitizeTarget(host);
  return [
    `curl --user '${shellEscapeSingle(username)}:${shellEscapeSingle(password)}' \\`,
    `  --header "Authorization: ${header}" \\`,
    `  ${target}`,
  ].join('\n');
}

/** fetch() snippet including the Authorization header. */
export function fetchSnippet(username: string, password: string, host: string): string {
  const header = basicHeader(username, password).replace(/'/g, "\\'");
  const target = sanitizeTarget(host);
  return [
    `fetch('${target}', {`,
    `  method: 'GET',`,
    `  headers: {`,
    `    Authorization: '${header}',`,
    `  },`,
    `});`,
  ].join('\n');
}

/** Header-only snippet for direct fetch/XHR use. */
export function headerSnippet(username: string, password: string): string {
  return `Authorization: ${basicHeader(username, password)}`;
}

/** Current output text for the active mode, null when inputs are invalid. */
export function resultText(state: ToolState): string | null {
  switch (state.mode) {
    case 'header':
      return state.username || state.password ? basicHeader(state.username, state.password) : null;
    case 'curl':
      return curlSnippet(state.username, state.password, state.host);
    case 'fetch':
      return fetchSnippet(state.username, state.password, state.host);
    case 'url':
      return credentialedUrl(state.username, state.password, state.host);
    case 'decode':
      return null;
  }
}

/** One explanatory line per step for the active mode. */
export function stepsFor(state: ToolState): string[] {
  switch (state.mode) {
    case 'header': {
      if (!state.username && !state.password) {
        return ['Enter a username and password to build the header.'];
      }
      return [
        'Formula: Authorization = Basic base64(username + ":" + password)',
        `Encoded: ${credentialsBase64(state.username, state.password)}`,
        `Header: ${basicHeader(state.username, state.password)}`,
      ];
    }
    case 'curl':
      return [
        'Formula: curl --user user:pass --header "Authorization: Basic <base64>" <url>',
        `URL: ${sanitizeTarget(state.host)}`,
      ];
    case 'fetch':
      return [
        'Formula: fetch(url, { headers: { Authorization: "Basic <base64>" } })',
        `URL: ${sanitizeTarget(state.host)}`,
      ];
    case 'url': {
      const url = credentialedUrl(state.username, state.password, state.host);
      return url
        ? ['Formula: https://user:pass@host/path', `Result: ${url}`]
        : ['Enter a valid http(s) URL to embed credentials.'];
    }
    case 'decode':
      return ['Paste a Basic header or base64 user:pass value to decode.'];
  }
}

/** Compact summary used by the status bar and copy actions (no secrets). */
export function summaryText(state: ToolState): string {
  if (state.mode === 'decode') return 'Decode: paste a Basic header to decode';
  if (state.mode === 'header') {
    return state.username || state.password
      ? `Header: Basic ${credentialsBase64(state.username, state.password)}`
      : 'Header: enter credentials';
  }
  const label = MODES.find((m) => m.value === state.mode)?.label ?? state.mode;
  const url = credentialedUrl(state.username, state.password, state.host);
  return url ? `${label}: ${sanitizeTarget(state.host)}` : `${label}: enter valid inputs`;
}

/** Build a history entry text for the current state. */
export function historyText(state: ToolState): string {
  return summaryText(state);
}

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return typeof v.mode === 'string' && typeof v.username === 'string';
}

/** Safe http(s) target for snippets, with a fallback. */
function sanitizeTarget(host: string): string {
  const trimmed = host.trim() || 'https://example.com';
  try {
    const parsed = new URL(trimmed);
    if (!/^https?:$/.test(parsed.protocol)) return 'https://example.com';
    return parsed.toString();
  } catch {
    return 'https://example.com';
  }
}

export { DEFAULT_STATE };
