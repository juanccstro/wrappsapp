import { describe, expect, it } from 'vitest';
import type { WrappedResult } from '../../src/core';
import { posterFileName, slugify } from '../../src/ui/share/share';

describe('exported image names', () => {
  it('makes safe slugs out of chat and contact names', () => {
    expect(slugify('Los del Insti 🍕')).toBe('los-del-insti');
    expect(slugify('Lucía Núñez')).toBe('lucia-nunez');
    expect(slugify('+34 600 11 22 33')).toBe('34-600-11-22-33');
    expect(slugify('🍕🍕')).toBe('');
  });

  it('names the file after the chat or the person', () => {
    const wrapped = {
      chatName: 'Los del Insti 🍕',
      participants: [
        { idx: 0, name: 'Nico' },
        { idx: 1, name: 'Vera' },
      ],
    } as WrappedResult;
    expect(posterFileName(wrapped, { type: 'summary' })).toBe('wrappsapp-los-del-insti.png');
    expect(posterFileName(wrapped, { type: 'person', idx: 1 })).toBe('wrappsapp-vera.png');
    expect(posterFileName({ ...wrapped, chatName: null }, { type: 'summary' })).toBe(
      'wrappsapp.png',
    );
  });
});
