import { useEffect, useState } from 'react';
import { CATALOGUE_DEFAULTS, listServices, updateServicePrice, type ServiceItem } from '../lib/services';
import { asMessage } from '../lib/api';

export default function AdminServicesPage() {
  const [items, setItems] = useState<ServiceItem[]>(CATALOGUE_DEFAULTS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    listServices(true).then((svcs) => {
      setItems(svcs);
      // If every item still has a default price the backend is probably offline
      setApiAvailable(true);
    }).catch(() => {
      setApiAvailable(false);
    });
  }, []);

  function startEdit(item: ServiceItem) {
    setEditingId(item.id);
    setDraft(String(item.priceSgd));
    setSaveError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft('');
    setSaveError(null);
  }

  async function savePrice(id: string) {
    const price = parseInt(draft, 10);
    if (isNaN(price) || price < 0) {
      setSaveError('Enter a valid price (0 or more).');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateServicePrice(id, price);
      setItems((prev) => prev.map((s) => s.id === id ? updated : s));
      setEditingId(null);
    } catch (err) {
      setSaveError(asMessage(err, 'Could not save — backend may be offline. Restart the server and try again.'));
    } finally {
      setSaving(false);
    }
  }

  const activeItems = items.filter((s) => s.active);
  const total = activeItems.reduce((sum, s) => sum + s.priceSgd, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-widest text-sage-700">Admin · catalogue</div>
        <h1 className="serif text-4xl font-bold text-ink-900 mt-2">Service Pricing</h1>
        <p className="mt-2 text-ink-500 text-sm max-w-xl">
          Set the price for each JWC Employment Services offering. Employers see live prices when choosing services during placement.
        </p>
      </div>

      {apiAvailable === false && (
        <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          ⚠️ Backend offline — showing estimated prices. Restart the server and refresh to sync changes.
        </div>
      )}

      {saveError && (
        <div className="mb-4 rounded-2xl bg-clay-500/10 border border-clay-500/30 px-4 py-3 text-sm text-clay-700">
          {saveError}
        </div>
      )}

      <div className="rounded-3xl border border-cream-200 bg-white divide-y divide-cream-100 overflow-hidden shadow-soft">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 px-5 py-4">
            <span className="text-2xl w-8 shrink-0 leading-none">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-900">{item.title}</p>
              <p className="text-xs text-ink-500 leading-snug mt-0.5">{item.description}</p>
            </div>

            {editingId === item.id ? (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm text-ink-500">SGD</span>
                <input
                  type="number"
                  min={0}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void savePrice(item.id);
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  className="w-20 border border-cream-300 rounded-lg px-2 py-1.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-sage-400"
                  autoFocus
                />
                <button
                  onClick={() => void savePrice(item.id)}
                  disabled={saving}
                  className="text-xs px-3 py-1.5 rounded-full bg-sage-700 text-white hover:bg-sage-800 disabled:opacity-50 font-medium"
                >
                  Save
                </button>
                <button
                  onClick={cancelEdit}
                  className="text-xs px-3 py-1.5 rounded-full border border-cream-200 text-ink-700 hover:bg-cream-100"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => startEdit(item)}
                className="shrink-0 text-sm font-semibold text-sage-800 hover:text-sage-600 tabular-nums group flex items-center gap-1.5"
                title="Click to edit price"
              >
                SGD {item.priceSgd.toLocaleString()}
                <span className="text-xs text-ink-300 group-hover:text-sage-600 transition-colors">✏</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Full-package total */}
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-sage-50 border border-sage-200 px-5 py-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">Full package total</p>
          <p className="text-xs text-ink-500 mt-0.5">All {activeItems.length} services · payable on IPA issuance</p>
        </div>
        <span className="text-lg font-bold text-sage-900 tabular-nums">
          SGD {total.toLocaleString()}
        </span>
      </div>

      <p className="mt-4 text-xs text-ink-400 text-center">
        Click any price to edit it. Changes are saved to the database and reflected immediately for employers.
      </p>
    </div>
  );
}
