import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_STATE,
  serializeState,
  decodeBasicHeader,
  type Mode,
  type ToolState,
} from './types';
import {
  basicHeader,
  curlSnippet,
  fetchSnippet,
  credentialedUrl,
  headerSnippet,
} from './ui-shared';

const VALID_MODES: Mode[] = ['header', 'curl', 'fetch', 'url', 'decode'];

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function validHistory(value: unknown): ToolState['history'] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is ToolState['history'][number] =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as { text?: unknown }).text === 'string' &&
        typeof (entry as { createdAt?: unknown }).createdAt === 'string'
    )
    .slice(0, 20)
    .map((entry) => ({ text: entry.text, createdAt: entry.createdAt }));
}

/**
 * Validate and recover tool state from an arbitrary payload.
 * Password and showPassword are never deserialized — they must be absent.
 */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected HTTP Basic Auth Generator state object',
    };
  }
  const v = data as Record<string, unknown>;
  const mode: Mode = VALID_MODES.includes(v.mode as Mode) ? (v.mode as Mode) : DEFAULT_STATE.mode;
  const state: ToolState = {
    mode,
    username: stringOr(v.username, ''),
    password: '', // never restored from serialized data
    showPassword: false,
    host: stringOr(v.host, DEFAULT_STATE.host),
    decodeInput: stringOr(v.decodeInput, ''),
    history: validHistory(v.history),
  };
  return { success: true, data: state };
}

/** Append a history entry to state, capped at 20, newest first. */
export function withHistory(state: ToolState, text: string, now = new Date()): ToolState {
  const entry = { text, createdAt: now.toISOString() };
  return { ...state, history: [entry, ...state.history].slice(0, 20) };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

export const httpBasicAuthGeneratorTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};

export {
  basicHeader,
  curlSnippet,
  fetchSnippet,
  credentialedUrl,
  headerSnippet,
  decodeBasicHeader,
};
