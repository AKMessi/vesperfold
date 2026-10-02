# Contributing to Vesperfold

Thanks for helping improve Vesperfold. The first priority is keeping the protocol small, reviewable, and compatible.

## Before changing cryptographic behavior

- Read [`docs/PROTOCOL.md`](docs/PROTOCOL.md).
- Do not add a cipher, key derivation function, custom encoding, or cryptographic primitive written for this project.
- Do not change the meaning of `vf1.` or profile `0x01`. Propose a new versioned format for incompatible changes.
- Keep key derivation parameters fixed and allowlisted. Never accept arbitrary memory or iteration counts from a package.
- Keep message and PIN handling local; do not add telemetry, analytics, remote logging, or server-side processing.
- Describe security claims and limitations plainly in the README and interface.

## Development

```sh
npm ci
npm run dev
npm run build
```

Please describe the user impact, protocol impact, and how you checked the change in pull requests. Avoid including real messages, PINs, or private package contents in issue reports.
