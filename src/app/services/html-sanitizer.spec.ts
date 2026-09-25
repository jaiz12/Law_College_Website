import { sanitizeRichHtml, sanitizeStyle, sanitizeUrl } from './html-sanitizer';

/**
 * Security boundary for CMS rich text. Each hostile case asserts on the
 * sanitized output string — the exact thing SSR writes into the page.
 */
describe('html-sanitizer', () => {
  const clean = (html: string) => sanitizeRichHtml(html, document);
  /** Parsed output, for structural assertions. */
  const parse = (html: string) => {
    const doc = document.implementation.createHTMLDocument('');
    doc.body.innerHTML = clean(html);
    return doc.body;
  };

  describe('dangerous elements', () => {
    it('removes <script> including its content', () => {
      const out = clean('<p>a</p><script>alert(1)</script><p>b</p>');
      expect(out).toBe('<p>a</p><p>b</p>');
    });

    it('removes iframe (javascript: and srcdoc), object, embed', () => {
      const out = clean(
        '<iframe src="javascript:alert(1)"></iframe><iframe srcdoc="<script>alert(1)</script>"></iframe>' +
        '<object data="javascript:alert(1)"></object><embed src="javascript:alert(1)"><p>ok</p>');
      expect(out).toBe('<p>ok</p>');
    });

    it('removes base, meta refresh, link, style and form', () => {
      const out = clean(
        '<base href="https://evil.example/"><meta http-equiv="refresh" content="0;url=https://evil.example">' +
        '<link rel="stylesheet" href="https://evil.example/x.css"><style>body{display:none}</style>' +
        '<form action="https://evil.example"><input name="password"><button>go</button></form><p>ok</p>');
      expect(out).toBe('<p>ok</p>');
    });

    it('removes SVG and MathML entirely (event handlers, mXSS namespace tricks)', () => {
      const out = clean(
        '<svg onload="alert(1)"><circle r="5"/><script>alert(2)</script></svg>' +
        '<math><mtext><table><mglyph><style><img src=x onerror="alert(3)"></style></mglyph></table></mtext></math><p>ok</p>');
      expect(out).not.toMatch(/svg|math|onload|onerror|script|alert/i);
      expect(out).toContain('<p>ok</p>');
    });

    it('removes noscript/template content (parsed differently when scripting is on)', () => {
      const out = clean('<noscript><p title="</noscript><img src=x onerror=alert(1)>"></p></noscript><template><img src=x onerror=alert(2)></template>');
      expect(out).not.toMatch(/onerror|alert|img/i);
    });

    it('unwraps unknown elements but keeps their text', () => {
      expect(clean('<section><custom-el>Hello</custom-el></section>')).toBe('Hello');
    });
  });

  describe('dangerous attributes', () => {
    it('drops every on* handler', () => {
      const body = parse('<p onclick="alert(1)" onmouseover="alert(2)">x</p><img src="https://a.test/i.png" onerror="alert(3)" onload="alert(4)">');
      const attrs = [...body.querySelectorAll('*')].flatMap(e => [...e.attributes].map(a => a.name));
      expect(attrs.filter(a => a.startsWith('on'))).toEqual([]);
      expect(body.querySelector('img')?.getAttribute('src')).toBe('https://a.test/i.png');
    });

    it('drops id, data-*, srcdoc and formaction', () => {
      const out = clean('<p id="login" data-x="1" srcdoc="x" formaction="javascript:alert(1)">x</p>');
      expect(out).toBe('<p>x</p>');
    });

    it('keeps only CKEditor classes, not site/Tailwind ones', () => {
      expect(clean('<figure class="table fixed inset-0 z-50"><table><tr><td>x</td></tr></table></figure>'))
        .toContain('<figure class="table">');
    });

    it('keeps an attribute value from breaking out of its quotes', () => {
      const out = clean('<a href="https://a.test/?q=&quot;><script>alert(1)</script>">x</a>');
      expect(out).not.toContain('<script');
      expect(parse('<a href="https://a.test/?q=&quot;x">x</a>').querySelector('a')?.getAttribute('href')).toBe('https://a.test/?q="x');
    });
  });

  describe('URLs', () => {
    it('rejects javascript:, vbscript:, data:text/html — including obfuscated forms', () => {
      for (const href of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'java\tscript:alert(1)',
        '&#106;avascript:alert(1)', 'vbscript:msgbox(1)', 'data:text/html,<script>alert(1)</script>']) {
        const a = parse(`<a href="${href}">x</a>`).querySelector('a');
        expect(a?.hasAttribute('href')).withContext(href).toBeFalse();
      }
    });

    it('rejects protocol-relative and bare-word links (would leave the site or resolve relative to the page)', () => {
      expect(sanitizeUrl('//evil.example/x', 'link')).toBeNull();
      expect(sanitizeUrl('/\\evil.example', 'link')).toBeNull();
      expect(sanitizeUrl('dfiubhfv', 'link')).toBeNull();
      expect(sanitizeUrl('not a url', 'link')).toBeNull();
    });

    it('allows https, http, mailto, tel, site-rooted paths and fragments', () => {
      expect(sanitizeUrl('https://example.com/a', 'link')).toBe('https://example.com/a');
      expect(sanitizeUrl('http://example.com', 'link')).toBe('http://example.com');
      expect(sanitizeUrl('mailto:office@example.org', 'link')).toBe('mailto:office@example.org');
      expect(sanitizeUrl('tel:+911234', 'link')).toBe('tel:+911234');
      expect(sanitizeUrl('/student-life/library', 'link')).toBe('/student-life/library');
      expect(sanitizeUrl('#top', 'link')).toBe('#top');
    });

    it('allows raster data: images only; never mailto/data:svg as an image', () => {
      expect(sanitizeUrl('data:image/png;base64,iVBORw0KGgo=', 'image')).not.toBeNull();
      expect(sanitizeUrl('data:image/svg+xml;base64,PHN2Zz4=', 'image')).toBeNull();
      expect(sanitizeUrl('mailto:a@b.c', 'image')).toBeNull();
    });

    it('opens external links in a new tab without an opener; internal/mailto stay in place', () => {
      const body = parse('<a href="https://example.com">e</a><a href="/about/faculty">i</a><a href="mailto:a@b.c">m</a>');
      const [external, internal, mail] = [...body.querySelectorAll('a')];
      expect(external.target).toBe('_blank');
      expect(external.rel).toBe('noopener noreferrer');
      expect(internal.hasAttribute('target')).toBeFalse();
      expect(mail.hasAttribute('target')).toBeFalse();
    });

    it('turns a link with a rejected href into inert text', () => {
      const a = parse('<a href="not a url" target="_self">t</a>').querySelector('a')!;
      expect(a.getAttributeNames()).toEqual([]);
      expect(a.textContent).toBe('t');
    });

    it('drops an image whose src is rejected', () => {
      expect(clean('<img src="javascript:alert(1)"><img src=x onerror=alert(1)>')).toBe('');
    });
  });

  describe('CSS', () => {
    it('keeps CKEditor formatting properties', () => {
      expect(sanitizeStyle('color:#e03e2d; font-size:20px; text-align:center; margin-left:40px; list-style-type:lower-roman; font-family:"Times New Roman", serif; background-color:hsl(60, 75%, 60%)'))
        .toBe('color:#e03e2d;font-size:20px;text-align:center;margin-left:40px;list-style-type:lower-roman;font-family:"Times New Roman", serif;background-color:hsl(60, 75%, 60%)');
    });

    it('rejects url(), expression(), javascript and positioning', () => {
      expect(sanitizeStyle('background-image:url(javascript:alert(1))')).toBe('');
      expect(sanitizeStyle('background-color:url(https://evil.example/t.gif)')).toBe('');
      expect(sanitizeStyle('width:expression(alert(1))')).toBe('');
      expect(sanitizeStyle('position:fixed;top:0;left:0;z-index:9999')).toBe('');
      expect(sanitizeStyle('color:red\\;behavior:url(x.htc)')).toBe('');
    });

    it('strips !important so content cannot override site rules', () => {
      expect(sanitizeStyle('color:red !important')).toBe('color:red');
    });
  });

  describe('legitimate CKEditor content', () => {
    const ckeditor =
      '<h1>H1</h1><h2>H2</h2><h3>H3</h3>' +
      '<p style="text-align:center;"><strong>b</strong> <i>i</i> <u>u</u> <s>s</s> <span style="color:#e03e2d;font-size:20px;">c</span><br>line2&nbsp;x</p>' +
      '<ul><li>a<ul><li>nested</li></ul></li></ul><ol start="3" reversed><li>n</li></ol><ol style="list-style-type:lower-roman;"><li>r</li></ol>' +
      '<blockquote><p>q</p></blockquote>' +
      '<figure class="table"><table><thead><tr><th scope="col">h</th></tr></thead><tbody><tr><td colspan="2" rowspan="1">d</td></tr></tbody></table></figure>' +
      '<p style="margin-left:40px;">indent</p><p><a href="https://example.com">link</a></p>';

    it('preserves structure and formatting', () => {
      const body = parse(ckeditor);
      expect(['h1', 'h2', 'h3', 'strong', 'i', 'u', 's', 'br', 'blockquote', 'figure', 'table', 'thead', 'th', 'td']
        .filter(tag => !body.querySelector(tag))).toEqual([]);
      expect(body.querySelector('ul ul li')?.textContent).toBe('nested');
      expect(body.querySelector('ol')?.getAttribute('start')).toBe('3');
      expect(body.querySelector('ol')?.hasAttribute('reversed')).toBeTrue();
      expect(body.querySelector('p')?.getAttribute('style')).toBe('text-align:center');
      expect(body.querySelector('span')?.getAttribute('style')).toBe('color:#e03e2d;font-size:20px');
      expect(body.querySelectorAll('ol')[1].getAttribute('style')).toBe('list-style-type:lower-roman');
      expect((body.querySelector('td') as HTMLTableCellElement).colSpan).toBe(2);
      expect(body.querySelector('th')?.getAttribute('scope')).toBe('col');
      const indented = Array.from(body.querySelectorAll('p')).find(p => p.textContent === 'indent');
      expect(indented?.getAttribute('style')).toBe('margin-left:40px');
      expect(body.textContent).toContain('line2 x');
    });

    it('is stable: sanitizing sanitized output changes nothing', () => {
      const once = clean(ckeditor);
      expect(clean(once)).toBe(once);
    });

    it('escapes text so it can never become markup', () => {
      expect(clean('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
    });

    it('handles null, empty and very deep input without throwing', () => {
      expect(clean(null as unknown as string)).toBe('');
      expect(clean('')).toBe('');
      const deep = '<div>'.repeat(500) + 'x' + '</div>'.repeat(500);
      expect(() => clean(deep)).not.toThrow();
    });
  });
});
