import { Link } from 'react-router-dom';

/**
 * Public landing page. Direction A — warm, homely, mission-forward.
 * Mobile-first: stacks on small screens, two-column hero on md+.
 */
export default function LandingPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <PricingTransparency />
      <Voices />
      <CallToAction />
    </>
  );
}

function Hero() {
  return (
    <section className="relative warm-glow">
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-10 md:pt-16 pb-14 md:pb-20 grid md:grid-cols-2 gap-10 md:gap-14 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blush-100 border border-blush-200 mb-5 md:mb-7">
            <span className="text-base md:text-lg">👋</span>
            <span className="text-xs font-medium tracking-wide text-clay-600">
              Hello, neighbour
            </span>
          </div>

          <h1 className="serif font-bold leading-[1.05] tracking-tight text-ink-900 text-[2.5rem] md:text-[4.5rem]">
            A <span className="italic text-sage-700">homely</span> way
            <br />
            to find the person
            <br />
            who&rsquo;ll share
            <br />
            <span className="hand text-clay-500 text-[3rem] md:text-[5rem] leading-none">
              your home.
            </span>
          </h1>

          <p className="mt-6 md:mt-8 text-base md:text-lg text-ink-700 max-w-lg leading-relaxed">
            Singapore agencies charge families{' '}
            <strong className="text-ink-900">S$2,000–5,000</strong> in placement fees — and take a
            cut from the helper&rsquo;s salary every month. We think that&rsquo;s broken.
          </p>
          <p className="mt-3 md:mt-4 text-base md:text-lg text-ink-700 max-w-lg leading-relaxed">
            So we built something smaller, warmer, fairer. You pay{' '}
            <strong className="text-clay-500">S$15 to start chatting</strong>. Your helper keeps
            every dollar of her salary. Everyone goes home with more.
          </p>

          <div className="mt-7 md:mt-9 flex flex-col sm:flex-row gap-3 sm:items-center">
            <Link
              to="/signup?role=employer"
              className="px-6 md:px-7 py-3.5 md:py-4 rounded-full bg-clay-500 text-white font-medium shadow-lift hover:bg-clay-600 text-base text-center"
            >
              I&rsquo;m looking for a helper →
            </Link>
            <Link
              to="/signup?role=helper"
              className="px-6 md:px-7 py-3.5 md:py-4 rounded-full bg-white border-2 border-sage-600 text-sage-700 font-medium hover:bg-sage-50 text-center"
            >
              I&rsquo;m a helper
            </Link>
          </div>

          <p className="mt-5 text-xs text-ink-500">
            <span className="hand text-sm text-clay-500 mr-1">no agency fees · </span>
            cancel anytime · helpers always free
          </p>
        </div>

        {/* Hero card — example match preview */}
        <HeroCard />
      </div>
    </section>
  );
}

function HeroCard() {
  return (
    <div className="relative">
      {/* rotated post-it warmth accent */}
      <div className="absolute -top-4 -right-3 md:-top-6 md:-right-4 z-10 hidden sm:block">
        <div className="bg-butter-200 rounded-2xl px-4 py-3 shadow-soft rotate-[6deg] border border-butter-100">
          <p className="hand text-clay-600 text-lg leading-tight">
            94% fit —<br />
            she&rsquo;s the one!
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl md:rounded-[32px] border border-cream-200 shadow-soft p-5 md:p-7">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-sage-100 to-blush-100 flex items-center justify-center text-2xl md:text-3xl shrink-0">
            👩🏻
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="serif text-lg md:text-xl font-semibold text-ink-900">Dewi&nbsp;P.</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-sage-100 text-sage-700">
                ★ In SG · transfer ready
              </span>
            </div>
            <p className="text-xs md:text-sm text-ink-500 mt-1">
              Indonesian · 32 · 6 yrs experience · live-in
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          {[
            ['Infant care', 35, 'sage'],
            ['Elderly care', 15, 'sage'],
            ['Cooking', 25, 'clay'],
            ['Housework', 20, 'sage'],
            ['Attitude', 5, 'sage'],
          ].map(([label, score, tone]) => (
            <div key={label as string} className="flex items-center gap-3">
              <span className="text-xs text-ink-700 w-20 md:w-24 shrink-0">{label}</span>
              <div className="flex-1 h-2 bg-cream-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${tone === 'clay' ? 'bg-clay-500' : 'bg-sage-500'}`}
                  style={{ width: `${(score as number) * 2}%` }}
                />
              </div>
              <span className="text-xs font-medium text-ink-900 w-6 text-right">{score}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-cream-200 flex flex-wrap gap-1.5">
          {['Newborn', 'Halal cooking', 'Pet care', 'Drives'].map((t) => (
            <span
              key={t}
              className="text-xs px-2.5 py-1 rounded-full bg-blush-50 text-clay-600 border border-blush-100"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: '1',
      title: 'Say hello',
      body:
        'Sign up in 60 seconds. Tell us a bit about your home — or what kind of family you\'d feel right at home with.',
      kicker: 'no agency · no awkward office visit',
    },
    {
      n: '2',
      title: 'Meet matches',
      body:
        'See helpers with the skills you actually need — scored across infant care, elderly care, cooking, housework, attitude.',
      kicker: 'names blurred until you both unlock',
    },
    {
      n: '3',
      title: 'Chat, on us',
      body:
        'S$15 unlocks 5 chats — your money back if she doesn\'t reply within 48 hours. Take your time. Ask anything.',
      kicker: 'helpers always reply free',
    },
    {
      n: '4',
      title: 'We handle MOM',
      body:
        'Found someone? Pick the services you want — Work Permit application, runner, settling-in. We do the paperwork.',
      kicker: 'or skip it and DIY',
    },
  ];

  return (
    <section id="how" className="py-16 md:py-24 bg-cream-100">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="text-center mb-10 md:mb-14">
          <span className="hand text-clay-500 text-2xl md:text-3xl">how it works</span>
          <h2 className="serif text-3xl md:text-5xl font-bold text-ink-900 mt-1 leading-tight">
            Four small steps
            <br className="md:hidden" /> to a homely match.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {steps.map((s) => (
            <div
              key={s.n}
              className="bg-white rounded-3xl p-6 md:p-7 border border-cream-200 shadow-soft hover:shadow-lift transition-shadow"
            >
              <div className="w-10 h-10 rounded-full bg-sage-100 text-sage-700 flex items-center justify-center serif text-lg font-bold mb-4">
                {s.n}
              </div>
              <h3 className="serif text-xl font-semibold text-ink-900 mb-2">{s.title}</h3>
              <p className="text-sm text-ink-700 leading-relaxed">{s.body}</p>
              <p className="hand text-clay-500 text-base mt-3">{s.kicker}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingTransparency() {
  return (
    <section id="pricing" className="py-16 md:py-24 bg-cream-50">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <div className="text-center mb-10 md:mb-12">
          <span className="hand text-clay-500 text-2xl md:text-3xl">honest numbers</span>
          <h2 className="serif text-3xl md:text-5xl font-bold text-ink-900 mt-1 leading-tight">
            Where the money goes.
          </h2>
          <p className="mt-3 text-ink-700 max-w-2xl mx-auto text-sm md:text-base">
            We compared a typical 2-year placement at a Singapore agency vs. doing it through HelperHaven. Same helper. Same paperwork. Different relationship with money.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <PriceCard
            heading="Old way · agency"
            tone="muted"
            total="S$8,500+"
            sub="over 2 years"
            lines={[
              ['Placement fee to agency', 'S$2,000–5,000'],
              ['8 months of helper salary', '~S$4,800'],
              ['Concierge / paperwork markup', '~S$700'],
            ]}
            footer="And the helper goes home with less."
          />
          <PriceCard
            heading="HelperHaven"
            tone="bright"
            total="S$1,265"
            sub="over 2 years"
            lines={[
              ['Chat unlocks (5 conversations)', 'S$15'],
              ['Work Permit + concierge bundle', 'S$450'],
              ['MOM fees, medical, insurance', '~S$800'],
            ]}
            footer={
              <>
                Family saves <strong className="text-sage-700">~S$7,200</strong>. Helper keeps{' '}
                <strong className="text-sage-700">~S$4,800</strong>.
              </>
            }
          />
        </div>
      </div>
    </section>
  );
}

function PriceCard({
  heading,
  tone,
  total,
  sub,
  lines,
  footer,
}: {
  heading: string;
  tone: 'muted' | 'bright';
  total: string;
  sub: string;
  lines: [string, string][];
  footer: React.ReactNode;
}) {
  const bright = tone === 'bright';
  return (
    <div
      className={`rounded-3xl p-6 md:p-8 border ${
        bright
          ? 'bg-gradient-to-br from-sage-50 to-blush-50 border-sage-200 shadow-lift'
          : 'bg-white border-cream-200 shadow-soft'
      }`}
    >
      <div
        className={`text-xs uppercase tracking-wide font-medium mb-3 ${
          bright ? 'text-sage-700' : 'text-ink-500'
        }`}
      >
        {heading}
      </div>
      <div className="flex items-baseline gap-2 mb-5">
        <span
          className={`serif text-4xl md:text-5xl font-bold ${
            bright ? 'text-sage-900' : 'text-ink-700'
          }`}
        >
          {total}
        </span>
        <span className="text-sm text-ink-500">{sub}</span>
      </div>
      <ul className="space-y-2 mb-5">
        {lines.map(([l, v]) => (
          <li key={l} className="flex justify-between text-sm">
            <span className="text-ink-700">{l}</span>
            <span className="text-ink-900 font-medium">{v}</span>
          </li>
        ))}
      </ul>
      <p
        className={`text-sm pt-4 border-t ${
          bright ? 'border-sage-200 text-ink-900' : 'border-cream-200 text-ink-500 italic'
        }`}
      >
        {footer}
      </p>
    </div>
  );
}

function Voices() {
  const voices = [
    {
      tone: 'butter',
      tag: 'singapore family',
      kicker: 'we found Dewi',
      body: '"We were quoted S$3,800 by an agency. Through HelperHaven we paid S$15 to chat, S$450 for the paperwork. Dewi has been with us 18 months."',
      who: '— Mei Ling, mum of two · Bishan',
    },
    {
      tone: 'blush',
      tag: 'helper',
      kicker: 'I keep my salary',
      body: '"In my last job the agency took 8 months of my pay. Here I send all of it home. My family in Cebu is finally building the small house we promised my mother."',
      who: '— Marisol, helper from the Philippines',
    },
    {
      tone: 'sage',
      tag: 'first-time employer',
      kicker: 'they walked me through MOM',
      body: '"I was terrified of the Work Permit process. The HelperHaven team called me, listed exactly what I needed, and filed everything. Felt like family helping family."',
      who: '— Ravi, first-time dad · Toa Payoh',
    },
  ];

  return (
    <section id="voices" className="py-16 md:py-24 bg-cream-100">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="text-center mb-10 md:mb-14">
          <span className="hand text-clay-500 text-2xl md:text-3xl">kind words</span>
          <h2 className="serif text-3xl md:text-5xl font-bold text-ink-900 mt-1">From real homes.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {voices.map((v) => (
            <div
              key={v.who}
              className="bg-white rounded-3xl p-6 md:p-7 border border-cream-200 shadow-soft"
            >
              <div
                className={`inline-block text-xs px-2.5 py-1 rounded-full mb-4 ${
                  v.tone === 'butter'
                    ? 'bg-butter-100 text-clay-600'
                    : v.tone === 'blush'
                    ? 'bg-blush-100 text-clay-600'
                    : 'bg-sage-100 text-sage-700'
                }`}
              >
                {v.tag}
              </div>
              <p className="hand text-clay-500 text-xl mb-2">{v.kicker}</p>
              <p className="text-sm md:text-base text-ink-700 leading-relaxed mb-4">{v.body}</p>
              <p className="text-xs text-ink-500">{v.who}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CallToAction() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-sage-50 via-blush-50 to-butter-100">
      <div className="max-w-3xl mx-auto px-4 md:px-6 text-center">
        <span className="hand text-clay-500 text-2xl md:text-3xl">come on in</span>
        <h2 className="serif text-3xl md:text-5xl font-bold text-ink-900 mt-1 leading-tight">
          Two minutes to start.
          <br />
          Forever to find the right person.
        </h2>
        <div className="mt-7 md:mt-9 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/signup?role=employer"
            className="px-6 md:px-7 py-3.5 md:py-4 rounded-full bg-clay-500 text-white font-medium shadow-lift hover:bg-clay-600"
          >
            I&rsquo;m looking for a helper →
          </Link>
          <Link
            to="/signup?role=helper"
            className="px-6 md:px-7 py-3.5 md:py-4 rounded-full bg-white border-2 border-sage-600 text-sage-700 font-medium hover:bg-sage-50"
          >
            I&rsquo;m a helper
          </Link>
        </div>
      </div>
    </section>
  );
}
