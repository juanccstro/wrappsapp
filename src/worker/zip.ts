/**
 * Reads ONE file out of a .zip without loading the whole archive. Chat exports "with media"
 * can weigh gigabytes of photos and videos; reading them into memory crashes a phone's
 * browser. A zip keeps an index (the central directory) at its end, so we read that, find
 * the chat text, and decompress only its bytes with the browser's own DecompressionStream.
 * Supports ZIP64 (archives over 4 GB) and stored or deflated entries.
 */

export type ZipEntry = {
  name: string;
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
  encrypted: boolean;
};

export class ZipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZipError';
  }
}

const EOCD = 0x06054b50;
const ZIP64_LOCATOR = 0x07064b50;
const ZIP64_EOCD = 0x06064b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;
const MAX_U32 = 0xffffffff;
const MAX_U16 = 0xffff;

async function bytes(file: Blob, start: number, end: number): Promise<DataView> {
  const buffer = await file.slice(start, end).arrayBuffer();
  return new DataView(buffer);
}

const u64 = (view: DataView, at: number) =>
  view.getUint32(at, true) + view.getUint32(at + 4, true) * 2 ** 32;

function decodeName(raw: Uint8Array, utf8: boolean): string {
  // Names are UTF-8 when flag bit 11 is set; otherwise CP437, where ASCII (all we look for,
  // like "_chat.txt") is the same, so a lenient UTF-8 decode is enough.
  return new TextDecoder(utf8 ? 'utf-8' : 'utf-8', { fatal: false }).decode(raw);
}

/** The entries of the archive, from its central directory. */
export async function listZip(file: Blob): Promise<ZipEntry[]> {
  const size = file.size;
  if (size < 22) throw new ZipError('too small');

  // End of central directory: in the last 22 bytes plus an optional comment (≤ 64 KB).
  const tailStart = Math.max(0, size - (22 + MAX_U16));
  const tail = await bytes(file, tailStart, size);
  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ZipError('no end of central directory');

  let entries = tail.getUint16(eocd + 10, true);
  let cdSize = tail.getUint32(eocd + 12, true);
  let cdOffset = tail.getUint32(eocd + 16, true);

  if (entries === MAX_U16 || cdSize === MAX_U32 || cdOffset === MAX_U32) {
    // ZIP64: a locator sits right before the classic record.
    const locatorAt = eocd - 20;
    if (locatorAt < 0 || tail.getUint32(locatorAt, true) !== ZIP64_LOCATOR) {
      throw new ZipError('missing zip64 locator');
    }
    const recordOffset = u64(tail, locatorAt + 8);
    const record = await bytes(file, recordOffset, recordOffset + 56);
    if (record.getUint32(0, true) !== ZIP64_EOCD) throw new ZipError('bad zip64 record');
    entries = u64(record, 32);
    cdSize = u64(record, 40);
    cdOffset = u64(record, 48);
  }

  const cd = await bytes(file, cdOffset, cdOffset + cdSize);
  const list: ZipEntry[] = [];
  let at = 0;
  for (let n = 0; n < entries && at + 46 <= cd.byteLength; n++) {
    if (cd.getUint32(at, true) !== CENTRAL) throw new ZipError('bad central directory');
    const flags = cd.getUint16(at + 8, true);
    const method = cd.getUint16(at + 10, true);
    let compressedSize = cd.getUint32(at + 20, true);
    let uncompressedSize = cd.getUint32(at + 24, true);
    const nameLength = cd.getUint16(at + 28, true);
    const extraLength = cd.getUint16(at + 30, true);
    const commentLength = cd.getUint16(at + 32, true);
    let localHeaderOffset = cd.getUint32(at + 42, true);

    const nameBytes = new Uint8Array(cd.buffer, cd.byteOffset + at + 46, nameLength);
    const name = decodeName(nameBytes, (flags & 0x800) !== 0);

    // ZIP64 extra field (id 0x0001) holds the 64-bit values that overflowed, in order.
    let extra = at + 46 + nameLength;
    const extraEnd = extra + extraLength;
    while (extra + 4 <= extraEnd) {
      const id = cd.getUint16(extra, true);
      const length = cd.getUint16(extra + 2, true);
      if (id === 0x0001) {
        let field = extra + 4;
        if (uncompressedSize === MAX_U32) {
          uncompressedSize = u64(cd, field);
          field += 8;
        }
        if (compressedSize === MAX_U32) {
          compressedSize = u64(cd, field);
          field += 8;
        }
        if (localHeaderOffset === MAX_U32) localHeaderOffset = u64(cd, field);
      }
      extra += 4 + length;
    }

    list.push({ name, method, compressedSize, localHeaderOffset, encrypted: (flags & 1) !== 0 });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return list;
}

/** The chat text inside a WhatsApp export: `_chat.txt`, or else the only/first .txt. */
export function findChatEntry(entries: ZipEntry[]): ZipEntry | null {
  const texts = entries
    .filter((e) => /\.txt$/i.test(e.name) && !e.name.startsWith('__MACOSX/'))
    .sort((x, y) => (x.name < y.name ? -1 : x.name > y.name ? 1 : 0));
  return texts.find((e) => /(^|\/)_chat\.txt$/i.test(e.name)) ?? texts[0] ?? null;
}

/** A stream of the decompressed bytes of one entry. */
export async function openEntry(file: Blob, entry: ZipEntry): Promise<ReadableStream<Uint8Array>> {
  if (entry.encrypted) throw new ZipError('encrypted');
  const header = await bytes(file, entry.localHeaderOffset, entry.localHeaderOffset + 30);
  if (header.getUint32(0, true) !== LOCAL) throw new ZipError('bad local header');
  const dataStart =
    entry.localHeaderOffset + 30 + header.getUint16(26, true) + header.getUint16(28, true);
  const data = file.slice(dataStart, dataStart + entry.compressedSize).stream();
  if (entry.method === 0) return data;
  if (entry.method === 8) {
    return data.pipeThrough(
      new DecompressionStream('deflate-raw') as unknown as ReadableWritablePair<
        Uint8Array,
        Uint8Array
      >,
    );
  }
  throw new ZipError(`unsupported compression ${entry.method}`);
}
