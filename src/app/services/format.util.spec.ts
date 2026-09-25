import { formatStatCount } from './format.util';

describe('formatStatCount', () => {
  it('appends "+" to plain numbers', () => {
    expect(formatStatCount('100')).toBe('100+');
    expect(formatStatCount(' 1,200 ')).toBe('1,200+');
    expect(formatStatCount(50)).toBe('50+');
  });

  it('does not double an existing "+" or touch non-numbers', () => {
    expect(formatStatCount('100+')).toBe('100+');
    expect(formatStatCount('A+')).toBe('A+');
    expect(formatStatCount('100 100 100')).toBe('100 100 100');
  });

  it('returns "" for null/empty', () => {
    expect(formatStatCount(null)).toBe('');
    expect(formatStatCount(undefined)).toBe('');
    expect(formatStatCount('  ')).toBe('');
  });
});
