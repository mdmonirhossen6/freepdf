'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useLang } from '@/lib/i18n';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Scrubbing text reveal: words start at low opacity and sequentially reach
 * full opacity, driven directly by scroll position (scrub: true).
 * Bangla word-shaping stays intact because each word is a single span.
 */
export default function StatementReveal() {
  const ref = useRef<HTMLParagraphElement>(null);
  const { t } = useLang();
  const text = t.statement;

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (!ref.current) return;
      const words = ref.current.querySelectorAll('[data-word]');
      if (words.length === 0) return;
      gsap.fromTo(
        words,
        { opacity: 0.12 },
        {
          opacity: 1,
          ease: 'none',
          stagger: 0.15,
          scrollTrigger: { trigger: ref.current, start: 'top 80%', end: 'bottom 45%', scrub: true },
        },
      );
    },
    { scope: ref, dependencies: [text] },
  );

  return (
    <p
      ref={ref}
      className="text-center text-3xl font-semibold leading-snug tracking-tight text-[var(--c-fg)] sm:text-4xl lg:text-5xl"
    >
      {text.split(' ').map((word, index) => (
        <span key={`${word}-${index}`} data-word className="inline-block">
          {word}
          {'\u00A0'}
        </span>
      ))}
    </p>
  );
}
