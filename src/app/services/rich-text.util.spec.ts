import { decodeHtmlEntities, firstLineOfHtml, htmlToPlainText } from './rich-text.util';

describe('rich-text.util', () => {
  it('returns "" for null, undefined and empty input', () => {
    expect(firstLineOfHtml(null)).toBe('');
    expect(firstLineOfHtml(undefined)).toBe('');
    expect(firstLineOfHtml('')).toBe('');
    expect(htmlToPlainText(null)).toBe('');
  });

  it('takes the first visual line of a CMS title with a tagline', () => {
    const html = '<span style="font-size:24px;"><strong>SIKKIM GOVERNMENT LAW COLLEGE GANGTOK</strong></span><p>Excellence in Legal Education</p>';
    expect(firstLineOfHtml(html)).toBe('SIKKIM GOVERNMENT LAW COLLEGE GANGTOK');
  });

  it('decodes &nbsp; and collapses whitespace instead of printing entities', () => {
    expect(firstLineOfHtml('SIKKIM&nbsp;&nbsp;GOVERNMENT&nbsp;LAW')).toBe('SIKKIM GOVERNMENT LAW');
    expect(firstLineOfHtml('<p>&nbsp;&nbsp;&nbsp;Leading spaces</p>')).toBe('Leading spaces');
  });

  it('keeps text that sits before the first element', () => {
    expect(firstLineOfHtml('Plain start<p>Second</p>')).toBe('Plain start');
  });

  it('skips empty CKEditor paragraphs', () => {
    expect(firstLineOfHtml('<p>&nbsp;</p><p></p><h2>Real title</h2>')).toBe('Real title');
  });

  it('treats <br> and block tags as line breaks', () => {
    expect(firstLineOfHtml('Line one<br>Line two')).toBe('Line one');
    expect(firstLineOfHtml('<blockquote><p>Quoted</p></blockquote><p>After</p>')).toBe('Quoted');
    expect(firstLineOfHtml('<ul><li>Item A</li><li>Item B</li></ul>')).toBe('Item A');
  });

  it('does not merge words split across inline tags', () => {
    expect(firstLineOfHtml('<b>Law</b><i>College</i>')).toBe('Law College');
  });

  it('joins all lines for plain text', () => {
    expect(htmlToPlainText('<h1>A</h1><p>B&amp;C</p>')).toBe('A B&C');
  });

  it('ignores script/style content and never needs a DOM', () => {
    expect(htmlToPlainText('<script>alert(1)</script><p>Safe</p><img src=x onerror="alert(2)">')).toBe('Safe');
  });

  it('decodes numeric entities and leaves unknown ones alone', () => {
    expect(decodeHtmlEntities('&#8211; &#x2014; &bogus;')).toBe('– — &bogus;');
  });
});
