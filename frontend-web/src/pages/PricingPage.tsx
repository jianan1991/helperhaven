import { Link } from 'react-router-dom';

export default function PricingPage() {
  return (
    <>
      <WhyWeAreHere />
      <HowItWorks />
      <Voices />
      <Cta />
    </>
  );
}

function WhyWeAreHere() {
  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 pt-10 pb-24">
      <div className="text-center mb-12">
        <div className="hand text-clay-500 text-2xl mb-2">why we&rsquo;re here</div>
        <h2 className="serif text-4xl md:text-5xl font-bold text-ink-900 leading-tight">
          The old way costs too much.<br />
          <span className="italic text-sage-700">For everyone.</span>
        </h2>
        <p className="mt-5 text-ink-500 max-w-2xl mx-auto text-base md:text-lg">
          Here&rsquo;s what two years with a traditional agency actually costs a Singapore family
          and their helper. And here&rsquo;s what it costs with us.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">

        {/* Traditional agency */}
        <div className="rounded-[28px] bg-cream-50 border border-cream-200 p-8 relative">
          <div className="absolute top-5 right-5 px-2.5 py-1 rounded-full bg-ink-900/90 text-cream-100 text-[10px] uppercase tracking-widest">
            The old way
          </div>
          <div className="text-5xl mb-4">🏢</div>
          <div className="serif text-2xl font-bold text-ink-900">Traditional agency</div>
          <p className="text-sm text-ink-500 mt-1 mb-6">Middleman you pay. Middleman she pays.</p>
          <div className="space-y-0 text-sm">
            {([
              ['Employer placement fee', 'S$2,000 – 5,000'],
              ['Helper "loan" (8 months salary)', 'S$4,000 – 4,800'],
              ['Admin / service add-ons', 'S$300 – 600'],
              ['Work Permit + bond + insurance', 'S$800 – 1,200'],
            ] as const).map(([label, value]) => (
              <div key={label} className="flex justify-between py-2.5 border-b border-cream-200">
                <span className="text-ink-700">{label}</span>
                <span className="font-semibold text-ink-900">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-5 border-t-2 border-ink-900">
            <div className="flex justify-between items-baseline">
              <span className="serif text-lg font-bold text-ink-900">Out of pocket over 2 years</span>
              <span className="serif text-3xl font-bold text-ink-900">~S$8,500</span>
            </div>
            <p className="text-xs text-ink-500 mt-2 italic">— and the helper loses ~8 months of salary to the loan.</p>
          </div>
        </div>

        {/* HelperHaven */}
        <div className="rounded-[28px] bg-white border-2 border-sage-600 p-8 relative shadow-lift">
          <div className="absolute top-5 right-5 px-2.5 py-1 rounded-full bg-clay-500 text-cream-100 text-[10px] uppercase tracking-widest font-semibold">
            Our way
          </div>
          <div className="text-5xl mb-4">🌿</div>
          <div className="serif text-2xl font-bold text-ink-900">HelperHaven</div>
          <p className="text-sm text-ink-500 mt-1 mb-6">You talk. She keeps her salary. We just file the papers.</p>
          <div className="space-y-0 text-sm">
            {([
              ['Chat pack (5 conversations)', 'S$15'],
              ['Helper salary loan', 'S$0 · she keeps it all'],
              ['Work Permit concierge (flat)', 'S$450'],
              ['Govt fees (bond + insurance + WP)', 'at cost · S$800'],
            ] as const).map(([label, value]) => (
              <div key={label} className="flex justify-between py-2.5 border-b border-cream-200">
                <span className="text-ink-700">{label}</span>
                <span className="font-semibold text-sage-700">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-5 border-t-2 border-sage-600">
            <div className="flex justify-between items-baseline">
              <span className="serif text-lg font-bold text-sage-900">Out of pocket over 2 years</span>
              <span className="serif text-3xl font-bold text-sage-700">~S$1,265</span>
            </div>
            <p className="text-xs text-sage-700 mt-2">
              <strong>You save S$7,200.</strong> She keeps S$4,800. Fair all round.
            </p>
          </div>
        </div>

      </div>

      <div className="mt-10 text-center">
        <p className="hand text-xl text-clay-500">no hidden fees, no monthly cuts, no small print&nbsp;&nbsp;✺</p>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps: { emoji: string; step: string; title: string; body: string; highlight?: boolean }[] = [
    {
      emoji: '✍️',
      step: 'Step one',
      title: 'Spend 100 points',
      body: 'Helpers split 100 points across five skills. Honest specialisation, no inflated CVs.',
    },
    {
      emoji: '🌿',
      step: 'Step two',
      title: 'Meet your matches',
      body: 'Ranked by real compatibility. Names and photos stay hidden at first.',
    },
    {
      emoji: '💬',
      step: 'Step three',
      title: 'Say hello',
      body: 'S$3 opens a private thread. Names & contact stay hidden till you both agree.',
    },
    {
      emoji: '🕊️',
      step: 'Step four',
      title: '48-hour promise',
      body: 'No reply in 48 h? Your credit quietly comes back. Only pay for real conversations.',
    },
    {
      emoji: '📮',
      step: 'Step five',
      title: 'We post the forms',
      body: 'Licensed EA. We file the MOM Work Permit, insurance, bond, SIP — all of it.',
      highlight: true,
    },
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 pb-24">
      <div className="text-center mb-14">
        <div className="hand text-clay-500 text-2xl mb-2">how it works</div>
        <h2 className="serif text-4xl md:text-5xl font-bold text-ink-900">Five gentle steps</h2>
        <p className="mt-4 text-ink-500 max-w-xl mx-auto text-base md:text-lg">
          No swiping. No cold calls from agents. You stay anonymous until you both decide you&rsquo;d like to say hello properly.
        </p>
      </div>

      <div className="grid md:grid-cols-5 gap-4">
        {steps.map((s) => (
          <div
            key={s.step}
            className={`rounded-3xl p-6 border shadow-soft ${
              s.highlight
                ? 'bg-clay-500 text-cream-100 border-clay-500 shadow-lift relative overflow-hidden'
                : 'bg-white border-cream-200 hover:border-sage-100 transition'
            }`}
          >
            {s.highlight && (
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-clay-600 rounded-full opacity-50" />
            )}
            <div className="relative text-3xl mb-3">{s.emoji}</div>
            <div className={`relative text-xs uppercase tracking-widest font-semibold ${s.highlight ? 'text-cream-100/70' : 'text-clay-500'}`}>
              {s.step}
            </div>
            <div className={`relative serif font-bold text-lg mt-1 ${s.highlight ? 'text-cream-100' : 'text-ink-900'}`}>
              {s.title}
            </div>
            <p className={`relative text-sm mt-2 leading-relaxed ${s.highlight ? 'text-cream-100/90' : 'text-ink-500'}`}>
              {s.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Voices() {
  return (
    <section className="bg-blush-50 border-y border-blush-100">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-20">
        <div className="text-center mb-12">
          <div className="hand text-clay-500 text-2xl mb-2">kind words</div>
          <h2 className="serif text-3xl md:text-4xl font-bold text-ink-900">
            Families &amp; helpers tell us how it went.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">

          <div className="rounded-3xl bg-white p-7 shadow-soft border border-cream-200 relative">
            <div className="serif text-5xl text-blush-300 leading-none absolute top-4 left-6">&ldquo;</div>
            <p className="mt-8 text-ink-700 leading-relaxed">
              We&rsquo;d budgeted S$9,000 for an agency. Found Aunty Sri here, paid S$465 total,
              and she&rsquo;s been with us two years. My kids call her their second mum.
            </p>
            <div className="mt-6 pt-5 border-t border-cream-200 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-sage-400 to-sage-700 flex items-center justify-center text-white serif font-bold">P</div>
              <div>
                <div className="font-semibold text-ink-900">Priya &amp; Raj M.</div>
                <div className="text-xs text-ink-500">Family of 4 · Serangoon</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-7 shadow-soft border border-cream-200 relative">
            <div className="serif text-5xl text-blush-300 leading-none absolute top-4 left-6">&ldquo;</div>
            <p className="mt-8 text-ink-700 leading-relaxed">
              My last agency made me pay 8 months salary as &ldquo;loan.&rdquo; Here I keep everything I earn.
              I send it all home to my daughter. Thank you HelperHaven, truly.
            </p>
            <div className="mt-6 pt-5 border-t border-cream-200 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blush-300 to-clay-400 flex items-center justify-center text-white serif font-bold">M</div>
              <div>
                <div className="font-semibold text-ink-900">Marisol T.</div>
                <div className="text-xs text-ink-500">Helper · Philippines</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-7 shadow-soft border border-cream-200 relative">
            <div className="serif text-5xl text-blush-300 leading-none absolute top-4 left-6">&ldquo;</div>
            <p className="mt-8 text-ink-700 leading-relaxed">
              I was terrified of the Work Permit process. The HelperHaven team called me, listed
              exactly what I needed, and filed everything. Felt like family helping family.
            </p>
            <div className="mt-6 pt-5 border-t border-cream-200 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-butter-300 to-sage-400 flex items-center justify-center text-white serif font-bold">R</div>
              <div>
                <div className="font-semibold text-ink-900">Ravi S.</div>
                <div className="text-xs text-ink-500">First-time dad · Toa Payoh</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-sage-50 via-blush-50 to-butter-100">
      <div className="max-w-3xl mx-auto px-4 md:px-6 text-center">
        <span className="hand text-clay-500 text-2xl md:text-3xl">come on in</span>
        <h2 className="serif text-3xl md:text-5xl font-bold text-ink-900 mt-1 leading-tight">
          Two minutes to start.<br />
          Forever to find the right person.
        </h2>
        <div className="mt-7 md:mt-9 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/signup?role=employer"
            className="px-6 md:px-7 py-3.5 md:py-4 rounded-full bg-clay-500 text-white font-medium shadow-lift hover:bg-clay-600 text-center"
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
      </div>
    </section>
  );
}
