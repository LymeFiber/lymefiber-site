import { z } from 'astro/zod';

/** URL path for a page: lowercase words joined by hyphens, starting and ending with "/". */
export const PERMALINK_PATTERN = /^\/([a-z0-9]+(-[a-z0-9]+)*\/)*$/;

export const SETTINGS_KEYS = [
  'support_phone', 'tollfree_phone', 'support_email', 'transition_email', 'postal_address',
  'billing_portal_url', 'phone_portal_url', 'signup_url', 'labels_base_url', 'copyright_name',
] as const;

export const settingsSchema = z.object(
  Object.fromEntries(SETTINGS_KEYS.map((k) => [k, z.coerce.string()])) as Record<(typeof SETTINGS_KEYS)[number], z.ZodString>,
);

export const noticeSchema = z.object({
  enabled: z.boolean().default(false),
  level: z.enum(['outage', 'maintenance', 'info']).default('outage'),
  message: z.string().nullish().transform((m) => m ?? ''),
  posted_at: z.union([z.string(), z.date()]).nullish().transform((d) => (d instanceof Date ? d.toISOString() : d ?? undefined)),
});

export type MenuItem = { label: string; href?: string; external?: boolean; children?: MenuItem[] };
export const menuItemSchema: z.ZodType<MenuItem> = z.lazy(() =>
  z.object({
    label: z.string(),
    href: z.string().optional(),
    external: z.boolean().optional(),
    children: z.array(menuItemSchema).optional(),
  }),
);

export const documentSchema = z.object({
  title: z.string(),
  description: z.string().default(''),
  file: z.string(),
  category: z.enum(['Policies', 'Phone', 'Customer Forms']),
  updated: z.union([z.string(), z.date()]).transform((d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d)),
});

export const pageSchema = z.object({
  title: z.string(),
  description: z.string().default(''),
  permalink: z.string().regex(PERMALINK_PATTERN, 'URL path must look like /plans/ or /plans/broadband-labels/ (lowercase, hyphens, slashes at both ends)'),
  layout: z.enum(['page', 'home']).default('page'),
  labels_csv: z.string().optional(),
});

export type Settings = z.infer<typeof settingsSchema>;
export type Notice = z.infer<typeof noticeSchema>;
export type Doc = z.infer<typeof documentSchema>;
