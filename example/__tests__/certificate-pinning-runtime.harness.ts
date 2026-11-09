import { describe, it, expect, afterEach } from 'react-native-harness';
import {
  fetch as nitroFetch,
  reloadCertificatePinning,
  setCertificatePinning,
} from 'react-native-nitro-fetch';

// Runtime pin updates (setCertificatePinning / reloadCertificatePinning). The bundled
// nitro-fetch-pinning.json pins www.gstatic.com to a key no chain contains (see certificate-pinning.harness.ts),
// and does not mention example.com. Each test restores the bundled pins afterwards.
const BUNDLED_MISMATCH = 'https://www.gstatic.com/generate_204';
const BUNDLED_UNPINNED = 'https://example.com/';
const PIN_ERROR = 'ERR_SSL_PINNED_KEY_NOT_IN_CERT_CHAIN';
const NO_SUCH_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

async function failureOf(run: () => Promise<unknown>): Promise<any> {
  try {
    await run();
  } catch (e) {
    return e;
  }
  return undefined;
}

describe('Certificate pinning: runtime API', () => {
  afterEach(() => {
    reloadCertificatePinning();
  });

  it('turns pinning off for a host the bundled file pinned', async () => {
    expect(
      String((await failureOf(() => nitroFetch(BUNDLED_MISMATCH)))?.message)
    ).toContain(PIN_ERROR);

    setCertificatePinning({});
    const res = await nitroFetch(BUNDLED_MISMATCH);
    expect(typeof res.status).toBe('number');
  });

  it('pins a host the bundled file did not mention', async () => {
    const before = await nitroFetch(BUNDLED_UNPINNED, { method: 'HEAD' });
    expect(before.status).toBe(200);

    setCertificatePinning({
      'example.com': { publicKeyHashes: [NO_SUCH_KEY] },
    });
    const error = await failureOf(() =>
      nitroFetch(BUNDLED_UNPINNED, { method: 'HEAD' })
    );
    expect(error).toBeDefined();
    expect(String(error?.message)).toContain(PIN_ERROR);
  });

  it('applies to the streaming transport too', async () => {
    setCertificatePinning(
      JSON.stringify({ 'example.com': { publicKeyHashes: [NO_SUCH_KEY] } })
    );
    const error = await failureOf(async () => {
      const res = await nitroFetch(BUNDLED_UNPINNED, { stream: true } as any);
      await res.text();
    });
    expect(String(error?.message)).toContain(PIN_ERROR);
  });

  it('rejects an invalid config and keeps the current pins', async () => {
    setCertificatePinning({
      'example.com': { publicKeyHashes: [NO_SUCH_KEY] },
    });
    expect(() => setCertificatePinning('not json')).toThrow();
    expect(() =>
      setCertificatePinning({ 'example.com': { publicKeyHashes: ['abc'] } })
    ).toThrow();
    const error = await failureOf(() =>
      nitroFetch(BUNDLED_UNPINNED, { method: 'HEAD' })
    );
    expect(String(error?.message)).toContain(PIN_ERROR);
  });

  it('reloadCertificatePinning restores the bundled pins', async () => {
    setCertificatePinning({});
    const open = await nitroFetch(BUNDLED_MISMATCH);
    expect(typeof open.status).toBe('number');

    reloadCertificatePinning();
    const error = await failureOf(() => nitroFetch(BUNDLED_MISMATCH));
    expect(String(error?.message)).toContain(PIN_ERROR);
    const res = await nitroFetch(BUNDLED_UNPINNED, { method: 'HEAD' });
    expect(res.status).toBe(200);
  });
});
