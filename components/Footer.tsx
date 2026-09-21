import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-[var(--c-line-strong)] bg-[var(--c-bg)]">
      <div className="mx-auto max-w-6xl px-5 pb-10 pt-12 text-sm text-[var(--c-fg-muted)] sm:px-8 lg:px-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3 text-[var(--c-fg-muted)]">
            <p className="font-display text-lg font-semibold text-[var(--c-fg)]">Free Pdf</p>
            <p className="max-w-md text-[var(--c-fg-muted)]">
              A static, searchable index of study resources from the{' '}
              <a
                href="https://t.me/hscfreepdf"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline-offset-2 hover:text-[var(--c-accent)] hover:underline"
              >
                @hscfreepdf
              </a>{' '}
              Telegram channel. All links point to the original Telegram posts.
            </p>
          </div>
          <nav className="flex flex-wrap gap-6 text-[var(--c-fg-muted)]" aria-label="Footer links">
            <Link href="https://t.me/hscfreepdf" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-[var(--c-accent)] hover:underline">
              Telegram channel
            </Link>
            <Link href="https://prostuti.bd" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-[var(--c-accent)] hover:underline">
              Prostuti
            </Link>
            <Link href="/browse" className="underline-offset-2 hover:text-[var(--c-accent)] hover:underline">
              Browse latest
            </Link>
            <Link href="/search" className="underline-offset-2 hover:text-[var(--c-accent)] hover:underline">
              Search
            </Link>
          </nav>
          <p className="text-[var(--c-fg-subtle)] text-xs text-center md:text-left">
            &copy; {new Date().getFullYear()} Free Pdf. Built as a static site. No server. No database.
          </p>
        </div>
      </div>
    </footer>
  );
}