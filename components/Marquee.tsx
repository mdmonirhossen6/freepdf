const TOPICS = [
  'রসায়ন ২য় পত্র',
  'পদার্থবিজ্ঞান',
  'জোবায়ের সিরিজ',
  'Retina Digest',
  'BCS Preliminary',
  'গুচ্ছ (GST) ভর্তি',
  'Current Affairs সেপ্টেম্বর',
  'BUET প্রশ্নব্যাংক',
  'মেডিকেল ভর্তি প্রস্তুতি',
  'HSC Test Paper',
  'উচ্চতর গণিত',
  'Alals Current HOUR',
];

export default function Marquee() {
  const row = [...TOPICS, ...TOPICS];

  return (
    <div className="overflow-hidden border-b border-[var(--c-line)] py-4" aria-hidden="true">
      <div className="animate-marquee flex w-max items-center">
        {row.map((topic, index) => (
          <span key={`${topic}-${index}`} className="flex items-center whitespace-nowrap text-sm font-medium text-[var(--c-fg-muted)]">
            <span className="px-6">{topic}</span>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-accent)]" />
          </span>
        ))}
      </div>
    </div>
  );
}
