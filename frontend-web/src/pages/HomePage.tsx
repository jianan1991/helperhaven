export default function HomePage() {
  return (
    <div className="grid md:grid-cols-2 gap-10 items-center">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 leading-tight">
          Find the right match.<br />
          <span className="text-brand-600">Meet on your terms.</span>
        </h1>
        <p className="mt-6 text-lg text-slate-600">
          HelperHaven matches Singapore employers with verified domestic helpers
          from Indonesia, Myanmar, and the Philippines. Skills-first, privacy-first,
          and fully handled — right through to the Work Permit.
        </p>
        <div className="mt-8 flex gap-3">
          <button className="px-5 py-3 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700">
            I am hiring
          </button>
          <button className="px-5 py-3 rounded-lg border border-brand-600 text-brand-700 font-medium hover:bg-brand-50">
            I am looking for work
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h2 className="font-semibold text-slate-800">How it works</h2>
        <ol className="mt-4 space-y-3 text-slate-600 text-sm list-decimal list-inside">
          <li>Build your profile — employers list needs, helpers rate their skills 0–100.</li>
          <li>Browse ranked matches. Names and contact stay hidden.</li>
          <li>Spend a credit to mutually unlock a video call.</li>
          <li>Meet for at least 5 minutes. Only then does the credit burn.</li>
          <li>Happy with the match? We handle your Work Permit with MOM.</li>
        </ol>
      </div>
    </div>
  );
}
