import { defaultComponents, getCollection, getEntry } from '@takazudo/zfb/content';
import { AppShell } from '../../components/app-shell';

interface ProseFrontmatter {
  title: string;
  lang?: string;
}

export function paths() {
  return getCollection<ProseFrontmatter>('prose').map((entry) => ({
    params: { slug: entry.slug },
    props: { entrySlug: entry.slug },
  }));
}

export default function ProsePage({ entrySlug }: { entrySlug: string }) {
  const entry = getEntry<ProseFrontmatter>('prose', entrySlug);
  if (!entry) throw new Error(`Missing prose entry: ${entrySlug}`);
  const Content = entry.Content;
  const path = `/prose/${entrySlug}/`;

  return (
    <AppShell title={`${entry.data.title} — zdtp playground`} activePath={path} lang={entry.data.lang}>
      <article class="zfb-prose">
        <Content components={{ ...defaultComponents }} />
      </article>
    </AppShell>
  );
}
