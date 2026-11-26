export type Mode = 'header' | 'curl' | 'fetch' | 'url' | 'decode';

export interface HistoryEntry {
  /** Short human readable description of the output. */
  text: string;
  /** ISO timestamp when the entry was saved. */
  createdAt: string;
}

export interface ToolState {
  /** Active output mode. */
  mode: Mode;
  /** Username. */
  username: string;
  /** Password. NEVER serialized — share/import flows drop it deliberately. */
  password: string;
  /** Whether the password is currently visible in the UI. Not serialized. */
  showPassword: boolean;
  /** URL host used by the URL-with-credentials and cURL/fetch snippets. */
  host: string;
  /** Existing Basic header payload for decode mode (base64 section). */
  decodeInput: string;
  /** Saved outputs, newest first. */
  history: HistoryEntry[];
}

export const DEFAULT_STATE: ToolState = {
  mode: 'header',
  username: '',
  password: '',
  showPassword: false,
  host: 'https://example.com',
  decodeInput: '',
  history: [],
};

export const MAX_HISTORY = 20;

export const SHARED_STATE_KEYS = ['mode', 'username', 'host', 'decodeInput', 'history'] as const;

/**
 * Serialize tool state for a shareable URL.
 * The password (and password visibility) are intentionally NOT persisted so a
 * shared URL can never leak the secret.
 */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    mode: state.mode,
    username: state.username,
    host: state.host,
    decodeInput: state.decodeInput,
    history: state.history,
  });
}

export type DecodeResult =
  | { ok: true; encoded: string; decoded: string; username: string; password: string }
  | { ok: false; error: string };

export function decodeBasicHeader(input: string): DecodeResult {
  const cleaned = input
    .trim()
    .replace(/^basic\s+/i, '')
    .replace(/\s+/g, '');
  if (!cleaned) return { ok: false, error: 'Enter a Basic header or base64 string to decode.' };
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
    return { ok: false, error: 'Invalid base64 input.' };
  }
  try {
    const decoded = atob(cleaned);
    // atob yields a binary string; decode UTF-8 when possible.
    const utf8 = toUtf8(decoded);
    const sep = utf8.indexOf(':');
    if (sep < 0) {
      return { ok: false, error: 'Decoded value has no ":" separator (not user:pass).' };
    }
    const username = utf8.slice(0, sep);
    const password = utf8.slice(sep + 1);
    return { ok: true, encoded: cleaned, decoded: utf8, username, password };
  } catch {
    return { ok: false, error: 'Invalid base64 input.' };
  }
}

/** Convert atob's binary string to proper UTF-8 text. */
function toUtf8(binary: string): string {
  try {
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return binary;
  }
}

/** UTF-8 safe base64 (standard btoa throws on non-Latin1 characters). */
export function encodeBasicAuth(username: string, password: string): string {
  const credentials = `${username}:${password}`;
  const bytes = new TextEncoder().encode(credentials);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
