import type { Notice } from './schemas';

const FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const HAS_ZONE = /(Z|[+-]\d\d:?\d\d)$/i;
const WALL_TIME = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::(\d\d))?/;

/** Minutes Eastern time is behind UTC at the given instant (300 or 240). */
function easternOffsetMinutes(at: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(at).map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return Math.round((at.getTime() - asUtc) / 60000);
}

/** Parse a timestamp; one without a time zone (as the editor saves it) is Eastern time. */
function parsePostedAt(iso: string): Date {
  const m = iso.match(WALL_TIME);
  if (HAS_ZONE.test(iso) || !m) return new Date(iso);
  const [, y, mo, d, h, mi, s = '0'] = m;
  const wallAsUtc = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
  // Two passes so times near a daylight-saving change land on the right offset.
  let guess = new Date(wallAsUtc + easternOffsetMinutes(new Date(wallAsUtc)) * 60000);
  guess = new Date(wallAsUtc + easternOffsetMinutes(guess) * 60000);
  return guess;
}

/** "Posted Dec 9, 4:10 PM" in Eastern time, or null if the time is missing or invalid. */
export function formatPostedAt(iso?: string | null): string | null {
  if (!iso) return null;
  const d = parsePostedAt(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `Posted ${FMT.format(d).replace(/ /g, ' ').replace(' at ', ', ')}`;
}

export function shouldShowNotice(n: Notice): boolean {
  return n.enabled && n.message.trim().length > 0;
}

const escapeHtml = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SAFE_URL = /^(https?:\/\/|\/|mailto:|tel:)/i;

/** Escape HTML, then allow [links](url) and **bold** only. */
export function renderNoticeMessage(message: string): string {
  return escapeHtml(message)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, text, url) =>
      SAFE_URL.test(url) ? `<a href="${url}">${text}</a>` : text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
