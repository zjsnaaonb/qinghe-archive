import type { EncryptedBlock } from '../types/game';

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

export function normalizePassphrase(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s\-_—·:：]/g, '');
}

async function deriveAesKey(passphrase: string, saltBytes: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(normalizePassphrase(passphrase)),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes.buffer as ArrayBuffer,
      iterations: 25000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
}

export async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await window.crypto.subtle.digest('SHA-256', enc.encode(normalizePassphrase(input)));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyPassphraseHash(input: string, expectedSha256Hex: string): Promise<boolean> {
  const actual = await sha256Hex('qinghe_salt_98::' + normalizePassphrase(input));
  return actual === expectedSha256Hex;
}

export async function decryptVaultBlock(
  block: EncryptedBlock,
  passphrase: string
): Promise<string | null> {
  try {
    const salt = base64ToBytes(block.salt);
    const iv = base64ToBytes(block.iv);
    const cipherBytes = base64ToBytes(block.ciphertext);
    const key = await deriveAesKey(passphrase, salt);
    const plainBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer as ArrayBuffer,
      },
      key,
      cipherBytes.buffer as ArrayBuffer
    );
    return new TextDecoder().decode(plainBuffer);
  } catch {
    return null;
  }
}
