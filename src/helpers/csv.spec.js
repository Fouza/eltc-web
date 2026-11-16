import { describe, it, expect } from 'vitest';
import { parseCsv, toCsv } from './csv';

describe('csv helpers', () => {
  it('reads a French Excel export (";" separator, quotes, BOM)', () => {
    const { headers, rows } = parseCsv('﻿Nom;Prénom;Notes\r\nDupont;Marie;"a; b"\r\n\r\nBenali;"Ines ""Nono""";\r\n');
    expect(headers).toEqual(['Nom', 'Prénom', 'Notes']);
    expect(rows).toEqual([['Dupont', 'Marie', 'a; b'], ['Benali', 'Ines "Nono"', '']]);
  });

  it('round-trips through toCsv', () => {
    const csv = toCsv([{ n: 'A;B' }], [{ label: 'Name', value: (r) => r.n }]);
    expect(parseCsv(csv).rows[0][0]).toBe('A;B');
  });
});
