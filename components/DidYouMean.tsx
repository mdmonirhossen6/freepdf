'use client';

interface DidYouMeanProps {
  suggestion: string;
  query: string;
  onSelect: (suggestion: string) => void;
}

export default function DidYouMean({ suggestion, query, onSelect }: DidYouMeanProps) {
  if (!suggestion) return null;
  const text = suggestion.replace(/^Did you mean:\s*/, '');

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--c-line-strong)] bg-[var(--c-bg-subtle)] px-4 py-3 text-sm">
      <svg
        className="h-4 w-4 shrink-0 text-[var(--c-fg-muted)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3a6 6 0 0 0-6 6c0 3 2 4 2 7a4 4 0 0 0 8 0c0-3 2-4 2-7a6 6 0 0 0-6-6Z" />
        <path d="M12 17h.01" />
      </svg>
      <span className="text-[var(--c-fg-muted)]">Did you mean:</span>
      <button
        type="button"
        onClick={() => onSelect(text)}
        className="font-medium text-[var(--c-accent)] hover:underline"
      >
        {text}
      </button>
      <span className="sr-only">Suggested correction for the search term {query}</span>
    </div>
  );
}