import { assetUrl, isPdf, toCmsRow } from './cms-row';

describe('cms-row', () => {
  it('normalises camelCase and PascalCase rows to one shape', () => {
    expect(toCmsRow({ id: 3, title: 'T', content: '<p>Hi</p>', image: 'assets/a.webp' })).toEqual(jasmine.objectContaining({
      id: 3, title: 'T', html: '<p>Hi</p>', image: 'assets/a.webp', file: null, link: null
    }));
    expect(toCmsRow({ Id: 4, Title: 'P', FilePath: 'assets/x.pdf', ExternalLink: 'https://x.org' })).toEqual(jasmine.objectContaining({
      id: 4, title: 'P', file: 'assets/x.pdf', link: 'https://x.org'
    }));
  });

  it('reads About Us Description and Faculty ProfilePhoto through the same fields', () => {
    expect(toCmsRow({ id: 1, description: '<p>About</p>' }).html).toBe('<p>About</p>');
    expect(toCmsRow({ id: 1, name: 'A', profilePhoto: 'assets/p.webp', displayOrder: 2 })).toEqual(jasmine.objectContaining({
      name: 'A', image: 'assets/p.webp', displayOrder: 2
    }));
  });

  it("treats an emptied CKEditor ('<p>&nbsp;</p>') as no content", () => {
    expect(toCmsRow({ id: 1, content: '<p>&nbsp;</p>' }).html).toBe('');
  });

  it('builds asset URLs against IMAGE_API_URL, keeping absolute URLs', () => {
    expect(assetUrl('https://api.test/', 'assets/Alumni/x.webp')).toBe('https://api.test/assets/Alumni/x.webp');
    expect(assetUrl('https://api.test', '/assets/x.webp')).toBe('https://api.test/assets/x.webp');
    expect(assetUrl('https://api.test/', 'https://cdn.example.org/x.webp')).toBe('https://cdn.example.org/x.webp');
    expect(assetUrl('https://api.test/', null)).toBeNull();
    expect(assetUrl('https://api.test/', '  ')).toBeNull();
  });

  it('detects PDFs by extension', () => {
    expect(isPdf('assets/a/B.PDF')).toBeTrue();
    expect(isPdf('assets/a/b.webp')).toBeFalse();
    expect(isPdf(null)).toBeFalse();
  });
});
