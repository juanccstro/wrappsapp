import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { readExport } from '../../src/worker/readExport';
import { createSession, SessionError } from '../../src/worker/session';
import { loadFixture } from './helpers';

async function zipOf(files: Record<string, string>): Promise<Blob> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) zip.file(name, content);
  return new Blob([await zip.generateAsync({ type: 'arraybuffer' })]);
}

const codeOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (err) {
    if (err instanceof SessionError) return err.code;
    throw err;
  }
  return null;
};

describe('reading an export', () => {
  const chat = loadFixture('ios-es-24h.txt');

  it('reads a plain .txt', async () => {
    const summary = await createSession().load(readExport(new Blob([chat])));
    expect(summary.participants).toHaveLength(4);
  });

  it('reads the chat inside an iPhone .zip, ignoring other files', async () => {
    const zip = await zipOf({ 'notas.txt': 'nada', '_chat.txt': chat, 'foto.jpg': 'x' });
    const session = createSession();
    const summary = await session.load(readExport(zip), 'WhatsApp Chat - Los del Insti.zip');
    expect(summary.participants).toHaveLength(4);
    expect(summary.meta.platform).toBe('ios');
  });

  it('reads the only .txt of an Android .zip', async () => {
    const zip = await zipOf({
      'Chat de WhatsApp con Insti.txt': loadFixture('android-es-24h.txt'),
    });
    expect((await createSession().load(readExport(zip))).meta.platform).toBe('android');
  });

  it('explains what is wrong with a .zip that has no chat or is broken', async () => {
    const session = createSession();
    expect(await codeOf(session.load(readExport(await zipOf({ 'foto.jpg': 'x' }))))).toBe(
      'zip_without_chat',
    );
    const broken = new Blob([new Uint8Array([0x50, 0x4b, 1, 2, 3, 4, 5])]);
    expect(await codeOf(session.load(readExport(broken)))).toBe('bad_zip');
  });
});
