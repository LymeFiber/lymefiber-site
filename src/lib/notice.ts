import type { Notice } from './schemas';

const FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** "Posted Dec 9, 4:10 PM" in Eastern time, or null if the time is missing or invalid. */
export function formatPostedAt(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
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
