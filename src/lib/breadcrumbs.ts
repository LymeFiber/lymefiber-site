export type Crumb = { label: string; href: string };

/** Home → each ancestor path that has a page → this page. Empty on the home page. */
export function breadcrumbsFor(permalink: string, titleOf: (p: string) => string | undefined): Crumb[] {
  if (permalink === '/') return [];
  const parts = permalink.split('/').filter(Boolean);
  const crumbs: Crumb[] = [{ label: 'Home', href: '/' }];
  parts.forEach((_, i) => {
    const href = `/${parts.slice(0, i + 1).join('/')}/`;
    const label = titleOf(href);
    if (label) crumbs.push({ label, href });
  });
  return crumbs;
}
