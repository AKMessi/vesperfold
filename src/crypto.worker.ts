import sodium from 'libsodium-wrappers-sumo';

const PREFIX = 'vf1.';
const MAGIC = new Uint8Array([0x56, 0x46, 0x01, 0x01]);
const HEADER_BYTES = 44;
const KEY_BYTES = 32;
const MAX_MESSAGE_BYTES = 1_048_576;
const MAX_ENVELOPE_BYTES = HEADER_BYTES + MAX_MESSAGE_BYTES + 16;
const MAX_INPUT_LENGTH = Math.ceil((MAX_ENVELOPE_BYTES * 4) / 3) + PREFIX.length + 4096;
const PROFILE = {
  id: 1,
  opsLimit: 2,
  memLimit: 64 * 1024 * 1024,
} as const;

type Request =
  | { id: number; action: 'encrypt'; message: string; pin: string }
  | { id: number; action: 'decrypt'; envelope: string; pin: string };

type Response =
  | { id: number; type: 'status'; message: string }
  | { id: number; type: 'success'; result: string }
  | { id: number; type: 'failure'; message: string };

const worker = self as unknown as DedicatedWorkerGlobalScope;

function post(response: Response) {
  worker.postMessage(response);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((length, part) => length + part.length, 0);
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }
  return joined;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error('That package does not look like a Vesperfold message.');
  }
  const standard = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = standard + '='.repeat((4 - (standard.length % 4)) % 4);
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new Error('That package is malformed or incomplete.');
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  if (bytesToBase64Url(bytes) !== value) {
    throw new Error('That package is not in canonical base64url form.');
  }
  return bytes;
}

function buildHeader(salt: Uint8Array, nonce: Uint8Array): Uint8Array {
  return concat(MAGIC, salt, nonce);
}

function parseEnvelope(source: string) {
  if (source.length > MAX_INPUT_LENGTH) {
    throw new Error('The package is larger than the 1 MiB text limit.');
  }
  const normalized = source.trim().replace(/\s+/g, '');
  if (!normalized.startsWith(PREFIX)) {
    throw new Error('Paste a Vesperfold package beginning with “vf1.”');
  }

  const encoded = normalized.slice(PREFIX.length);
  const maxEncodedLength = Math.ceil((MAX_ENVELOPE_BYTES * 4) / 3);
  if (!encoded || encoded.length > maxEncodedLength) {
    throw new Error('The package is empty or larger than the 1 MiB text limit.');
  }

  const bytes = base64UrlToBytes(encoded);
  if (bytes.length < HEADER_BYTES + 16 || bytes.length > MAX_ENVELOPE_BYTES) {
    throw new Error('The package is incomplete or larger than the 1 MiB text limit.');
  }
  if (bytes[0] !== MAGIC[0] || bytes[1] !== MAGIC[1] || bytes[2] !== MAGIC[2]) {
    throw new Error('This package uses a Vesperfold version this app does not recognize.');
  }
  if (bytes[3] !== PROFILE.id) {
    throw new Error('This package uses an encryption profile this app does not recognize.');
  }

  const header = bytes.slice(0, HEADER_BYTES);
  const salt = header.slice(4, 20);
  const nonce = header.slice(20, 44);
  const ciphertext = bytes.slice(HEADER_BYTES);
  return { header, salt, nonce, ciphertext };
}

function isPin(value: string): boolean {
  return /^[0-9]{10}$/.test(value);
}

async function handle(request: Request) {
  if (!isPin(request.pin)) {
    throw new Error('Enter exactly 10 digits. Leading zeros are allowed.');
  }

  post({ id: request.id, type: 'status', message: 'Preparing the local cryptography…' });
  await sodium.ready;

  const pinBytes = sodium.from_string(request.pin);
  let key: Uint8Array | undefined;
  let plaintext: Uint8Array | undefined;

  try {
    if (request.action === 'encrypt') {
      plaintext = new TextEncoder().encode(request.message);
      if (plaintext.byteLength > MAX_MESSAGE_BYTES) {
        throw new Error('This first version supports messages up to 1 MiB of UTF-8 text.');
      }

      const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
      const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
      const header = buildHeader(salt, nonce);
      post({ id: request.id, type: 'status', message: 'Deriving your key with Argon2id…' });
      key = sodium.crypto_pwhash(
        KEY_BYTES,
        pinBytes,
        salt,
        PROFILE.opsLimit,
        PROFILE.memLimit,
        sodium.crypto_pwhash_ALG_ARGON2ID13,
      );

      post({ id: request.id, type: 'status', message: 'Sealing your message…' });
      const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
        plaintext,
        header,
        null,
        nonce,
        key,
      );
      const envelope = PREFIX + bytesToBase64Url(concat(header, ciphertext));
      post({ id: request.id, type: 'success', result: envelope });
      return;
    }

    const parsed = parseEnvelope(request.envelope);
    post({ id: request.id, type: 'status', message: 'Deriving your key with Argon2id…' });
    key = sodium.crypto_pwhash(
      KEY_BYTES,
      pinBytes,
      parsed.salt,
      PROFILE.opsLimit,
      PROFILE.memLimit,
      sodium.crypto_pwhash_ALG_ARGON2ID13,
    );

    post({ id: request.id, type: 'status', message: 'Checking the seal…' });
    try {
      plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
        null,
        parsed.ciphertext,
        parsed.header,
        parsed.nonce,
        key,
      );
    } catch {
      throw new Error('Could not open it. Check the PIN and make sure the package is intact.');
    }

    let message: string;
    try {
      message = new TextDecoder('utf-8', { fatal: true }).decode(plaintext);
    } catch {
      throw new Error('The seal is valid, but its contents are not readable UTF-8 text.');
    }
    post({ id: request.id, type: 'success', result: message });
  } finally {
    sodium.memzero(pinBytes);
    if (key) sodium.memzero(key);
    if (plaintext) sodium.memzero(plaintext);
  }
}

worker.onmessage = async (event: MessageEvent<Request>) => {
  const request = event.data;
  try {
    await handle(request);
  } catch (error) {
    post({
      id: request.id,
      type: 'failure',
      message: error instanceof Error ? error.message : 'Something went wrong while processing this message.',
    });
  }
};
