import { describe, expect, it } from 'vitest';
import { createChatParser, parseChat } from '../../src/core/parser';

const one = (line: string) => {
  const chat = parseChat(line);
  const message = chat.messages[0];
  if (!message) throw new Error('no message parsed');
  return { chat, message };
};

describe('line formats from the spec', () => {
  it.each([
    ['Android ES', '12/11/26, 17:03 - Juan: Hola qué tal', '2026-11-12T17:03'],
    ['Android EN', '11/13/26, 5:03 PM - Juan: hello', '2026-11-13T17:03'],
    ['Android EN narrow nbsp', '11/13/26, 5:03\u202fPM - Juan: hello', '2026-11-13T17:03'],
    ['Android ES 12h', '13/11/26, 5:03 p. m. - Juan: hola', '2026-11-13T17:03'],
    ['Android ES 12h nbsp', '13/11/26, 5:03\u202fp.\u00a0m. - Juan: hola', '2026-11-13T17:03'],
    ['iOS ES', '[13/11/26, 17:03:45] Juan: Hola qué tal', '2026-11-13T17:03'],
    ['iOS EN', '[11/13/26, 5:03:45 PM] Juan: hello', '2026-11-13T17:03'],
    ['iOS with marks', '\u200e[13/11/26, 17:03:45] Juan: \u200eimagen omitida', '2026-11-13T17:03'],
    ['4-digit year', '13/11/2026, 17:03 - Juan: ...', '2026-11-13T17:03'],
    ['dots', '13.11.26, 17:03 - Juan: hallo', '2026-11-13T17:03'],
    ['ISO date', '2026-11-13, 17:03 - Juan: hej', '2026-11-13T17:03'],
    ['BOM', '\ufeff13/11/26, 17:03 - Juan: hola', '2026-11-13T17:03'],
    ['12 AM is midnight', '11/13/26, 12:30 AM - Juan: zzz', '2026-11-13T00:30'],
    ['12 PM is noon', '11/13/26, 12:30 PM - Juan: lunch', '2026-11-13T12:30'],
  ])('%s', (_name, line, minuteKey) => {
    const { message, chat } = one(line);
    expect(message.minuteKey).toBe(minuteKey);
    expect(message.senderIdx).toBe(0);
    expect(chat.participants[0]?.displayName).toBe('Juan');
  });
});

describe('dd/mm vs mm/dd', () => {
  it('uses chronology when no field is above 12 (Spanish order)', () => {
    const chat = parseChat(
      ['5/11/26, 10:00 - A: uno', '7/11/26, 10:00 - B: dos', '1/12/26, 10:00 - A: tres'].join('\n'),
    );
    expect(chat.meta.dateOrder).toBe('dmy');
    expect(chat.messages.map((m) => m.minuteKey.slice(0, 10))).toEqual([
      '2026-11-05',
      '2026-11-07',
      '2026-12-01',
    ]);
  });

  it('uses chronology when no field is above 12 (US order)', () => {
    const chat = parseChat(
      ['11/5/26, 10:00 - A: one', '11/7/26, 10:00 - B: two', '12/1/26, 10:00 - A: three'].join(
        '\n',
      ),
    );
    expect(chat.meta.dateOrder).toBe('mdy');
    expect(chat.messages[2]?.minuteKey).toBe('2026-12-01T10:00');
  });

  it('falls back to the export language, then to dd/mm', () => {
    expect(parseChat('3/4/26, 10:00 - A: <Media omitted>').messages[0]?.minuteKey).toBe(
      '2026-03-04T10:00',
    );
    expect(parseChat('3/4/26, 10:00 - A: <Multimedia omitido>').messages[0]?.minuteKey).toBe(
      '2026-04-03T10:00',
    );
    expect(parseChat('3/4/26, 10:00 - A: hmm').messages[0]?.minuteKey).toBe('2026-04-03T10:00');
  });
});

describe('message kinds', () => {
  it.each([
    ['Se eliminó este mensaje', 'deleted'],
    ['Eliminaste este mensaje.', 'deleted'],
    ['This message was deleted', 'deleted'],
    ['You deleted this message', 'deleted'],
    ['<Multimedia omitido>', 'media'],
    ['<Media omitted>', 'media'],
    ['<Ver una vez mensaje de voz omitido>', 'media'],
    ['\u200e<adjunto: 00000012-PHOTO-2026-11-12-17-03-45.jpg>', 'media'],
    ['ENCUESTA:\n¿Sí?\nOPCIÓN: Sí (1 voto)', 'poll'],
    ['POLL:\nYes?\nOPTION: Yes (1 vote)', 'poll'],
    ['ubicación: https://maps.google.com/?q=1,2', 'location'],
    ['Ubicación en tiempo real compartida', 'location'],
    ['Pepe.vcf (archivo adjunto)', 'contact'],
    ['Llamada perdida', 'call'],
    ['Missed voice call', 'call'],
    ['se me ha omitido algo', 'text'],
    ['ubicación: mi casa', 'text'],
    ['llamada perdida tuya, llámame', 'text'],
  ])('%j → %s', (body, kind) => {
    expect(one(`13/11/26, 17:03 - Juan: ${body}`).message.kind).toBe(kind);
  });

  it('extracts the media type and keeps the caption', () => {
    const { message } = one(
      '13/11/26, 17:03 - Juan: IMG-20261113-WA0001.jpg (archivo adjunto)\nmira esto',
    );
    expect(message).toMatchObject({ kind: 'media', mediaType: 'image', text: 'mira esto' });
    expect(
      one('13/11/26, 17:03 - Juan: <Ver una vez mensaje de voz omitido>').message.mediaType,
    ).toBe('audio');
  });

  it('flags edited messages and removes the marker', () => {
    const es = one('13/11/26, 17:03 - Juan: perdón, a las 8 <Se editó este mensaje.>').message;
    expect(es).toMatchObject({ kind: 'text', text: 'perdón, a las 8', edited: true });
    const en = one('[11/13/26, 5:03:45 PM] Juan: sorry \u200e<This message was edited>').message;
    expect(en).toMatchObject({ kind: 'text', text: 'sorry', edited: true });
  });

  it('treats lines without an author as system', () => {
    const chat = parseChat(
      [
        '13/11/26, 17:00 - Marta se unió usando el enlace de invitación',
        '13/11/26, 17:03 - Juan: hola',
      ].join('\n'),
    );
    expect(chat.messages[0]).toMatchObject({
      kind: 'system',
      systemEvent: 'member_added',
      senderIdx: -1,
    });
    expect(chat.participants.map((p) => p.displayName)).toEqual(['Juan']);
    expect(chat.meta.isGroup).toBe(true);
  });
});

describe('names never leak into the text', () => {
  it('keeps the author out of the message in every format', () => {
    const lines = [
      '13/11/26, 17:03 - Juan: primero',
      '[13/11/26, 17:04:05] Juan: segundo',
      '13/11/2026 17:05 - Juan: tercero',
      '13/11/26, 5:06 p. m. - Juan: cuarto',
      '13/11/26, 17:07 – Juan: quinto',
    ];
    for (const line of lines) {
      const chat = parseChat(line);
      expect(chat.messages).toHaveLength(1);
      expect(chat.participants.map((p) => p.displayName)).toEqual(['Juan']);
      expect(chat.messages[0]?.text).not.toContain('Juan');
      expect(chat.messages[0]?.text).not.toMatch(/\d/);
    }
  });

  it('turns mentions into a neutral token instead of the contact name', () => {
    const fsi = String.fromCodePoint(0x2068);
    const pdi = String.fromCodePoint(0x2069);
    const chat = parseChat(
      `[13/11/26, 17:03:45] Marta: oye @${fsi}Juan Trabajo${pdi} y @${fsi}~ Lucía${pdi} venís?`,
    );
    expect(chat.messages[0]?.text).toBe('oye @~ y @~ venís?');
  });
});

describe('individual chats and names', () => {
  it('detects a two-person chat', () => {
    const chat = parseChat(
      [
        '13/11/26, 17:00 - Los mensajes y las llamadas están cifrados de extremo a extremo.',
        '13/11/26, 17:03 - Juan: hola',
        '13/11/26, 17:04 - +34 600 00 00 00: quién eres',
      ].join('\n'),
    );
    expect(chat.meta.isGroup).toBe(false);
    expect(chat.participants.map((p) => p.displayName)).toEqual(['Juan', '+34 600 00 00 00']);
  });

  it('cleans invisible characters and the "~" of unsaved contacts from names', () => {
    const chat = parseChat(
      '[13/11/26, 17:03:45] ~\u202fJuanito 🍺: hola\n[13/11/26, 17:04:00] \u202a+34\u00a0600\u202c: ey',
    );
    expect(chat.participants.map((p) => p.displayName)).toEqual(['Juanito 🍺', '+34 600']);
  });
});

describe('streaming and performance', () => {
  it('gives the same result when the file arrives in arbitrary blocks', () => {
    const text =
      '13/11/26, 17:03 - Juan: Hola\r\nsegunda línea\r\n13/11/26, 17:04 - Marta: <Multimedia omitido>\r\n';
    const whole = parseChat(text);
    for (const size of [1, 2, 7, 13]) {
      const parser = createChatParser();
      for (let i = 0; i < text.length; i += size) parser.push(text.slice(i, i + size));
      expect(parser.finish()).toEqual(whole);
    }
    expect(whole.messages[0]?.text).toBe('Hola\nsegunda línea');
  });

  it('parses 300k lines quickly', () => {
    const names = ['Juan', 'Marta', 'Lucía', 'Dani', 'Pepe', 'Ana'];
    const bodies = [
      'jajajaja',
      '<Multimedia omitido>',
      'vale, nos vemos luego en el bar 🍻',
      'Se eliminó este mensaje',
      '¿Quién viene?',
    ];
    const lines: string[] = [];
    for (let i = 0; i < 300_000; i++) {
      const day = 1 + (Math.floor(i / 12_000) % 28);
      const hour = Math.floor(i / 500) % 24;
      lines.push(
        `${day}/3/26, ${hour}:${String(i % 60).padStart(2, '0')} - ${names[i % 6]}: ${bodies[i % 5]}`,
      );
    }
    const text = lines.join('\n');
    const start = performance.now();
    const chat = parseChat(text);
    const elapsed = performance.now() - start;
    expect(chat.messages).toHaveLength(300_000);
    // The goal is 3 s on its own (see scripts/bench.ts); the bound is looser because the
    // other test files run at the same time and share the CPU.
    expect(elapsed).toBeLessThan(8000);
  }, 30_000);
});
