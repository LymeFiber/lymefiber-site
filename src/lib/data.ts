import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { z } from 'astro/zod';
import { documentSchema, menuItemSchema, noticeSchema, settingsSchema } from './schemas';
import type { Doc, MenuItem, Notice, Settings } from './schemas';

export { PERMALINK_PATTERN } from './schemas';
export type { Doc, MenuItem, Notice, Settings } from './schemas';

const DATA_DIR = join(process.cwd(), 'src/data');
const load = (name: string) => parse(readFileSync(join(DATA_DIR, name), 'utf8')) ?? {};

export const getSettings = (): Settings => settingsSchema.parse(load('settings.yaml'));
export const getNotice = (): Notice => noticeSchema.parse(load('notice.yaml'));
export const getMenu = (): MenuItem[] => z.array(menuItemSchema).parse(load('menu.yaml').items ?? []);
export const getDocuments = (): Doc[] => z.array(documentSchema).parse(load('documents.yaml').documents ?? []);
