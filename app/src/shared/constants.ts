export const CREDIT_PACKAGES = [
  {
    id: 'single',
    name: 'Single',
    credits: 1,
    priceLKR: 200,
    perCredit: 200,
    badge: null,
  },
  {
    id: 'starter',
    name: 'Starter',
    credits: 10,
    priceLKR: 1800,
    perCredit: 180,
    savings: 200,
    badge: null,
  },
  {
    id: 'value',
    name: 'Value',
    credits: 50,
    priceLKR: 8500,
    perCredit: 170,
    savings: 1500,
    popular: true,
    badge: '🔥 Best Value',
  },
  {
    id: 'pro',
    name: 'Pro',
    credits: 100,
    priceLKR: 16000,
    perCredit: 160,
    savings: 4000,
    badge: null,
  },
  {
    id: 'business',
    name: 'Business',
    credits: 500,
    priceLKR: 75000,
    perCredit: 150,
    savings: 25000,
    badge: '💼 Team Pick',
  },
  {
    id: 'agency',
    name: 'Agency',
    credits: 1000,
    priceLKR: 140000,
    perCredit: 140,
    savings: 60000,
    badge: '🚀 Best Rate',
  },
] as const

export type PackageId = 'single' | 'starter' | 'value' | 'pro' | 'business' | 'agency'

export const DOWNLOAD_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  refunded: 'Refunded',
}

export const DOWNLOAD_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
}
