# Security policy

Vesperfold is a small, unaudited open-source project. Its ten-digit PIN format is vulnerable to offline guessing and is not recommended for high-risk secrets.

## Reporting a vulnerability

Please report suspected security issues through GitHub's **Report a vulnerability** feature (private vulnerability reporting / Security Advisories) for the repository where you found the code. Do not include plaintext, a live PIN, or a real encrypted package in a public issue.

If private reporting is unavailable, open a minimal public issue that asks maintainers to establish a private contact channel without publishing exploit details.

## Scope

Reports about cryptographic implementation, package parsing, accidental network transmission, unsafe deployment headers, or dependency compromise are in scope. The expected security boundaries and limitations are documented in [`README.md`](README.md) and [`docs/PROTOCOL.md`](docs/PROTOCOL.md).
