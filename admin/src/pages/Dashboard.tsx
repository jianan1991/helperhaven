export default function Dashboard() {
  const cards = [
    { label: 'Pending verifications', value: '—' },
    { label: 'Active permit cases', value: '—' },
    { label: 'Open reports', value: '—' },
    { label: 'Credits sold (30d)', value: '—' },
  ];
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Dashboard</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-slate-800 rounded-lg p-4">
            <div className="text-xs uppercase text-slate-400">{c.label}</div>
            <div className="text-2xl font-semibold mt-2">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
