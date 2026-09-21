'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type Lang = 'en' | 'bn';

const en0 = {
  nav: { search: 'Search', categories: 'Categories', browse: 'Browse' },
  a11y: {
    openSearch: 'Open search',
    toDark: 'Switch to dark theme',
    toLight: 'Switch to light theme',
    lang: 'Language',
  },
  hero: {
    eyebrow: 'The @hscfreepdf index',
    titleA: 'Every PDF,',
    titleAccent: 'one search',
    titleB: 'away.',
    subtitle:
      'HSC, university admission, medical, engineering, BCS and more — {count} resources from the Telegram channel. No sign-up. Always free.',
    searchBtn: 'Search',
    browse: 'browse the full index',
  },
  recent: { title: 'Recent', viewAll: 'View all', recentTitle: 'Recent searches', clear: 'Clear' },
  bento: {
    eyebrow: 'The full index',
    heading: 'Seven tracks. One shelf.',
    all: 'All categories',
    stat: 'free resources. No sign-up, ever.',
    resources: 'resources',
  },
  statement: 'One channel. One index. Every book, test paper and digest — searchable in seconds, free forever.',
  latest: {
    eyebrow: 'Recently added',
    heading: 'Newest resources',
    uploaded: 'Latest upload: {date}',
    viewAll: 'View all {count} resources',
  },
  cta: {
    heading: "Can't find it? Ask the channel.",
    body: 'New resources are posted and indexed every day. If something is missing, request it directly on Telegram — a human answers.',
    button: 'Open @hscfreepdf',
  },
  card: {
    open: 'Open on Telegram',
    copy: 'Copy link',
    copied: 'Copied',
    copyAria: 'Copy link to Telegram post',
    date: 'Date',
    category: 'Category',
    related: 'Related resources',
    close: 'Close',
    generic: 'Resource',
  },
  footer: {
    about:
      'A static, searchable index of study resources from the @hscfreepdf Telegram channel. All links point to the original Telegram posts.',
    channel: 'Telegram channel',
    browseLatest: 'Browse latest',
    search: 'Search',
    note: 'Built as a static site. No server. No database.',
  },
  search: {
    title: 'Search resources',
    subtitle: '{count} resources indexed across HSC, admission, medical, engineering, BCS and more.',
    results: 'results',
    clear: 'Clear filters',
    loading: 'Loading search…',
    query: 'Search query',
  },
  dym: 'Did you mean:',
  empty: {
    title: 'No matching resources found',
    prefix: "We couldn't find anything for",
    try: 'Try:',
    tips: [
      'Checking the spelling',
      'Using a shorter, broader term',
      'Searching in Bengali or English (both work)',
      'Clearing the type or category filters',
    ],
    popular: 'Popular resources instead',
    browseAll: 'Browse all {count} resources',
  },
  filter: { type: 'Resource type', category: 'Education category' },
  sort: { label: 'Sort', relevance: 'Relevance', newest: 'Newest', oldest: 'Oldest' },
  browse: {
    title: 'Browse by date',
    subtitle: 'All {count} indexed resources, newest first — grouped by the day they were posted to the channel.',
    items: 'items',
    showMore: 'Show more dates',
    remaining: '{count} remaining',
    jump: 'Jump to month',
  },
  cat: {
    title: 'Categories',
    subtitle: "Browse all {count} indexed resources by exam track. Categories are inferred from each post's title.",
    home: 'Home',
    notFound: 'Page not found',
    notFoundBody: "This category isn't available right now.",
    back: 'Back to home',
    countLabel: '{name} resources',
  },
};

type Cats = Record<string, { name: string; blurb: string }>;

const CATS_EN: Cats = {
  hsc: { name: 'HSC', blurb: 'HSC board books, test papers, supplements, compact series and guides.' },
  'university-admission': {
    name: 'University Admission',
    blurb: 'Varsity, guccha (GST) and unit-wise admission question banks.',
  },
  medical: { name: 'Medical', blurb: 'Medical & dental admission guides, marked books and weekly exams.' },
  engineering: { name: 'Engineering', blurb: 'BUET, KUET, RUET, CUET, BUTEX and engineering admission material.' },
  'bcs-jobs': { name: 'BCS & Jobs', blurb: 'BCS, bank and job preparation resources.' },
  'current-affairs': { name: 'Current Affairs', blurb: 'Monthly current affairs, capsules and digests.' },
  general: { name: 'General', blurb: 'School, language and everything else indexed from the channel.' },
};

const en: Omit<typeof en0, 'cats'> & { cats: Cats } = { ...en0, cats: CATS_EN };

type Dict = typeof en;

const bn: Dict = {
  nav: { search: 'সার্চ', categories: 'ক্যাটাগরি', browse: 'ব্রাউজ' },
  a11y: {
    openSearch: 'সার্চ খুলুন',
    toDark: 'ডার্ক থিমে যান',
    toLight: 'লাইট থিমে যান',
    lang: 'ভাষা',
  },
  hero: {
    eyebrow: '@hscfreepdf ইনডেক্স',
    titleA: 'প্রতিটি পিডিএফ,',
    titleAccent: 'এক সার্চেই',
    titleB: 'হাতের মুঠোয়।',
    subtitle:
      'এইচএসসি, বিশ্ববিদ্যালয় ভর্তি, মেডিকেল, ইঞ্জিনিয়ারিং, বিসিএস ও আরও অনেক কিছু — টেলিগ্রাম চ্যানেলের {count} রিসোর্স। সাইন-আপ লাগে না, চিরকাল ফ্রি।',
    searchBtn: 'সার্চ',
    browse: 'পুরো ইনডেক্স ব্রাউজ করুন',
  },
  recent: { title: 'সাম্প্রতিক', viewAll: 'সব দেখুন', recentTitle: 'সাম্প্রতিক সার্চ', clear: 'মুছুন' },
  bento: {
    eyebrow: 'পুরো ইনডেক্স',
    heading: 'সাতটি ট্র্যাক, একটাই তাক।',
    all: 'সব ক্যাটাগরি',
    stat: 'ফ্রি রিসোর্স — কোনো সাইন-আপ নেই।',
    resources: 'রিসোর্স',
  },
  statement: 'একটি চ্যানেল, একটি ইনডেক্স। প্রতিটি বই, টেস্ট পেপার ও ডাইজেস্ট — সেকেন্ডেই সার্চ, চিরকাল ফ্রি।',
  latest: {
    eyebrow: 'সাম্প্রতিক সংযোজন',
    heading: 'নতুন রিসোর্স',
    uploaded: 'সর্বশেষ আপলোড: {date}',
    viewAll: 'সব {count} রিসোর্স দেখুন',
  },
  cta: {
    heading: 'খুঁজে পাওয়া যাচ্ছে না? চ্যানেলে জানান।',
    body: 'প্রতিদিন নতুন রিসোর্স পোস্ট ও ইনডেক্স করা হয়। কিছু বাদ পড়লে সরাসরি টেলিগ্রামে রিকোয়েস্ট করুন — মানুষই উত্তর দেয়।',
    button: '@hscfreepdf খুলুন',
  },
  card: {
    open: 'টেলিগ্রামে খুলুন',
    copy: 'লিংক কপি',
    copied: 'কপি হয়েছে',
    copyAria: 'টেলিগ্রাম পোস্টের লিংক কপি করুন',
    date: 'তারিখ',
    category: 'ক্যাটাগরি',
    related: 'সম্পর্কিত রিসোর্স',
    close: 'বন্ধ করুন',
    generic: 'রিসোর্স',
  },
  footer: {
    about: '@hscfreepdf টেলিগ্রাম চ্যানেলের স্টাডি রিসোর্সের একটি স্ট্যাটিক, সার্চেবল ইনডেক্স। সব লিংক মূল টেলিগ্রাম পোস্টে যায়।',
    channel: 'টেলিগ্রাম চ্যানেল',
    browseLatest: 'সর্বশেষ ব্রাউজ করুন',
    search: 'সার্চ',
    note: 'স্ট্যাটিক সাইট — সার্ভার নেই, ডেটাবেজ নেই।',
  },
  search: {
    title: 'রিসোর্স সার্চ',
    subtitle: '{count} রিসোর্স ইনডেক্স করা আছে — এইচএসসি, ভর্তি, মেডিকেল, ইঞ্জিনিয়ারিং, বিসিএসসহ আরও অনেক কিছু।',
    results: 'ফলাফল',
    clear: 'ফিল্টার মুছুন',
    loading: 'সার্চ লোড হচ্ছে…',
    query: 'সার্চ করার বিষয়',
  },
  dym: 'আপনি কি এটি খুঁজছেন:',
  empty: {
    title: 'কোনো ম্যাচিং রিসোর্স পাওয়া যায়নি',
    prefix: 'এখানে কিছু পাওয়া যায়নি:',
    try: 'চেষ্টা করুন:',
    tips: [
      'বানান যাচাই করা',
      'ছোট, বেশি সাধারণ শব্দ দিয়ে সার্চ করা',
      'বাংলা বা ইংরেজি — দুটোতেই সার্চ কাজ করে',
      'টাইপ বা ক্যাটাগরি ফিল্টার মুছে ফেলা',
    ],
    popular: 'বিকল্প: জনপ্রিয় রিসোর্স',
    browseAll: 'সব {count} রিসোর্স ব্রাউজ করুন',
  },
  filter: { type: 'রিসোর্স টাইপ', category: 'শিক্ষা ক্যাটাগরি' },
  sort: { label: 'সাজান', relevance: 'প্রাসঙ্গিকতা', newest: 'নতুন আগে', oldest: 'পুরনো আগে' },
  browse: {
    title: 'তারিখ অনুযায়ী ব্রাউজ',
    subtitle: 'মোট {count} ইনডেক্স করা রিসোর্স, নতুন আগে — চ্যানেলে পোস্ট করার দিন অনুযায়ী গোট করা।',
    items: 'টি',
    showMore: 'আরও তারিখ দেখুন',
    remaining: '{count} বাকি',
    jump: 'মাসে যান',
  },
  cat: {
    title: 'ক্যাটাগরি',
    subtitle: 'মোট {count} ইনডেক্স করা রিসোর্স, পরীক্ষার ট্র্যাক অনুযায়ী। ক্যাটাগরিগুলো পোস্টের শিরোনাম থেকে অনুমিত।',
    home: 'হোম',
    notFound: 'পৃষ্ঠা পাওয়া যায়নি',
    notFoundBody: 'এই ক্যাটাগরিটি আপাতত নেই।',
    back: 'হোমে ফিরে যান',
    countLabel: '{name} রিসোর্স',
  },
  cats: {
    hsc: { name: 'এইচএসসি', blurb: 'এইচএসসি বোর্ড বই, টেস্ট পেপার, সাপ্লিমেন্ট, কম্প্যাক্ট সিরিজ ও গাইড।' },
    'university-admission': {
      name: 'বিশ্ববিদ্যালয় ভর্তি',
      blurb: 'ভার্সিটি, গুচ্ছ (GST) ও ইউনিটভিত্তিক ভর্তি প্রশ্নব্যাংক।',
    },
    medical: { name: 'মেডিকেল', blurb: 'মেডিকেল ও ডেন্টাল ভর্তি গাইড, মার্কড বই ও সাপ্তাহিক পরীক্ষা।' },
    engineering: {
      name: 'ইঞ্জিনিয়ারিং',
      blurb: 'বুয়েট, কুয়েট, রুয়েট, চুয়েট, বুটেক্সসহ ইঞ্জিনিয়ারিং ভর্তির সব ম্যাটেরিয়াল।',
    },
    'bcs-jobs': { name: 'বিসিএস ও চাকরি', blurb: 'বিসিএস, ব্যাংক ও চাকরির প্রস্তুতির রিসোর্স।' },
    'current-affairs': { name: 'কারেন্ট অ্যাফেয়ার্স', blurb: 'মাসিক কারেন্ট অ্যাফেয়ার্স, ক্যাপসুল ও ডাইজেস্ট।' },
    general: { name: 'সাধারণ', blurb: 'স্কুল, ভাষা ও চ্যানেলে ইনডেক্স করা বাকি সব।' },
  },
};

const DICTS: Record<Lang, Dict> = { en, bn };

interface LangContextValue {
  lang: Lang;
  locale: 'en-US' | 'bn-BD';
  setLang: (lang: Lang) => void;
  t: Dict;
  fmt: (value: number) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

const STORAGE_KEY = 'hscfreepdf_lang';

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'bn' || stored === 'en') setLangState(stored);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const setLang = (next: Lang) => {
    setLangState(next);
    document.documentElement.lang = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  };

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      locale: lang === 'bn' ? 'bn-BD' : 'en-US',
      setLang,
      t: DICTS[lang],
      fmt: (v: number) => v.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US'),
    }),
    [lang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}

/** Replaces {tokens} in a dictionary string: fill('{count} items', { count: 5 }). */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}
