'use client';

import React from 'react';
import { decodeBasicHeader, type ToolState } from '../types';
import {
  MODES,
  basicHeader,
  credentialsBase64,
  headerSnippet,
  curlSnippet,
  fetchSnippet,
  credentialedUrl,
  resultText,
  stepsFor,
} from '../ui-shared';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

const fieldClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

function CopyButton({ value, testid }: { value: string; testid?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid={testid}
      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Copy value"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveHistory }) => {
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });

  const output = resultText(state);
  const steps = stepsFor(state);
  const decode = state.mode === 'decode' ? decodeBasicHeader(state.decodeInput) : null;
  const hasCredentials = state.username.length > 0 || state.password.length > 0;

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full" data-testid="auth-canvas">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Output mode"
        data-testid="mode-tabs"
      >
        {MODES.map((mode) => (
          <button
            key={mode.value}
            type="button"
            role="tab"
            aria-selected={state.mode === mode.value}
            data-testid={`mode-tab-${mode.value}`}
            title={mode.hint}
            onClick={() => onChange?.({ ...state, mode: mode.value })}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
              state.mode === mode.value
                ? 'border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-900/40 dark:text-sky-100'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {state.mode !== 'decode' ? (
        <div className="grid gap-4 sm:grid-cols-2" data-testid="credential-inputs">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Username
            <input
              type="text"
              value={state.username}
              autoComplete="off"
              onChange={(e) => update({ username: e.target.value })}
              data-testid="input-username"
              className={fieldClass}
            />
          </label>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Password
            <span className="flex gap-2">
              <input
                type={state.showPassword ? 'text' : 'password'}
                value={state.password}
                autoComplete="new-password"
                onChange={(e) => update({ password: e.target.value })}
                data-testid="input-password"
                className={`${fieldClass} flex-1`}
              />
              <button
                type="button"
                onClick={() => update({ showPassword: !state.showPassword })}
                data-testid="btn-toggle-password"
                aria-label={state.showPassword ? 'Hide password' : 'Show password'}
                className="mt-1 rounded-md border border-gray-300 px-2 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {state.showPassword ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 sm:col-span-2">
            URL / host
            <input
              type="text"
              value={state.host}
              onChange={(e) => update({ host: e.target.value })}
              data-testid="input-host"
              className={fieldClass}
            />
          </label>
        </div>
      ) : (
        <div data-testid="decode-inputs">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Basic header or base64 string
            <input
              type="text"
              value={state.decodeInput}
              onChange={(e) => update({ decodeInput: e.target.value })}
              placeholder="Basic dXNlcjpwYXNz"
              data-testid="input-decode"
              className={fieldClass}
            />
          </label>
        </div>
      )}

      {state.mode === 'decode' ? (
        <div
          className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900"
          data-testid="decode-card"
          role="status"
        >
          <span className="mb-1 block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Decoded credentials
          </span>
          {decode?.ok ? (
            <>
              <span className="block font-mono text-lg font-bold" data-testid="decode-result">
                {decode.decoded}
              </span>
              <CopyButton value={decode.decoded} testid="copy-decode" />
            </>
          ) : (
            <span
              className="block text-sm text-red-600 dark:text-red-400"
              data-testid="decode-error"
            >
              {decode?.error ?? 'Enter a Basic header or base64 string to decode.'}
            </span>
          )}
        </div>
      ) : (
        <div
          className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900"
          data-testid="result-card"
          role="status"
        >
          <span className="mb-1 block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Output
          </span>
          <span className="flex items-center justify-center gap-2">
            <span className="block font-mono break-all" data-testid="result-main">
              {output ?? '—'}
            </span>
            {output ? <CopyButton value={output} testid="copy-result" /> : null}
          </span>
          <span
            className="mt-2 block text-xs text-gray-600 dark:text-gray-300"
            data-testid="result-summary"
          >
            {output
              ? 'Copy the output or save it below.'
              : 'Enter credentials to generate the output.'}
          </span>
          {output ? (
            <button
              type="button"
              data-testid="btn-save-history"
              onClick={() => onSaveHistory?.(output)}
              className="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Save to history
            </button>
          ) : null}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          How it works
        </h3>
        <ol className="space-y-1 text-xs text-gray-700 dark:text-gray-300" data-testid="steps-list">
          {steps.map((step, i) => (
            <li key={i} className="font-mono break-all">
              {step}
            </li>
          ))}
        </ol>
        {hasCredentials && state.mode === 'header' ? (
          <p className="mt-2 font-mono break-all text-xs text-gray-500" data-testid="base64-line">
            base64: {credentialsBase64(state.username, state.password)}
          </p>
        ) : null}
      </div>

      {state.mode === 'header' && hasCredentials ? (
        <p
          className="text-center text-xs text-gray-500 dark:text-gray-400"
          data-testid="header-hint"
        >
          {headerSnippet(state.username, state.password)}
        </p>
      ) : null}

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          History
        </h3>
        {state.history.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="history-empty">
            No saved outputs yet.
          </p>
        ) : (
          <ul className="space-y-1" data-testid="history-list">
            {state.history.map((entry, i) => (
              <li
                key={`${entry.createdAt}-${i}`}
                className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs dark:border-gray-800"
              >
                <span className="font-mono text-gray-700 dark:text-gray-300 break-all">
                  {entry.text}
                </span>
                <CopyButton value={entry.text} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        Everything runs locally in your browser. Your password is never sent, stored server-side, or
        included in share URLs.
      </p>
    </div>
  );
};

export { basicHeader, curlSnippet, fetchSnippet, credentialedUrl };
