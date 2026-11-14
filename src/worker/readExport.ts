import { SessionError } from './errors';
import { findChatEntry, listZip, openEntry, ZipError } from './zip';

/** A .zip starts with "PK". The file name is not trusted: some phones rename exports. */
async function isZip(file: Blob): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 2).arrayBuffer());
  return head[0] === 0x50 && head[1] === 0x4b;
}

async function* decode(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  // The DOM typings of TextDecoderStream are narrower than what it accepts at runtime.
  const decoder = new TextDecoderStream('utf-8') as unknown as ReadableWritablePair<
    string,
    Uint8Array
  >;
  const reader = stream.pipeThrough(decoder).getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    yield value;
  }
}

/** Older browsers without DecompressionStream: load the zip whole (fine for small ones). */
async function readWithJsZip(file: Blob): Promise<string> {
  const { default: JSZip } = await import('jszip');
  let zip;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw new SessionError('bad_zip');
  }
  const texts = Object.values(zip.files)
    .filter(
      (entry) => !entry.dir && /\.txt$/i.test(entry.name) && !entry.name.startsWith('__MACOSX/'),
    )
    .sort((x, y) => (x.name < y.name ? -1 : x.name > y.name ? 1 : 0));
  const chat = texts.find((entry) => /(^|\/)_chat\.txt$/i.test(entry.name)) ?? texts[0];
  if (!chat) throw new SessionError('zip_without_chat');
  return chat.async('string');
}

/**
 * Text of an exported chat, block by block. Accepts the .txt itself or the .zip that
 * iPhone and Android produce, with or without media. From a .zip only the chat text is read
 * and decompressed: photos and videos are never loaded, so even multi-gigabyte exports work.
 * Everything happens on this device.
 */
export async function* readExport(file: Blob): AsyncGenerator<string> {
  if (!(await isZip(file))) {
    yield* decode(file.stream());
    return;
  }

  if (typeof DecompressionStream === 'undefined') {
    yield await readWithJsZip(file);
    return;
  }

  let stream: ReadableStream<Uint8Array>;
  try {
    const chat = findChatEntry(await listZip(file));
    if (!chat) throw new SessionError('zip_without_chat');
    stream = await openEntry(file, chat);
  } catch (err) {
    if (err instanceof SessionError) throw err;
    if (err instanceof ZipError) throw new SessionError('bad_zip');
    throw err;
  }
  try {
    yield* decode(stream);
  } catch {
    throw new SessionError('bad_zip');
  }
}
