import { NitroResponse } from '../Response';

// Helpers
function makeResponse(
  init: Partial<{
    bodyString: string;
    bodyBytes: string | ArrayBuffer;
    status: number;
  }>
): NitroResponse {
  return new NitroResponse({
    url: 'https://example.com',
    status: init.status ?? 200,
    statusText: 'OK',
    ok: true,
    redirected: false,
    headers: [],
    bodyString: init.bodyString,
    bodyBytes: init.bodyBytes as ArrayBuffer | undefined,
  });
}

function base64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

// Arbitrary binary payload with every byte value represented (definitely not valid UTF-8)
const BINARY_BYTES = new Uint8Array([
  0x00, 0x01, 0x7f, 0x80, 0x9f, 0xa0, 0xc0, 0xfe, 0xff, 0xd0, 0xb1,
]);
const BINARY_BASE64 = base64(BINARY_BYTES);

describe('NitroResponse — text body', () => {
  it('arrayBuffer() returns UTF-8 encoded bytes for a text body', async () => {
    const res = makeResponse({ bodyString: 'hello' });
    const buf = await res.arrayBuffer();
    expect(new Uint8Array(buf)).toEqual(new TextEncoder().encode('hello'));
  });

  it('text() returns the original string', async () => {
    const res = makeResponse({ bodyString: '{"ok":true}' });
    expect(await res.text()).toBe('{"ok":true}');
  });

  it('json() parses a JSON string body', async () => {
    const res = makeResponse({ bodyString: '{"value":42}' });
    expect(await res.json()).toEqual({ value: 42 });
  });
});

describe('NitroResponse — binary body via base64 bodyBytes (native fix)', () => {
  it('arrayBuffer() decodes base64 bodyBytes to raw bytes', async () => {
    const res = makeResponse({
      bodyBytes: BINARY_BASE64 as unknown as ArrayBuffer,
    });
    const buf = await res.arrayBuffer();
    expect(new Uint8Array(buf)).toEqual(BINARY_BYTES);
  });

  it('bytes() decodes base64 bodyBytes to raw bytes', async () => {
    const res = makeResponse({
      bodyBytes: BINARY_BASE64 as unknown as ArrayBuffer,
    });
    const bytes = await res.bytes();
    expect(bytes).toEqual(BINARY_BYTES);
  });

  it('arrayBuffer() and bytes() agree on the same binary payload', async () => {
    const res1 = makeResponse({
      bodyBytes: BINARY_BASE64 as unknown as ArrayBuffer,
    });
    const res2 = makeResponse({
      bodyBytes: BINARY_BASE64 as unknown as ArrayBuffer,
    });
    const fromArrayBuffer = new Uint8Array(await res1.arrayBuffer());
    const fromBytes = await res2.bytes();
    expect(fromArrayBuffer).toEqual(fromBytes);
  });

  it('byte length matches the original binary data exactly', async () => {
    const res = makeResponse({
      bodyBytes: BINARY_BASE64 as unknown as ArrayBuffer,
    });
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBe(BINARY_BYTES.byteLength);
  });

  it('preserves every individual byte value including 0x00 and 0xff', async () => {
    const allBytes = new Uint8Array(256);
    for (let i = 0; i < 256; i++) allBytes[i] = i;
    const res = makeResponse({
      bodyBytes: base64(allBytes) as unknown as ArrayBuffer,
    });
    const result = new Uint8Array(await res.arrayBuffer());
    expect(result).toEqual(allBytes);
  });

  it('clone() preserves binary body', async () => {
    const res = makeResponse({
      bodyBytes: BINARY_BASE64 as unknown as ArrayBuffer,
    });
    const cloned = res.clone();
    const buf = await cloned.arrayBuffer();
    expect(new Uint8Array(buf)).toEqual(BINARY_BYTES);
  });
});

describe('NitroResponse — empty body', () => {
  it('arrayBuffer() returns empty buffer when no body is set', async () => {
    const res = makeResponse({});
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBe(0);
  });
});
