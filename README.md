# Vesperfold

**Fold a message. Share the key.** Vesperfold is a local-first text sealer: encrypt a note into a portable `vf1.` package, then let someone open it with the exact ten-digit key.

> **Security boundary:** a random ten-digit key has 10 billion possibilities (about 33 bits). Argon2id raises the cost of each guess, but anyone with a copy of a package can try guesses offline. Vesperfold is for casual privacy, not high-risk or long-term secrets. Use a long passphrase or a randomly generated cryptographic key for stronger protection. This project has not had an independent security audit.

## What it does

- Encrypts and decrypts text entirely in the browser. There is no Vesperfold account, message server, analytics, or telemetry.
- Uses Argon2id and XChaCha20-Poly1305 through [libsodium.js](https://github.com/jedisct1/libsodium.js), not a custom cipher.
- Generates a uniformly random ten-digit key with the browser's cryptographic random-number generator; you can also enter your own.
- Produces a versioned, copyable `vf1.` package or a `.vf1` download.
- Detects a wrong key and modifications to the package before showing plaintext.
- Supports UTF-8 text up to 1 MiB per message.
- Keeps the crypto work in a Web Worker so key derivation does not block the interface.

Vesperfold does **not** hide message length, identify the sender, protect a compromised device, stop a recipient from copying plaintext, or protect the key if it is sent alongside the package. Send the package and key through different trusted channels. The page code can access the text and key while you use it; when using a hosted copy, you are trusting the code delivered by that host. For the strongest assurance, review the source and run your own local build.

## Run it locally

Requirements: Node.js 22.12 or newer and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. To create the static production build:

```sh
npm run build
npm run preview
```

The output is in `dist/` and can be hosted on any static host. GitHub Actions is configured to build on pushes and pull requests to `main`, and a Pages workflow publishes the `main` branch after the repository is pushed to GitHub and Pages is set to use GitHub Actions (Settings → Pages → Build and deployment → GitHub Actions).

## Use it

1. Write a note, then choose **Make one** for a fresh random ten-digit key (recommended), or enter exactly ten digits.
2. Seal the message. Copy the `vf1.` package or save the `.vf1` file.
3. Share the package and key through separate channels. The app does not attach the key to the package.
4. The recipient pastes the package into **Open a message**, enters the exact key, and opens it.

Leading zeroes are part of the key. For example, `0012345678` is not the same key as `12345678`.

## Protocol

The v1 wire format and compatibility rules are documented in [`docs/PROTOCOL.md`](docs/PROTOCOL.md). Keep that format stable: future releases must continue to read existing `vf1.` packages or introduce a new prefix and version.

## Open-source status

Vesperfold is released under the MIT License. See [`LICENSE`](LICENSE). Contributions should preserve the protocol and security boundary described in the protocol document. See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`SECURITY.md`](SECURITY.md).

The project name was selected after a basic web search; this is not a trademark or domain-availability check. Before a public launch, choose the public repository URL and review name availability in the markets where you plan to distribute it.

## Release checklist

- [ ] Create a public GitHub repository and push the source.
- [ ] Enable GitHub Actions and confirm the build workflow succeeds.
- [ ] Set Pages to deploy from GitHub Actions if you want a hosted demo.
- [ ] Review the deployed asset bundle and host security headers.
- [ ] Ask an independent cryptography reviewer to review the protocol and implementation before making stronger security claims.
- [ ] Keep the PIN-strength warning visible wherever users create or share a package.
