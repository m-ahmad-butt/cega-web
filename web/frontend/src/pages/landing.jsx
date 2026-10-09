import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { ArrowRight, Calendar, CheckCircle, Users, Shield, Clock, MapPin, FileText, Printer, HelpCircle } from 'lucide-react';

const AVATARS = [
  '/notion/pile-1.webp',
  '/notion/pile-2.webp',
  '/notion/pile-3.webp',
  '/notion/pile-4.webp',
];

function HeroAvatars() {
  return (
    <div className="mb-3 flex w-full max-w-[20rem] flex-wrap items-center justify-center -space-x-1.5 sm:max-w-none">
      {AVATARS.map((src) => (
        <img key={src} src={src} alt="" className="h-12 w-12 rounded-full bg-white object-cover ring-2 ring-white sm:h-[58px] sm:w-[58px]" />
      ))}
      <FolderFace />
      <GlassesFace />
      <SquiggleFace />
    </div>
  );
}

function FolderFace() {
  return (
    <div className="rounded-full ring-2 ring-white">
      <svg viewBox="0 0 64 64" className="h-12 w-12 sm:h-[58px] sm:w-[58px]" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="#4c9cf0" />
        <path d="M18 28.5h10.2l2.6 3.2H46V44a2 2 0 0 1-2 2H18V28.5z" fill="#fff" stroke="#111" strokeWidth="2.2" strokeLinejoin="round" />
        <circle cx="28" cy="37" r="1.5" fill="#111" />
        <circle cx="36" cy="37" r="1.5" fill="#111" />
        <path d="M27 41.5c1.6 1.4 8.4 1.4 10 0" fill="none" stroke="#111" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function GlassesFace() {
  return (
    <div className="rounded-full ring-2 ring-white">
      <svg viewBox="0 0 64 64" className="h-12 w-12 sm:h-[58px] sm:w-[58px]" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="#fff" stroke="#ef5b4c" strokeWidth="4" />
        <circle cx="32" cy="34" r="14" fill="#f3f1ec" stroke="#111" strokeWidth="2" />
        <path d="M20 30h8.5a5 5 0 0 1 7 0H44" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" />
        <circle cx="26.5" cy="33" r="3.2" fill="none" stroke="#111" strokeWidth="1.8" />
        <circle cx="37.5" cy="33" r="3.2" fill="none" stroke="#111" strokeWidth="1.8" />
        <path d="M28 42c1.2 1.2 6.8 1.2 8 0" fill="none" stroke="#111" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M22 24c2-3 6-4 10-3M42 24c-2-3-6-4-10-3" fill="none" stroke="#111" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function SquiggleFace() {
  return (
    <div className="rounded-full ring-2 ring-white">
      <svg viewBox="0 0 64 64" className="h-12 w-12 sm:h-[58px] sm:w-[58px]" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="#fff" stroke="#f0b429" strokeWidth="4" />
        <path d="M22 26c2-4 6-2 7 1M36 25c2-3 6-1 6 2" fill="none" stroke="#111" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="26" cy="32" r="1.7" fill="#111" />
        <circle cx="40" cy="32" r="1.7" fill="#111" />
        <path d="M24 40c3 4 13 4 16-1" fill="none" stroke="#111" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function BookSticker() {
  return (
    <svg viewBox="0 0 72 72" className="h-16 w-16 drop-shadow-md" aria-hidden="true">
      <circle cx="36" cy="36" r="32" fill="#f6c945" />
      <path d="M24 22h16.5a6 6 0 0 1 6 6v22H30a6 6 0 0 0-6 6V22z" fill="#fff" stroke="#1a1a1a" strokeWidth="2" />
      <path d="M30 28h12M30 33h10" stroke="#1a1a1a" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="50" cy="50" r="8" fill="#fff" stroke="#1a1a1a" strokeWidth="1.6" />
      <path d="M47 50.2 49.2 52.4 53.5 48" fill="none" stroke="#1a1a1a" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CheckSticker() {
  return (
    <svg viewBox="0 0 72 72" className="h-16 w-16 drop-shadow-md" aria-hidden="true">
      <path d="M58 14l2 3 3 .4-2.2 2.2.6 3.2L58 21l-3.4 1.8.6-3.2-2.2-2.2 3-.4L58 14z" fill="#7c5cbf" />
      <path d="M18 18l1.2 2 2 .2-1.5 1.4.4 2L18 22.6 16 23.6l.4-2-1.5-1.4 2-.2L18 18z" fill="#7c5cbf" />
      <circle cx="36" cy="40" r="18" fill="#7c5cbf" />
      <path d="M28 40.5 33.2 46 45 33" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BulbSticker() {
  return (
    <svg viewBox="0 0 72 72" className="h-[68px] w-[68px] drop-shadow-md" aria-hidden="true">
      <circle cx="36" cy="36" r="30" fill="#f08a24" />
      <path d="M36 18a12 12 0 0 0-7 21.8V44h14v-4.2A12 12 0 0 0 36 18z" fill="#fff" stroke="#1a1a1a" strokeWidth="2" />
      <path d="M31 48h10M32.5 52h7" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ProductStage({ children }) {
  return (
    <div id="demo" className="relative scroll-mt-24">
      <div className="float-sticker pointer-events-none absolute -left-8 -top-8 z-10 hidden lg:block" style={{ '--tilt': '-12deg' }}>
        <BookSticker />
      </div>
      <div className="float-sticker pointer-events-none absolute -right-6 -top-7 z-10 hidden lg:block" style={{ '--tilt': '8deg', animationDelay: '0.6s' }}>
        <CheckSticker />
      </div>
      <div className="float-sticker pointer-events-none absolute -left-16 top-[38%] z-10 hidden lg:block" style={{ '--tilt': '-6deg', animationDelay: '1.1s' }}>
        <img src="/notion/pile-1.webp" alt="" className="h-14 w-14 rounded-full bg-white shadow-md" />
      </div>
      <div className="float-sticker pointer-events-none absolute -right-8 bottom-16 z-10 hidden lg:block" style={{ '--tilt': '10deg', animationDelay: '0.3s' }}>
        <BulbSticker />
      </div>
      <div className="w-full min-w-0 overflow-hidden rounded-[18px] border border-[#e7e6e3] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
        <div className="flex h-11 items-center gap-2 border-b border-[#eee] px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-[#e4e3df]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#e4e3df]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#e4e3df]" />
          <span className="ml-3 truncate rounded-md bg-[#f6f5f4] px-3 py-1 text-[11px] text-[#9b9a97]">
            examslot.app/student
          </span>
        </div>
        <div className="min-w-0 bg-white p-3 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

function ToolCloud() {
  const tools = [
    ['React', 'Vite', 'Tailwind CSS', 'Redux Toolkit'],
    ['Node.js', 'Express', 'MongoDB', 'Mongoose'],
    ['Docker', 'JWT Auth', 'Nodemailer', 'Redis'],
  ];

  return (
    <div className="mx-auto mt-8 flex max-w-5xl flex-col gap-5">
      {tools.map((row, ri) => (
        <ul key={ri} className="flex flex-wrap items-center justify-center gap-x-1 gap-y-3">
          {row.map((tool, i) => (
            <li key={tool} className="inline-flex items-center">
              {i > 0 && <span className="px-2.5 text-lg leading-none text-[#d3d1cb]" aria-hidden="true">&middot;</span>}
              <span className="inline-flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em] text-[#2f2f2f]">{tool}</span>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

const WORK_CARDS = [
  {
    href: '#how',
    kicker: 'Flexible scheduling',
    title: 'Pick your own exam dates and times. No more fixed date sheets.',
  },
  {
    href: '#features',
    kicker: 'Zero conflicts',
    title: 'The system blocks overlapping exams automatically, every time.',
  },
];

const STEPS = [
  {
    title: 'Admin creates your account',
    body: 'Your university admin registers you in the system. You receive an email with a secure link to set your password.',
  },
  {
    title: 'Select your exam branch',
    body: 'After logging in, choose the campus where you want to sit your papers. This is a one-time selection.',
  },
  {
    title: 'Pick your exam slots',
    body: 'For each assigned course, choose a date and time from the available slots. The system checks for conflicts in real time.',
  },
  {
    title: 'Save and print',
    body: 'Lock in your choices and print a clean date sheet with your name, courses, dates and times. Done.',
  },
];

const FEATURES = [
  {
    key: 'BRANCH',
    icon: <MapPin size={16} />,
    name: 'Branch selection',
    question: 'Where will you sit your papers?',
    body: 'Choose any active campus across the country. Your branch is locked after selection to keep logistics stable.',
  },
  {
    key: 'SLOTS',
    icon: <Clock size={16} />,
    name: 'Slot booking',
    question: 'When will each exam happen?',
    body: 'The admin opens multiple date and time slots per course. You pick the one that works best for your schedule.',
  },
  {
    key: 'CONFLICTS',
    icon: <Shield size={16} />,
    name: 'Conflict detection',
    question: 'What if two exams overlap?',
    body: 'The system compares every selection against your other choices. Overlapping times are blocked before you can save.',
  },
  {
    key: 'DATESHEET',
    icon: <FileText size={16} />,
    name: 'Date sheet',
    question: 'How do I get my final schedule?',
    body: 'After saving, a formatted date sheet with student info, courses, dates and times is generated. Print it or download as PDF.',
  },
  {
    key: 'REQUESTS',
    icon: <HelpCircle size={16} />,
    name: 'Change requests',
    question: 'What if I need to change something?',
    body: 'Raise a request to change your branch or date sheet. The admin reviews it and unlocks the action once if approved.',
  },
];

const MOCK_SLOTS = [
  { time: '09:00 AM', course: 'CS101', taken: 2 },
  { time: '09:00 AM', course: 'CS201', taken: 1, selected: true },
  { time: '11:00 AM', course: 'CS301', taken: 0 },
  { time: '11:00 AM', course: 'MT101', taken: 2 },
  { time: '02:00 PM', course: 'CS401', taken: 0 },
  { time: '02:00 PM', course: 'MT201', taken: 1 },
];

function DemoDateSheet() {
  const slots = [
    { code: 'CS101', title: 'Programming Fundamentals', date: 'Mon, 19 Oct 2026', time: '09:00 - 12:00' },
    { code: 'CS201', title: 'Data Structures', date: 'Tue, 20 Oct 2026', time: '09:00 - 12:00' },
    { code: 'CS301', title: 'Database Systems', date: 'Wed, 21 Oct 2026', time: '11:00 - 14:00' },
    { code: 'MT101', title: 'Calculus', date: 'Thu, 22 Oct 2026', time: '09:00 - 12:00' },
    { code: 'CS401', title: 'Software Engineering', date: 'Fri, 23 Oct 2026', time: '02:00 - 05:00' },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Ahmed Khan &middot; FA20-BCS-001</h3>
          <p className="mt-1 text-sm text-notion-muted">BS Computer Science &middot; Lahore Campus</p>
        </div>
        <div className="flex gap-2">
          {[['Courses', '5'], ['Branch', 'LHR'], ['Status', 'Saved']].map(([label, value]) => (
            <div key={label} className="rounded-notion bg-notion-surface px-3 py-2 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-notion-faint">{label}</div>
              <div className="text-sm font-semibold">{value}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem]">
          <thead>
            <tr className="border-b border-notion-border">
              <th className="n-th">Code</th>
              <th className="n-th">Course</th>
              <th className="n-th">Date</th>
              <th className="n-th">Time</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((s) => (
              <tr key={s.code}>
                <td className="n-td font-mono text-xs">{s.code}</td>
                <td className="n-td">{s.title}</td>
                <td className="n-td">{s.date}</td>
                <td className="n-td">{s.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="n-btn text-xs"><Printer size={14} /> Print Date Sheet</span>
        <span className="text-xs text-notion-faint">Generated on 15 Oct 2026</span>
      </div>
    </div>
  );
}

function DemoSlotPicker() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_260px] lg:gap-8">
      <div className="n-surface order-first flex flex-col items-center justify-center px-4 py-6 text-center lg:order-none lg:col-start-2 lg:row-start-1 lg:px-5 lg:py-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-notion-green">
          <CheckCircle size={22} />
        </div>
        <h4 className="mt-4 text-xl font-bold tracking-tight">All slots chosen</h4>
        <p className="mt-1.5 text-sm text-notion-muted">Ready to save your date sheet</p>
        <div className="mt-4 w-full rounded-notion bg-white px-3 py-2.5 text-xs font-medium">5 of 5 courses selected</div>
      </div>
      <div className="min-w-0 lg:col-start-1 lg:row-start-1">
        <h3 className="text-lg font-semibold">Choose your exam slots</h3>
        <p className="mt-1 text-sm text-notion-muted">Pick a date and time for each assigned course. No overlaps allowed.</p>
        <div className="mt-5 flex items-center gap-2 text-xs font-medium text-notion-muted">
          <Calendar size={15} /> October 2026
        </div>
        <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto pr-1 sm:max-h-none sm:grid-cols-2 sm:overflow-visible sm:pr-0">
          {MOCK_SLOTS.map((slot, i) => {
            const full = slot.taken >= 2;
            return (
              <div key={i} className={`flex items-center justify-between rounded-notion border px-4 py-3 ${slot.selected ? 'border-notion-text bg-notion-surface' : 'border-notion-border bg-white'} ${full ? 'opacity-50' : ''}`}>
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Clock size={15} />
                  <span className="font-mono">{slot.course}</span> &middot; {slot.time}
                </span>
                <span className="text-xs text-notion-muted">{full ? 'Full' : `${2 - slot.taken} seats`}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { id: 'datesheet', label: 'Date Sheet' },
  { id: 'slots', label: 'Slot Picker' },
];

function LandingDemo() {
  const [tab, setTab] = useState('datesheet');
  return (
    <div className="min-w-0">
      <div className="mb-4 grid grid-cols-2 gap-1.5 sm:mb-5 sm:flex sm:flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={tab === t.id
              ? 'rounded-notion bg-[#191919] px-2.5 py-1.5 text-xs font-semibold text-white sm:px-3.5 sm:text-sm'
              : 'rounded-notion px-2.5 py-1.5 text-xs font-medium text-notion-muted transition-colors hover:bg-notion-hover sm:px-3.5 sm:text-sm'
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'datesheet' ? <DemoDateSheet /> : <DemoSlotPicker />}
    </div>
  );
}

import { useState } from 'react';

const LandingPage = () => {
  return (
    <div className="n-page overflow-x-hidden bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#ebeae8] bg-white/95 backdrop-blur-md">
        <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto] items-center px-5 sm:grid-cols-[1fr_auto_1fr] sm:px-6">
          <BrandLogo to="/" imgClassName="h-8 w-auto" />
          <nav className="hidden items-center gap-1 sm:flex">
            <a href="#how" className="rounded-md px-3 py-1.5 text-sm text-[#37352f] hover:bg-[#f6f5f4]">How it works</a>
            <a href="#demo" className="rounded-md px-3 py-1.5 text-sm text-[#37352f] hover:bg-[#f6f5f4]">Demo</a>
            <a href="#features" className="rounded-md px-3 py-1.5 text-sm text-[#37352f] hover:bg-[#f6f5f4]">Features</a>
          </nav>
          <div className="flex shrink-0 items-center justify-end">
            <Link to="/login" className="inline-flex items-center rounded-md bg-[#191919] px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-black">
              Log in
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-5 pb-6 pt-14 sm:px-6 sm:pt-20">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
          <HeroAvatars />
          <h1 className="w-full min-w-0 max-w-full text-[1.85rem] font-bold leading-[1.12] tracking-[-0.035em] text-[#191919] sm:text-5xl sm:leading-[1.02] sm:tracking-[-0.04em] md:text-6xl lg:text-[4.6rem]">
            <span className="flex flex-col items-center sm:hidden">
              <span>Where students</span>
              <span>design their</span>
              <span className="mt-2 inline-flex items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d9f5d0] px-3 py-0.5">
                  <span className="h-2 w-2 rounded-full bg-[#3dcc4a]" />
                  exam schedule
                </span>
              </span>
            </span>
            <span className="hidden sm:block">Where students design</span>
            <span className="mt-2 hidden w-full min-w-0 max-w-full sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-3 sm:gap-y-2">
              <span>their own</span>
              <span className="inline-flex items-center gap-2.5 rounded-full bg-[#d9f5d0] px-5 py-1.5">
                <span className="h-3.5 w-3.5 rounded-full bg-[#3dcc4a]" />
                exam schedule
              </span>
            </span>
          </h1>
          <p className="mt-6 w-full max-w-xl text-base leading-relaxed text-[#6f6e6b] sm:text-lg">
            Choose your exam branch, pick dates and times for every course, and print a personalized date sheet. All conflict-free.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/login" className="inline-flex items-center rounded-md bg-[#191919] px-4 py-2 text-sm font-semibold text-white hover:bg-black">
              Sign in
            </Link>
            <a href="#demo" className="inline-flex items-center rounded-md bg-[#f2f1ef] px-4 py-2 text-sm font-semibold text-[#191919] hover:bg-[#e7e6e3]">
              See the demo
            </a>
          </div>
          <p className="mt-5 max-w-full px-2 text-sm text-[#9b9a97]">
            Virtual University &middot; accounts are created by your admin
          </p>
        </div>

        <div className="mx-auto mt-16 w-full min-w-0 max-w-[1080px] px-1 sm:mt-20 sm:px-8 lg:px-14">
          <ProductStage>
            <LandingDemo />
          </ProductStage>
        </div>
      </section>

      {/* Tech stack */}
      <section className="px-5 py-16 sm:px-6 sm:py-20">
        <p className="text-center text-sm text-[#787774]">The tech stack behind this product</p>
        <ToolCloud />
      </section>

      {/* Two feature cards */}
      <section className="px-5 pb-20 sm:px-6">
        <h2 className="mx-auto max-w-3xl text-center text-3xl font-bold tracking-[-0.04em] text-[#191919] sm:text-5xl lg:text-6xl">
          Your schedule, your way.
        </h2>
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-2">
          {WORK_CARDS.map((card) => (
            <a key={card.href} href={card.href} className="group flex items-center justify-between gap-4 rounded-2xl bg-[#f6f5f4] p-5 transition-colors hover:bg-[#efeeeb] sm:gap-6 sm:p-8">
              <div>
                <p className="text-sm text-[#787774]">{card.kicker}</p>
                <p className="mt-3 max-w-sm text-xl font-semibold leading-snug tracking-tight text-[#191919] sm:text-2xl">{card.title}</p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2f2f2f] text-white transition-transform group-hover:translate-x-0.5">
                <ArrowRight size={16} />
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-[#ebeae8]">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9b9a97]">The path</p>
          <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-[-0.04em] text-[#191919] sm:text-5xl">How it works</h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[#6f6e6b] sm:text-lg">
            Four steps. Your admin does the first one, you do the rest.
          </p>
          <ol className="relative mt-8 grid items-stretch gap-4 sm:mt-16 sm:grid-cols-2 sm:gap-10 lg:grid-cols-4 lg:gap-6">
            <div className="pointer-events-none absolute left-[8%] right-[8%] top-7 hidden h-px bg-[#191919] lg:block" aria-hidden="true" />
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative flex h-full min-w-0 flex-col">
                <div className="relative z-10 hidden h-14 w-14 items-center justify-center rounded-full bg-[#191919] text-sm font-semibold text-white lg:flex">0{i + 1}</div>
                <div className="flex h-full flex-1 flex-col rounded-2xl border border-[#eceae6] bg-[#fafaf9] p-5 lg:mt-6 lg:p-6">
                  <div className="flex items-center gap-3 lg:hidden">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#191919] text-sm font-semibold text-white">0{i + 1}</span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold tracking-tight sm:text-lg lg:mt-0">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#6f6e6b]">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features (dark section) */}
      <section id="features" className="bg-[#111111] text-white">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-24">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">The features</p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-5xl">Everything you need</h2>
            </div>
            <p className="max-w-md text-base leading-relaxed text-white/65">
              Each feature solves one problem and keeps the process simple for both students and administrators.
            </p>
          </div>
          <div className="mt-14 divide-y divide-white/10 border-y border-white/10">
            {FEATURES.map((feat, i) => (
              <div key={feat.key} className="grid gap-4 py-8 md:grid-cols-[4.5rem_1fr_auto] md:items-center md:gap-8">
                <span className="text-3xl font-semibold tracking-tight text-white/25">0{i + 1}</span>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">{feat.question}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/60">{feat.body}</p>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold">
                  {feat.icon} {feat.name}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-10 rounded-2xl bg-white px-5 py-6 text-[#191919] sm:px-10 sm:py-8">
            <h3 className="text-xl font-semibold tracking-tight">Built for fairness</h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#6f6e6b]">
              Every rule is enforced on the server, not just in the interface. Branch lock, course assignment limits, slot conflicts and change request controls all run on the backend so no one can bypass them.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#ebeae8]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-8 sm:px-6">
          <BrandLogo to={null} imgClassName="h-6 w-auto" />
          <span className="min-w-0 text-sm text-notion-muted">Built for Virtual University exam scheduling.</span>
          <Link to="/login" className="n-btn-ghost text-sm sm:ml-auto">
            Sign in <ArrowRight size={15} />
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
