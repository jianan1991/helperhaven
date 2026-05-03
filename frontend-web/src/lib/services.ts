import { api } from './api';

export interface ServiceItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  priceSgd: number;
  sortOrder: number;
  active: boolean;
}

/**
 * Canonical service catalogue with estimated prices.
 * IDs match V13 migration seed rows so API data merges cleanly by ID.
 * Used as fallback when the backend is unavailable or not yet migrated.
 */
export const CATALOGUE_DEFAULTS: ServiceItem[] = [
  {
    id: 'a1000000-0000-0000-0000-000000000001',
    icon: '📋',
    title: 'MOM Work Permit Application',
    description: 'We prepare and submit the FDW application to MOM on your behalf.',
    priceSgd: 400,
    sortOrder: 1,
    active: true,
  },
  {
    id: 'a1000000-0000-0000-0000-000000000002',
    icon: '🛡️',
    title: 'Insurance & Security Bond',
    description: 'FDW insurance and $5,000 security bond arranged and managed for you.',
    priceSgd: 290,
    sortOrder: 2,
    active: true,
  },
  {
    id: 'a1000000-0000-0000-0000-000000000003',
    icon: '✈️',
    title: 'Arrival Coordination',
    description: 'Airport pickup, SIM card, and settling-in checklist on arrival day.',
    priceSgd: 180,
    sortOrder: 3,
    active: true,
  },
  {
    id: 'a1000000-0000-0000-0000-000000000004',
    icon: '🎓',
    title: 'SIP Registration',
    description: 'We register the helper for the mandatory Settling-In Programme.',
    priceSgd: 100,
    sortOrder: 4,
    active: true,
  },
  {
    id: 'a1000000-0000-0000-0000-000000000005',
    icon: '🩺',
    title: 'Medical Exam Booking',
    description: 'We book the required medical examination within the legal window.',
    priceSgd: 120,
    sortOrder: 5,
    active: true,
  },
  {
    id: 'a1000000-0000-0000-0000-000000000006',
    icon: '📞',
    title: 'Ongoing Support',
    description: 'Dedicated case manager reachable via WhatsApp throughout the placement.',
    priceSgd: 150,
    sortOrder: 6,
    active: true,
  },
];

/**
 * Fetch live services from the API, falling back to CATALOGUE_DEFAULTS if the
 * API is unavailable or returns an empty list (e.g. migration not yet run).
 */
export async function listServices(all = false): Promise<ServiceItem[]> {
  try {
    const { data } = await api.get<ServiceItem[]>('/services', {
      params: all ? { all: true } : {},
    });
    // Merge: overlay API prices onto defaults so order/descriptions stay canonical
    if (data && data.length > 0) {
      const apiById = new Map(data.map((s) => [s.id, s]));
      return CATALOGUE_DEFAULTS.map((d) => apiById.get(d.id) ?? d);
    }
  } catch {
    // Backend not running or migration not applied — fall through to defaults
  }
  return CATALOGUE_DEFAULTS;
}

export async function updateServicePrice(id: string, priceSgd: number): Promise<ServiceItem> {
  const { data } = await api.put<ServiceItem>(`/services/${id}/price`, { priceSgd });
  return data;
}
