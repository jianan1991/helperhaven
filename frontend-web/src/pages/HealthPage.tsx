import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

type HelloResponse = { app: string; status: string; now: string };

export default function HealthPage() {
  const { data, isLoading, error } = useQuery<HelloResponse>({
    queryKey: ['hello'],
    queryFn: async () => (await axios.get('/api/hello')).data,
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-6 max-w-md">
      <h1 className="text-xl font-semibold">Backend health</h1>
      {isLoading && <p className="mt-4 text-slate-500">Checking…</p>}
      {error && <p className="mt-4 text-red-600">Could not reach backend.</p>}
      {data && (
        <dl className="mt-4 text-sm text-slate-700 space-y-1">
          <div><dt className="inline font-medium">App: </dt><dd className="inline">{data.app}</dd></div>
          <div><dt className="inline font-medium">Status: </dt><dd className="inline">{data.status}</dd></div>
          <div><dt className="inline font-medium">Now: </dt><dd className="inline">{data.now}</dd></div>
        </dl>
      )}
    </div>
  );
}
