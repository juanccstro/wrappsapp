import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { readExport } from '../../src/worker/readExport';
import { SessionError } from '../../src/worker/errors';
import { findChatEntry, listZip } from '../../src/worker/zip';
import { loadFixture } from './helpers';

const CHAT = loadFixture('ios-es-24h.txt');
// Text decoding drops the byte order mark at the start, as it should.
const CHAT_TEXT = CHAT.replace(new RegExp('^' + String.fromCharCode(0xfeff)), '');

async function readAll(file: Blob): Promise<string> {
  let text = '';
  for await (const chunk of readExport(file)) text += chunk;
  return text;
}

/** Records which byte ranges of a Blob were read, to prove media is never touched. */
function spy(blob: Blob) {
  const reads: [number, number][] = [];
  const wrap = (b: Blob, offset: number): Blob =>
    new Proxy(b, {
      get(target, prop) {
        if (prop === 'slice') {
          return (start = 0, end = target.size) => {
            reads.push([offset + start, offset + Math.min(end, target.size)]);
            return wrap(target.slice(start, end), offset + start);
          };
        }
        const value = Reflect.get(target, prop, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  return { blob: wrap(blob, 0), reads };
}

describe('reading the chat out of a zip', () => {
  it('reads an export with media without loading the media', async () => {
    const zip = new JSZip();
    const media = new Uint8Array(40 * 1024 * 1024); // 40 MB of "photos and videos"
    zip.file('00000001-PHOTO-2026-11-12.jpg', media, { compression: 'STORE' });
    zip.file('_chat.txt', CHAT, { compression: 'DEFLATE' });
    zip.file('00000002-VIDEO-2026-11-12.mp4', media, { compression: 'STORE' });
    const file = new Blob([await zip.generateAsync({ type: 'arraybuffer' })]);

    const { blob, reads } = spy(file);
    expect(await readAll(blob)).toBe(CHAT_TEXT);
    const bytesRead = reads.reduce((sum, [a, b]) => sum + (b - a), 0);
    // Only the index, the chat header and the compressed chat: a few KB, never the 80 MB.
    expect(bytesRead).toBeLessThan(200 * 1024);
  });

  it('picks _chat.txt even with other .txt files and macOS metadata around', async () => {
    const zip = new JSZip();
    zip.file('__MACOSX/._chat.txt', 'junk');
    zip.file('notas.txt', 'otra cosa');
    zip.file('_chat.txt', CHAT);
    const entries = await listZip(new Blob([await zip.generateAsync({ type: 'arraybuffer' })]));
    expect(findChatEntry(entries)?.name).toBe('_chat.txt');
  });

  it('reads ZIP64 archives (exports over 4 GB)', async () => {
    expect(await readAll(zip64Of('_chat.txt', CHAT))).toBe(CHAT_TEXT);
  });

  it('explains broken or chat-less zips', async () => {
    const codeOf = async (file: Blob) => {
      try {
        await readAll(file);
      } catch (err) {
        return err instanceof SessionError ? err.code : String(err);
      }
      return null;
    };
    const onlyPhotos = new JSZip();
    onlyPhotos.file('foto.jpg', 'x');
    expect(await codeOf(new Blob([await onlyPhotos.generateAsync({ type: 'arraybuffer' })]))).toBe(
      'zip_without_chat',
    );
    expect(await codeOf(new Blob([new Uint8Array([0x50, 0x4b, 3, 4, 9, 9, 9])]))).toBe('bad_zip');
  });
});

/** A minimal ZIP64 archive with one stored entry, written by hand. */
function zip64Of(name: string, content: string): Blob {
  const enc = new TextEncoder();
  const nameBytes = enc.encode(name);
  const data = enc.encode(content);
  const parts: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;
  const push = (bytes: Uint8Array<ArrayBuffer>) => {
    parts.push(bytes);
    offset += bytes.length;
  };
  const record = (size: number, fill: (v: DataView) => void) => {
    const b = new Uint8Array(size);
    fill(new DataView(b.buffer));
    return b;
  };
  const setU64 = (v: DataView, at: number, n: number) => {
    v.setUint32(at, n % 2 ** 32, true);
    v.setUint32(at + 4, Math.floor(n / 2 ** 32), true);
  };

  const localOffset = offset;
  push(
    record(30, (v) => {
      v.setUint32(0, 0x04034b50, true);
      v.setUint16(4, 45, true);
      v.setUint32(18, data.length, true);
      v.setUint32(22, data.length, true);
      v.setUint16(26, nameBytes.length, true);
    }),
  );
  push(nameBytes);
  push(data);

  const cdOffset = offset;
  push(
    record(46, (v) => {
      v.setUint32(0, 0x02014b50, true);
      v.setUint16(4, 45, true);
      v.setUint16(6, 45, true);
      v.setUint32(20, 0xffffffff, true); // sizes and offset live in the ZIP64 extra field
      v.setUint32(24, 0xffffffff, true);
      v.setUint16(28, nameBytes.length, true);
      v.setUint16(30, 28, true);
      v.setUint32(42, 0xffffffff, true);
    }),
  );
  push(nameBytes);
  push(
    record(28, (v) => {
      v.setUint16(0, 0x0001, true);
      v.setUint16(2, 24, true);
      setU64(v, 4, data.length);
      setU64(v, 12, data.length);
      setU64(v, 20, localOffset);
    }),
  );
  const cdSize = offset - cdOffset;

  const zip64EocdOffset = offset;
  push(
    record(56, (v) => {
      v.setUint32(0, 0x06064b50, true);
      setU64(v, 4, 44);
      setU64(v, 24, 1);
      setU64(v, 32, 1);
      setU64(v, 40, cdSize);
      setU64(v, 48, cdOffset);
    }),
  );
  push(
    record(20, (v) => {
      v.setUint32(0, 0x07064b50, true);
      setU64(v, 8, zip64EocdOffset);
      v.setUint32(16, 1, true);
    }),
  );
  push(
    record(22, (v) => {
      v.setUint32(0, 0x06054b50, true);
      v.setUint16(8, 0xffff, true);
      v.setUint16(10, 0xffff, true);
      v.setUint32(12, 0xffffffff, true);
      v.setUint32(16, 0xffffffff, true);
    }),
  );
  return new Blob(parts);
}
