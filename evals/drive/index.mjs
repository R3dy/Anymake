// Adapter registry — the seam §3.3 draws, kept to one file.
import { OpenCodeAdapter } from './opencode.mjs';
import { MockAdapter } from './mock.mjs';

export const ADAPTERS = { opencode: OpenCodeAdapter, mock: MockAdapter };

export function getAdapter(id = 'opencode') {
  const A = ADAPTERS[id];
  if (!A) throw new Error(`unknown adapter '${id}' — available: ${Object.keys(ADAPTERS).join(', ')}`);
  return A;
}
