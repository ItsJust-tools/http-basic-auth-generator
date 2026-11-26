import type { ToolConfig } from '@itsjust/core';

const toolConfig = {
  id: 'http-basic-auth-generator',
  name: 'HTTP Basic Auth Generator',
  description:
    'Generate HTTP Basic Authentication header strings and URLs from username and password, with base64 encoding and cURL snippet output.',
  version: '1.0.0',
  exportFormats: ['json', 'png', 'jpeg', 'webp', 'pdf'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: false,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#0ea5e9',
    accentHover: '#0284c7',
    accentSubtle: 'rgba(14, 165, 233, 0.12)',
    brand: 'HTTP Basic Auth Generator',
    icon: '🔐',
  },
  shortcuts: [
    {
      title: 'HTTP Basic Auth Generator',
      shortcuts: [
        { keys: 'H', label: 'Header', description: 'switch to header output mode' },
        { keys: 'U', label: 'cURL', description: 'switch to cURL snippet mode' },
        { keys: 'F', label: 'Fetch', description: 'switch to fetch/XHR snippet mode' },
        { keys: 'W', label: 'URL', description: 'switch to URL-with-credentials mode' },
        { keys: 'D', label: 'Decode', description: 'switch to decode mode' },
        {
          keys: 'Y',
          label: 'Copy output',
          description: 'copy the current output to the clipboard',
        },
      ],
    },
  ],
} satisfies ToolConfig;

export default toolConfig;
