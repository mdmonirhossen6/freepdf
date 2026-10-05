'use client';

import Bento from './Bento';
import { CATEGORY_META } from '@/lib/categories';
import { TOTAL_RESOURCES } from '@/lib/generated/resources';
import { useLang, fill } from '@/lib/i18n';

/**
 * The contents page: one nameplate for the whole list, then the shelves. The
 * heading lives here rather than inside the shelves block so the page does not
 * print two headings a line apart.
 */
export default function CategoryIndex() {
  const { t, fmt } = useLang();

  return (
    <div className="pb-14 pt-8">
      <div className="wrap">
        <h1 className="font-display text-[1.9rem] font-semibold tracking-[-0.015em] sm:text-[2.3rem]">{t.cat.title}</h1>
        <p className="mt-2 max-w-[72ch] text-[var(--c-fg-muted)]">
          {fill(t.cat.subtitle, { count: fmt(TOTAL_RESOURCES) })}
        </p>
      </div>

      <div className="mt-8">
        <Bento categories={CATEGORY_META} heading={false} />
      </div>
    </div>
  );
}
