# HTTP Basic Auth Generator

Generate HTTP Basic Authentication header strings and URLs from a username and password, with base64 encoding, cURL and fetch snippets, and a decoder for existing Basic headers.

**Live:** [http-basic-auth-generator.itsjust.tools](https://http-basic-auth-generator.itsjust.tools)

## Features

- `Authorization: Basic <base64>` header output from any username/password (UTF-8 safe)
- cURL command snippet including the Authorization header
- fetch/XHR header snippet output
- URL with embedded credentials (`https://user:pass@host` form), percent-escaped per RFC 3986
- Decode an existing Basic header or base64 string back to `user:pass`
- Show/hide password toggle
- Copy-to-clipboard per output block
- Shareable state via URL, `.itsjust.json` import/export and image/PDF export
- The password is **never** included in share URLs or exported files
- 100% client-side — no data ever leaves your browser

## Keyboard shortcuts

| Key | Action               |
| --- | -------------------- |
| `H` | Header output        |
| `U` | cURL snippet         |
| `F` | Fetch snippet        |
| `W` | URL with credentials |
| `D` | Decode mode          |
| `Y` | Copy output          |

## Development

```bash
npm install
npm run build -w @itsjust/core   # build shared core first
npm run dev
npm test
```

## Deployment

```bash
docker build -t itsjust-http-basic-auth-generator .
docker run -p 3000:3000 itsjust-http-basic-auth-generator
```

## License

MIT
