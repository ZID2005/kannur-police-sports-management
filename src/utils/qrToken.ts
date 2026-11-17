import crypto from 'crypto';
import { FacilityCode } from '@prisma/client';
import { env } from '../config/env';

export interface QrTokenBindingInput {
  passOrBookingCode: string;
  userId: string;
  facilityCode: FacilityCode;
}

/**
 * Generates a deterministic HMAC-SHA256 signed `qr_token_hash`
 * cryptographically bound to `passOrBookingCode`, `userId`, and `facilityCode`.
 */
export function generateQrTokenHash(input: QrTokenBindingInput): string {
  const canonicalPayload = `KCP-QR-V1|${input.passOrBookingCode}|${input.userId}|${input.facilityCode}`;
  return crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(canonicalPayload)
    .digest('hex');
}

/**
 * Verifies a candidate `qr_token_hash` against the expected deterministic
 * HMAC-SHA256 signature using constant-time comparison.
 */
export function verifyQrTokenHash(
  candidateHash: string,
  input: QrTokenBindingInput
): boolean {
  if (!candidateHash || typeof candidateHash !== 'string') {
    return false;
  }
  const expectedHash = generateQrTokenHash(input);
  const candidateBuf = Buffer.from(candidateHash, 'utf8');
  const expectedBuf = Buffer.from(expectedHash, 'utf8');
  if (candidateBuf.length !== expectedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(candidateBuf, expectedBuf);
}

/**
 * Signs an offline gate cache manifest using HMAC-SHA256 so the gate browser
 * can verify manifest integrity offline.
 */
export function signOfflineCacheManifest(manifestData: unknown): string {
  const serialized = JSON.stringify(manifestData);
  return crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(`KCP-GATE-MANIFEST-V1|${serialized}`)
    .digest('hex');
}
