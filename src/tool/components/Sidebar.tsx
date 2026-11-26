'use client';

import React from 'react';
import { MODES, type ToolState } from '../ui-shared';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state }) => {
  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="auth-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Output modes</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          {MODES.map((mode) => (
            <li key={mode.value} className="flex justify-between gap-2">
              <span>{mode.label}</span>
              <span className="text-gray-500 dark:text-gray-400">{mode.hint}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Saved outputs</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-history-count">
          {state.history.length} entr{state.history.length === 1 ? 'y' : 'ies'} in history
          {state.history.length > 0 ? ' (newest first)' : ''}
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Keyboard shortcuts</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>
            <kbd>H</kbd> — Header output
          </li>
          <li>
            <kbd>U</kbd> — cURL snippet
          </li>
          <li>
            <kbd>F</kbd> — Fetch snippet
          </li>
          <li>
            <kbd>W</kbd> — URL with credentials
          </li>
          <li>
            <kbd>D</kbd> — Decode mode
          </li>
          <li>
            <kbd>Y</kbd> — Copy output
          </li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Privacy</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          The password is never included in share URLs or exported files. Shared links restore the
          username, host and history only; re-enter the password after opening a shared link.
        </p>
      </div>
    </div>
  );
};
