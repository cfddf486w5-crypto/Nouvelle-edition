import { checksum } from '../core/storage.js';

export function verifyPayloadIntegrity(payload) {
  const serialized = JSON.stringify(payload.state || {});
  return checksum(serialized) === payload.checksum;
}

export function initSecurityModule() {}
