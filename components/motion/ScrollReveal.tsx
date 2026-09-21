'use client';

import { useRef } from 'react';
import type { ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface ScrollRevealProps {
  children: ReactNode;
  /** Scale/fade-scroll paradigm: children start slightly small + shifted, grow to rest. */
  stagger?: number;
  start?: string;
}

export default function ScrollReveal({ children, stagger = 0.08, start = 'top 82%' }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const targets = ref.current?.querySelectorAll('[data-reveal]');
      if (!targets || targets.length === 0) return;
      gsap.fromTo(
        targets,
        { opacity: 0, y: 28, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.7,
          ease: 'power3.out',
          stagger,
          scrollTrigger: { trigger: ref.current, start, once: true },
        },
      );
    },
    { scope: ref },
  );

  return <div ref={ref}>{children}</div>;
}
