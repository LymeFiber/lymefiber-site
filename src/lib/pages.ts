export type PageRef = { id: string; permalink: string };
export type Skipped = { id: string; permalink: string; keptId: string };

/** The page that naturally owns an address: home.md for "/", else the file named after the last segment. */
const naturalOwner = (permalink: string) =>
  permalink === '/' ? 'home' : permalink.split('/').filter(Boolean).pop();

/**
 * Pick one page per address. A new page can never take over an existing page's address:
 * home.md always owns "/", and otherwise the page whose file name matches the address wins,
 * falling back to the first file name alphabetically.
 */
export function selectPages<T extends PageRef>(pages: T[]): { kept: T[]; skipped: Skipped[] } {
  const byPermalink = new Map<string, T[]>();
  for (const page of [...pages].sort((a, b) => a.id.localeCompare(b.id))) {
    byPermalink.set(page.permalink, [...(byPermalink.get(page.permalink) ?? []), page]);
  }
  const kept: T[] = [];
  const skipped: Skipped[] = [];
  for (const [permalink, group] of byPermalink) {
    const owner = group.find((pg) => pg.id === naturalOwner(permalink)) ?? group[0];
    kept.push(owner);
    for (const other of group) if (other !== owner) skipped.push({ id: other.id, permalink, keptId: owner.id });
  }
  return { kept, skipped };
}
