export const CREDIT_PACKAGES = [
  { id: 'starter', name: 'Starter', credits: 10, priceLKR: 1000, perCredit: 100 },
  { id: 'pro', name: 'Pro', credits: 50, priceLKR: 4500, perCredit: 90, popular: true, savings: 500 },
  { id: 'business', name: 'Business', credits: 200, priceLKR: 16000, perCredit: 80, savings: 4000 },
  { id: 'agency', name: 'Agency', credits: 500, priceLKR: 35000, perCredit: 70, savings: 15000 },
] as const

export type PackageId = 'starter' | 'pro' | 'business' | 'agency'

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
