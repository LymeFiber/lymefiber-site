import { describe, expect, test } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { formatPostedAt, shouldShowNotice, renderNoticeMessage } from '../src/lib/notice';
import NoticeBanner from '../src/components/NoticeBanner.astro';

describe('formatPostedAt', () => {
  test('converts a UTC instant to the previous Eastern day', () => {
    expect(formatPostedAt('2026-12-10T04:30:00Z')).toBe('Posted Dec 9, 11:30 PM');
  });
  test('handles the DST change night', () => {
    expect(formatPostedAt('2026-11-01T06:30:00Z')).toBe('Posted Nov 1, 1:30 AM');
  });
  test('reads a time without a zone (as the editor saves it) as Eastern time', () => {
    expect(formatPostedAt('2026-11-08T21:35:00')).toBe('Posted Nov 8, 9:35 PM');
    expect(formatPostedAt('2026-07-04T09:05')).toBe('Posted Jul 4, 9:05 AM');
  });
  test.each([undefined, '', 'garbage'])('returns null for %s', (v) => {
    expect(formatPostedAt(v)).toBeNull();
  });
});

describe('shouldShowNotice', () => {
  test('hides a blank message even when enabled', () => {
    expect(shouldShowNotice({ enabled: true, level: 'outage', message: '  ' })).toBe(false);
  });
  test('hides when disabled', () => {
    expect(shouldShowNotice({ enabled: false, level: 'outage', message: 'x' })).toBe(false);
  });
  test('shows when enabled with text', () => {
    expect(shouldShowNotice({ enabled: true, level: 'outage', message: 'x' })).toBe(true);
  });
});

describe('renderNoticeMessage', () => {
  test('renders links and escapes raw HTML', () => {
    const html = renderNoticeMessage('See [status](/support/) <script>x</script>');
    expect(html).toContain('<a href="/support/">status</a>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });
  test('refuses javascript: links', () => {
    expect(renderNoticeMessage('[x](javascript:alert(1))')).not.toContain('href="javascript');
  });
});

describe('<NoticeBanner>', () => {
  const render = async (notice: object) =>
    (await AstroContainer.create()).renderToString(NoticeBanner, { props: { notice } });

  test('renders message, level class and posted time', async () => {
    const html = await render({ enabled: true, level: 'maintenance', message: 'Cutover tonight', posted_at: '2026-12-09T21:10:00Z' });
    expect(html).toContain('notice--maintenance');
    expect(html).toContain('role="status"');
    expect(html).toContain('Cutover tonight');
    expect(html).toContain('Posted Dec 9, 4:10 PM');
  });
  test('omits the Posted line when there is no time', async () => {
    const html = await render({ enabled: true, level: 'outage', message: 'Down' });
    expect(html).toContain('Down');
    expect(html).not.toContain('Posted');
  });
  test('renders nothing when off', async () => {
    const html = await render({ enabled: false, level: 'outage', message: 'Down' });
    expect(html.trim()).toBe('');
  });
});
