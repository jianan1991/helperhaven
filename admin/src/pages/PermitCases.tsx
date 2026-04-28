const STAGES = [
  'DRAFT', 'DOCS_PENDING', 'SUBMITTED_MOM', 'INTERIM_APPROVED',
  'BOND_INSURANCE', 'IPA_ISSUED', 'AWAITING_ARRIVAL', 'ARRIVED',
  'SIP_DONE', 'MEDICAL_DONE', 'BIOMETRICS_DONE', 'CARD_ISSUED',
];

export default function PermitCases() {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Permit cases</h2>
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto">
        {STAGES.map((s) => (
          <div key={s} className="bg-slate-800 rounded-lg p-3 min-h-[200px]">
            <div className="text-xs uppercase text-slate-400 mb-2">{s}</div>
            <div className="text-slate-500 text-sm italic">No cases</div>
          </div>
        ))}
      </div>
    </div>
  );
}
