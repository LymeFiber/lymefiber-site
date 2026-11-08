import { describe, expect, test } from 'vitest';
import { getSettings, getMenu, getNotice, getDocuments, PERMALINK_PATTERN } from '../src/lib/data';

describe('settings', () => {
  test('has the launch values for all ten keys', () => {
    expect(getSettings()).toEqual({
      support_phone: '603-795-0915',
      tollfree_phone: '833-795-5300',
      support_email: 'support@notices.lymefiber.net',
      transition_email: 'transition@lymefiber.net',
      postal_address: 'P.O. Box 323, South Royalton, VT 05068',
      billing_portal_url: 'https://account.lymefiber.net',
      phone_portal_url: 'https://portal.gwi.net/',
      signup_url: 'https://order.lymefiber.net',
      labels_base_url: 'https://order.lymefiber.net/broadband-facts/',
      copyright_name: 'LymeFiber LLC',
    });
  });
});

describe('menu', () => {
  test('has the five top-level sections in order', () => {
    expect(getMenu().map((m) => m.label)).toEqual([
      'Plans & Pricing', 'Get Connected', 'Phone Service', 'Support', 'About',
    ]);
  });
  test('children match the spec', () => {
    const kids = Object.fromEntries(getMenu().map((m) => [m.label, m.children!.map((c) => c.label)]));
    expect(kids['Plans & Pricing']).toEqual(['Service Plans & Pricing', 'Broadband Fact Labels']);
    expect(kids['Get Connected']).toEqual(['Sign Up', 'Installation & Scheduling', 'Exterior Connection', 'Contractor List & Specs']);
    expect(kids['Phone Service']).toEqual(['VoIP Phone Service', 'Telephone User Guide', 'Power Outages & Phone Service', 'E911 Disclaimer', 'Phone Letter of Agency']);
    expect(kids['Support']).toEqual(['Support Home', 'FAQ', 'System Upgrade FAQ', 'Contact Us', 'Billing Portal', 'Phone Portal']);
    expect(kids['About']).toEqual(['About LymeFiber', '2027 Transition', 'Expanding to Orford & Hanover', 'Policies & Documents']);
  });
  test('portal and sign-up links are external tokens', () => {
    const all = getMenu().flatMap((m) => m.children ?? []);
    expect(all.find((c) => c.label === 'Sign Up')).toMatchObject({ href: '{{signup_url}}', external: true });
    expect(all.find((c) => c.label === 'Billing Portal')).toMatchObject({ href: '{{billing_portal_url}}', external: true });
  });
});

describe('notice', () => {
  test('starts switched off', () => {
    expect(getNotice().enabled).toBe(false);
  });
});

describe('documents', () => {
  test('lists the eleven kept files', () => {
    const docs = getDocuments();
    expect(docs).toHaveLength(11);
    expect(docs.every((d) => d.file.startsWith('/documents/') && d.file.endsWith('.pdf'))).toBe(true);
    expect(new Set(docs.map((d) => d.category))).toEqual(new Set(['Policies', 'Phone', 'Customer Forms']));
  });
});

describe('PERMALINK_PATTERN', () => {
  test.each(['/', '/plans/', '/plans/broadband-labels/'])('accepts %s', (p) => {
    expect(PERMALINK_PATTERN.test(p)).toBe(true);
  });
  test.each(['/About Us/', 'about-us', '/plans', '/Plans/'])('rejects %s', (p) => {
    expect(PERMALINK_PATTERN.test(p)).toBe(false);
  });
});
