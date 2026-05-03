import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../lib/toasts';

export default function ToastStack() {
  const { toasts, dismiss } = useToastStore();
  const nav = useNavigate();

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 bg-sage-900 text-cream-100 px-4 py-3 rounded-2xl shadow-lg text-sm max-w-xs animate-slide-up"
        >
          <span className="flex-1">{t.message}</span>
          {t.link && (
            <button
              type="button"
              onClick={() => { nav(t.link!); dismiss(t.id); }}
              className="shrink-0 text-xs font-medium text-clay-300 hover:text-clay-200"
            >
              View →
            </button>
          )}
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="shrink-0 text-cream-100/50 hover:text-cream-100 text-base leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
