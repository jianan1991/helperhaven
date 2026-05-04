import { useEffect, useRef, useState } from 'react';
import {
  fetchAdminHolidays, addAdminHoliday, deleteAdminHoliday, uploadHolidaysExcel,
  type HolidayView,
} from '../lib/employment';

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminManageHolidaysPage() {
  const [holidays, setHolidays] = useState<HolidayView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add single form
  const [addDate, setAddDate] = useState('');
  const [addName, setAddName] = useState('');
  const [adding, setAdding] = useState(false);

  // Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    fetchAdminHolidays().then((hs) => {
      setHolidays(hs);
      setLoading(false);
    }).catch(() => {
      setError('Failed to load holidays');
      setLoading(false);
    });
  }

  async function handleAdd() {
    if (!addDate || !addName.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const h = await addAdminHoliday(addDate, addName.trim());
      setHolidays((prev) => [...prev, h].sort((a, b) => a.date.localeCompare(b.date)));
      setAddDate('');
      setAddName('');
      setSuccess('Holiday added.');
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to add holiday — date may already exist.');
    }
    setAdding(false);
  }

  async function handleDelete(id: string) {
    try {
      await deleteAdminHoliday(id);
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    } catch { setError('Failed to delete holiday'); }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await uploadHolidaysExcel(file);
      setSuccess(`Imported ${result.added} holiday(s). ${result.skipped} skipped (already exist).${result.errors.length > 0 ? ` Errors: ${result.errors.join('; ')}` : ''}`);
      load();
    } catch { setError('Upload failed. Please check the file format.'); }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const grouped: Record<number, HolidayView[]> = {};
  holidays.forEach((h) => {
    const yr = parseInt(h.date.slice(0, 4));
    if (!grouped[yr]) grouped[yr] = [];
    grouped[yr].push(h);
  });

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink-900">Manage Holidays</h1>
        <p className="text-ink-500 mt-1 text-sm">Public holidays shown on the hiring calendar for both parties.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-xl bg-sage-50 border border-sage-200 px-4 py-3 text-sm text-sage-700">{success}</div>
      )}

      <div className="space-y-5">
        {/* Add single */}
        <div className="rounded-2xl bg-white border border-cream-200 p-5">
          <h2 className="text-sm font-semibold text-ink-700 mb-4 uppercase tracking-wide">Add Holiday</h2>
          <div className="flex gap-3 flex-wrap">
            <input
              type="date"
              className="border border-cream-300 rounded-xl px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-sage-400"
              value={addDate}
              onChange={(e) => setAddDate(e.target.value)}
            />
            <input
              type="text"
              className="flex-1 min-w-[180px] border border-cream-300 rounded-xl px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-sage-400"
              placeholder="Holiday name"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleAdd()}
            />
            <button
              onClick={() => void handleAdd()}
              disabled={adding || !addDate || !addName.trim()}
              className="px-5 py-2 rounded-xl bg-sage-600 text-white text-sm font-medium hover:bg-sage-700 disabled:opacity-50"
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>

        {/* Excel upload */}
        <div className="rounded-2xl bg-white border border-cream-200 p-5">
          <h2 className="text-sm font-semibold text-ink-700 mb-1 uppercase tracking-wide">Bulk Upload (Excel)</h2>
          <p className="text-xs text-ink-400 mb-4">
            Upload an .xlsx file. Skip the first (header) row. Column A: date (YYYY-MM-DD or date cell), Column B: holiday name.
          </p>
          <div className="flex items-center gap-3">
            <label className={`cursor-pointer px-4 py-2 rounded-xl border border-sage-300 text-sage-700 text-sm font-medium hover:bg-sage-50 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              {uploading ? 'Uploading…' : 'Choose file & upload'}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="sr-only"
                onChange={(e) => void handleUpload(e)}
              />
            </label>
          </div>
        </div>

        {/* Holiday list */}
        <div className="rounded-2xl bg-white border border-cream-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-cream-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-700 uppercase tracking-wide">All Holidays</h2>
            <span className="text-xs text-ink-400">{holidays.length} total</span>
          </div>
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-ink-400">Loading…</div>
          ) : holidays.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-ink-400">No holidays added yet.</div>
          ) : (
            <div>
              {Object.keys(grouped).sort((a, b) => parseInt(b) - parseInt(a)).map((yr) => (
                <div key={yr}>
                  <div className="px-5 py-2 bg-cream-50 border-b border-cream-100 text-xs font-semibold text-ink-500 uppercase tracking-widest">
                    {yr}
                  </div>
                  {grouped[parseInt(yr)].map((h) => (
                    <div key={h.id} className="flex items-center justify-between px-5 py-3 border-b border-cream-50 last:border-0 hover:bg-cream-50/50">
                      <div>
                        <span className="text-sm font-medium text-ink-800">{h.name}</span>
                        <span className="ml-3 text-xs text-ink-400">{fmtDate(h.date)}</span>
                      </div>
                      <button
                        onClick={() => void handleDelete(h.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
