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
    <div className="pb-14">
      <div className="wrap page-head">
        <h1 className="page-title">{t.cat.title}</h1>
        <p className="page-lede">{fill(t.cat.subtitle, { count: fmt(TOTAL_RESOURCES) })}</p>
      </div>

      <Bento categories={CATEGORY_META} heading={false} />
    </div>
  );
}
