# Vesperfold message format, version 1

This document specifies the `vf1.` text package emitted by Vesperfold. It is intended to keep independent implementations interoperable. It does not claim that a ten-digit key is suitable for high-risk information.

## Input

- PIN: exactly ten ASCII decimal digits (`0`–`9`), encoded as those ten UTF-8 bytes. Leading zeroes are significant.
- Message: UTF-8 bytes, at most 1,048,576 bytes. The encryptor preserves the entered Unicode text as encoded by `TextEncoder`; the decryptor rejects plaintext that is not valid UTF-8.

## Algorithms and profile

Profile ID `0x01` means:

- Key derivation: Argon2id version 1.3 through libsodium's `crypto_pwhash` API, with output length 32 bytes, operation limit 2, and memory limit 67,108,864 bytes (64 MiB). The algorithm ID is explicitly `crypto_pwhash_ALG_ARGON2ID13`.
- Argon2 parallelism: one lane (the libsodium `crypto_pwhash` profile); version 1.3 is Argon2's `0x13` version byte.
- Encryption: XChaCha20-Poly1305-IETF through libsodium, with its 24-byte nonce and full 16-byte authentication tag.
- Salt: 16 bytes from libsodium's cryptographic random-number generator.
- Nonce: 24 bytes from libsodium's cryptographic random-number generator.

Each encryption generates a new salt and nonce. The profile parameters are fixed by the profile ID; decoders must reject unknown profiles rather than accepting attacker-selected resource parameters.

## Binary package

After the ASCII prefix `vf1.`, the body is canonical, unpadded base64url (`A–Z`, `a–z`, `0–9`, `-`, `_`) of:

| Offset | Length | Contents |
| --- | ---: | --- |
| 0 | 2 | ASCII `VF` (`0x56 0x46`) |
| 2 | 1 | Format version `0x01` |
| 3 | 1 | KDF profile ID `0x01` |
| 4 | 16 | Random salt |
| 20 | 24 | Random nonce |
| 44 | remaining | XChaCha20-Poly1305 ciphertext followed by its 16-byte tag |

Bytes 0–43 are the header and are passed as AEAD additional authenticated data. The salt is bytes 4–19; the nonce is bytes 20–43. The ciphertext must contain at least the 16-byte tag. A v1 implementation rejects decoded bodies over `44 + 1,048,576 + 16` bytes.

## Encryption

1. Validate the PIN and UTF-8 message length.
2. Generate a new 16-byte salt and 24-byte nonce.
3. Derive the 32-byte key with the fixed Argon2id profile above.
4. Construct the 44-byte header.
5. Encrypt the message with XChaCha20-Poly1305-IETF, using the full header as additional authenticated data.
6. Concatenate header and combined-mode ciphertext/tag, encode as unpadded base64url, and prepend `vf1.`.
7. Erase temporary key and plaintext byte buffers where the runtime permits.

## Decryption

1. Trim outer whitespace; implementations may remove whitespace inside a copied base64url body.
2. Require the `vf1.` prefix, valid base64url, supported format and profile IDs, and the package size bounds above.
3. Derive the key from the entered PIN and package salt using the exact v1 profile.
4. Verify and decrypt using the header as additional authenticated data. Do not expose partial plaintext if authentication fails.
5. Decode authenticated bytes as strict UTF-8.

An invalid authentication tag means either the key is wrong or the package was altered. User interfaces should not distinguish those cases. Structural errors may be reported before key derivation.

## Known-answer example (test data only)

This fixed example is public and must never be used as a real secret. It allows independent implementations to compare their Argon2id, header, AEAD, and base64url results.

- PIN: `0012345678`
- Salt: `000102030405060708090a0b0c0d0e0f`
- Nonce: `000102030405060708090a0b0c0d0e0f1011121314151617`
- Message UTF-8: `Vesperfold protocol check`
- Derived key: `b93b041a15127185eb4603ceeecfa680ba880d4e955e4c4d9a01b41de02ed101`
- Ciphertext and tag: `ff1d071f79f9b514305d12d82fa58a948b1178b9c87b08d935deb441227b95ad6b1a536972a4e6ee43`
- Vesperfold package: `vf1.VkYBAQABAgMEBQYHCAkKCwwNDg8AAQIDBAUGBwgJCgsMDQ4PEBESExQVFhf_HQcfefm1FDBdEtgvpYqUixF4uch7CNk13rRBInuVrWsaU2lypObuQw`

## Security properties and limits

- Authenticated encryption provides confidentiality and tamper detection for holders of the correct derived key. It does not authenticate the sender: anyone with the same PIN can create a valid package.
- The package reveals its approximate message length and format metadata.
- A package enables offline PIN guessing. A random ten-digit PIN has about 33.2 bits of entropy; Argon2id increases the cost per guess but does not increase that entropy.
- Web runtimes cannot promise complete erasure of strings, browser copies, clipboard contents, swap, or crash dumps. Best-effort wiping of byte buffers is not a substitute for a trusted device.
- The static site host delivers the code that sees user input. Running a reviewed local build reduces reliance on the host; it does not protect against malware or a compromised browser.

## Versioning

Do not change the meaning of profile `0x01`, its KDF parameters, AEAD, header, or prefix. A future incompatible format must use a new text prefix and a separately documented version/profile. Parameter ceilings and message-size limits must be validated before resource-intensive operations.
