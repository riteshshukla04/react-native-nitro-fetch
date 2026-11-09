import { NitroFetch } from './NitroInstances';

/** Pin entry for one host, the same shape as an entry in `nitro-fetch-pinning.json`. */
export interface CertificatePinningEntry {
  /** Base64 SHA-256 hashes of the SPKI. A chain passes if any of its certificates matches. */
  publicKeyHashes: string[];
  includeSubdomains?: boolean;
  /** `yyyy-MM-dd`. Expired entries are ignored. */
  expirationDate?: string;
}

/** Pins keyed by hostname, the same shape as `nitro-fetch-pinning.json`. */
export type CertificatePinningConfig = Record<string, CertificatePinningEntry>;

/**
 * Replaces the certificate pins at runtime, without a new native build. Pass an object or the JSON
 * text of the same shape as the bundled `nitro-fetch-pinning.json`. `{}` turns pinning off.
 *
 * Throws if the config is invalid, and the current pins stay in place. New requests use the new pins.
 * Requests in flight finish with the old ones. The change lasts until the app restarts (the bundled
 * file applies again) or `reloadCertificatePinning()` is called, so call it on every launch.
 * Verify the config's authenticity yourself before calling this: whoever can call it controls the pins.
 */
export function setCertificatePinning(
  config: CertificatePinningConfig | string
): void {
  NitroFetch.setCertificatePinning(
    typeof config === 'string' ? config : JSON.stringify(config)
  );
}

/** Drops any runtime pins and re-reads the bundled `nitro-fetch-pinning.json`. */
export function reloadCertificatePinning(): void {
  NitroFetch.reloadCertificatePinning();
}
