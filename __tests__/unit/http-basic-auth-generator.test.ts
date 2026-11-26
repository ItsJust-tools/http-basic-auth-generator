import { describe, it, expect } from 'vitest';
import {
  encodeBasicAuth,
  decodeBasicHeader,
  serializeState,
  DEFAULT_STATE,
  MAX_HISTORY,
  type ToolState,
} from '@/tool/types';
import {
  deserializeState,
  withHistory,
  roundTrips,
  httpBasicAuthGeneratorTool,
} from '@/tool/tool-definition';
import {
  basicHeader,
  credentialsBase64,
  credentialedUrl,
  curlSnippet,
  fetchSnippet,
  headerSnippet,
  encodeURIComponentRFC3986,
  shellEscapeSingle,
  resultText,
  summaryText,
  isState,
} from '@/tool/ui-shared';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

describe('encode', () => {
  it('encodes user:pass to correct base64 in the header', () => {
    expect(encodeBasicAuth('user', 'pass')).toBe('dXNlcjpwYXNz');
    expect(basicHeader('user', 'pass')).toBe('Basic dXNlcjpwYXNz');
    expect(headerSnippet('user', 'pass')).toBe('Authorization: Basic dXNlcjpwYXNz');
    expect(credentialsBase64('admin', 'secret123')).toBe(
      Buffer.from('admin:secret123', 'utf-8').toString('base64')
    );
  });

  it('encodes empty username and empty password', () => {
    expect(encodeBasicAuth('', '')).toBe(Buffer.from(':', 'utf-8').toString('base64'));
    expect(encodeBasicAuth('user', '')).toBe(Buffer.from('user:', 'utf-8').toString('base64'));
    expect(encodeBasicAuth('', 'pass')).toBe(Buffer.from(':pass', 'utf-8').toString('base64'));
  });

  it('handles arbitrary unicode input', () => {
    const pairs: Array<[string, string]> = [
      ['ünïcodé', 'påsswörd'],
      ['user@example.com', 'p@$$w0rd!'],
      ['ユーザー', 'パスワード'],
      ['🙂', '🔑'],
      ['a', 'b:c:d'],
      ['colon', 'in:user:pass:with:colons'],
    ];
    for (const [u, p] of pairs) {
      const expected = Buffer.from(`${u}:${p}`, 'utf-8').toString('base64');
      expect(encodeBasicAuth(u, p)).toBe(expected);
      const decoded = decodeBasicHeader(expected);
      expect(decoded.ok).toBe(true);
      if (decoded.ok) {
        expect(decoded.username).toBe(u);
        expect(decoded.password).toBe(p);
      }
    }
  });

  it('rejects password with colon round-trip ambiguity only across the first separator', () => {
    const decoded = decodeBasicHeader(encodeBasicAuth('u', 'p:q:r'));
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.username).toBe('u');
      expect(decoded.password).toBe('p:q:r');
    }
  });
});

describe('decode', () => {
  it('decodes with and without the Basic prefix', () => {
    expect(decodeBasicHeader('Basic dXNlcjpwYXNz')).toEqual({
      ok: true,
      encoded: 'dXNlcjpwYXNz',
      decoded: 'user:pass',
      username: 'user',
      password: 'pass',
    });
    expect(decodeBasicHeader('BASIC dXNlcjpwYXNz').ok).toBe(true);
    expect(decodeBasicHeader('dXNlcjpwYXNz').ok).toBe(true);
    expect(decodeBasicHeader('  dXNlcjpwYXNz  ').ok).toBe(true);
  });

  it('reverses encode for unicode input', () => {
    const encoded = encodeBasicAuth('ünïcodé', 'テスト');
    const decoded = decodeBasicHeader(encoded);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.decoded).toBe('ünïcodé:テスト');
  });

  it('rejects invalid input', () => {
    expect(decodeBasicHeader('').ok).toBe(false);
    expect(decodeBasicHeader('   ').ok).toBe(false);
    expect(decodeBasicHeader('not base64!!').ok).toBe(false);
    expect(decodeBasicHeader(Buffer.from('nocolon').toString('base64')).ok).toBe(false);
    const wrong = decodeBasicHeader('!!!');
    if (!wrong.ok) expect(wrong.error).toBeTruthy();
  });
});

describe('snippets', () => {
  it('cURL snippet contains the correct header string', () => {
    const snippet = curlSnippet('user', 'pass', 'https://example.com/api');
    expect(snippet).toContain('Authorization: Basic dXNlcjpwYXNz');
    expect(snippet).toContain("--user 'user:pass'");
    expect(snippet).toContain('https://example.com/');
  });

  it('cURL escapes single quotes in credentials', () => {
    const snippet = curlSnippet("o'brien", "it's", 'https://example.com');
    expect(snippet).toContain("'o'\\''brien:it'\\''s'");
  });

  it('fetch snippet contains the correct header string', () => {
    const snippet = fetchSnippet('user', 'pass', 'https://example.com');
    expect(snippet).toContain("Authorization: 'Basic dXNlcjpwYXNz'");
    expect(snippet).toContain("fetch('https://example.com/'");
  });

  it('URL-form credentials are escaped correctly', () => {
    expect(credentialedUrl('user', 'pass', 'https://example.com')).toBe(
      'https://user:pass@example.com/'
    );
    expect(credentialedUrl('user@x', 'p/w d', 'https://example.com')).toBe(
      'https://user%40x:p%2Fw%20d@example.com/'
    );
    expect(credentialedUrl('u', "p!'()*d", 'https://example.com')).toBe(
      'https://u:p%21%27%28%29%2Ad@example.com/'
    );
    expect(credentialedUrl('u', 'ünï', 'https://example.com')).toBe(
      'https://u:%C3%BCn%C3%AF@example.com/'
    );
  });

  it('URL rejects invalid hosts', () => {
    expect(credentialedUrl('u', 'p', 'not a url')).toBeNull();
    expect(credentialedUrl('u', 'p', '')).toBeNull();
    expect(credentialedUrl('u', 'p', 'ftp://example.com')).toBeNull();
  });
});

describe('state transitions', () => {
  it('mode switches preserve credentials', () => {
    const s = state({ username: 'u', password: 'p', mode: 'header' });
    const next = { ...s, mode: 'curl' as const };
    expect(next.username).toBe('u');
    expect(next.password).toBe('p');
    expect(resultText(next)).toContain('curl');
  });

  it('show/hide toggle does not leak password into shared state', () => {
    const s = state({ username: 'u', password: 'topsecret', showPassword: true });
    const shared = JSON.parse(serializeState(s));
    expect(JSON.stringify(shared)).not.toContain('topsecret');
    expect(shared.password).toBeUndefined();
    expect(shared.showPassword).toBeUndefined();
  });

  it('full state serialization drops password', () => {
    const s = state({ username: 'u', password: 'hunter2' });
    const serialized = serializeState(s);
    expect(serialized).not.toContain('hunter2');
    const restored = deserializeState(JSON.parse(serialized));
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data.password).toBe('');
      expect(restored.data.username).toBe('u');
      expect(restored.data.showPassword).toBe(false);
    }
  });

  it('round-trips the shareable subset', () => {
    const s = state({ username: 'u', host: 'https://x.com', decodeInput: 'abc' });
    expect(roundTrips(s)).toBe(true);
  });

  it('history is capped at MAX_HISTORY and newest first', () => {
    let s = state();
    for (let i = 0; i < MAX_HISTORY + 5; i++) {
      s = withHistory(s, `out-${i}`, new Date(2026, 0, 1, 0, 0, i));
    }
    expect(s.history).toHaveLength(MAX_HISTORY);
    expect(s.history[0]?.text).toBe('out-24');
  });

  it('deserialize rejects non-object payloads', () => {
    expect(deserializeState('nope').success).toBe(false);
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState([]).success).toBe(false);
    expect(deserializeState(42).success).toBe(false);
  });

  it('deserialize repairs unknown modes and missing fields', () => {
    const result = deserializeState({ mode: 'bogus' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mode).toBe('header');
      expect(result.data.password).toBe('');
      expect(result.data.showPassword).toBe(false);
    }
  });

  it('deserialize never restores a password from a payload', () => {
    const result = deserializeState({ username: 'u', password: 'leak', showPassword: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.password).toBe('');
      expect(result.data.showPassword).toBe(false);
    }
  });
});

describe('tool registration', () => {
  it('wires config, serialize and deserialize', () => {
    expect(httpBasicAuthGeneratorTool.id).toBe('http-basic-auth-generator');
    expect(httpBasicAuthGeneratorTool.initialState.password).toBe('');
    const s = state({ username: 'u', password: 'p' });
    const serialized = httpBasicAuthGeneratorTool.serialize(s);
    expect(serialized).not.toContain('"p"');
    const restored = httpBasicAuthGeneratorTool.deserialize(JSON.parse(serialized));
    expect(restored.success).toBe(true);
  });
});

describe('helpers', () => {
  it('escapes RFC3986 reserved characters', () => {
    expect(encodeURIComponentRFC3986("!'()*")).toBe('%21%27%28%29%2A');
    expect(encodeURIComponentRFC3986('a b')).toBe('a%20b');
  });

  it('escapes single quotes for shell', () => {
    expect(shellEscapeSingle("it's")).toBe("it'\\''s");
    expect(shellEscapeSingle('plain')).toBe('plain');
  });

  it('summarizes without leaking password', () => {
    const s = state({ username: 'u', password: 'sekret', mode: 'header' });
    const summary = summaryText(s);
    expect(summary).not.toContain('sekret');
    expect(summary).toContain('dTpzZWtyZXQ=');
  });

  it('isState accepts valid shapes', () => {
    expect(isState(state())).toBe(true);
    expect(isState({ mode: 'header' })).toBe(false);
    expect(isState(null)).toBe(false);
  });

  it('curl target falls back for invalid host', () => {
    expect(curlSnippet('u', 'p', 'garbage')).toContain('https://example.com');
    expect(fetchSnippet('u', 'p', '')).toContain('https://example.com');
  });

  it('resultText returns null for header with no credentials', () => {
    expect(resultText(state({ mode: 'header' }))).toBeNull();
    expect(resultText(state({ mode: 'header', username: 'u' }))).toBe('Basic dTo=');
  });
});
