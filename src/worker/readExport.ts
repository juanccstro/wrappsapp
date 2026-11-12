import { SessionError } from './errors';

/** A .zip starts with "PK". The file name is not trusted: some phones rename exports. */
async function isZip(file: Blob): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 2).arrayBuffer());
  return head[0] === 0x50 && head[1] === 0x4b;
}

/**
 * Text of an exported chat, block by block. Accepts the .txt itself or the .zip that
 * iPhone (and Android "with media") produces, where the chat is `_chat.txt` or the only
 * .txt inside. Everything happens in memory, on this device.
 */
export async function* readExport(file: Blob): AsyncGenerator<string> {
  if (await isZip(file)) {
    const { default: JSZip } = await import('jszip');
    let zip;
    try {
      zip = await JSZip.loadAsync(await file.arrayBuffer());
    } catch {
      throw new SessionError('bad_zip');
    }
    const texts = Object.values(zip.files)
      .filter((entry) => !entry.dir && /\.txt$/i.test(entry.name))
      .sort((x, y) => (x.name < y.name ? -1 : x.name > y.name ? 1 : 0));
    const chat = texts.find((entry) => /(^|\/)_chat\.txt$/i.test(entry.name)) ?? texts[0];
    if (!chat) throw new SessionError('zip_without_chat');
    yield await chat.async('string');
    return;
  }

  const reader = file.stream().pipeThrough(new TextDecoderStream('utf-8')).getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    yield value;
  }
}
