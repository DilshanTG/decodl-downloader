export const DOWNLOAD_STATUS_LABELS: Record<string, string> = {
  pending: 'Getting Ready',
  processing: 'In Progress',
  completed: 'Ready to Download',
  failed: 'Download Failed',
  refunded: 'Credits Returned',
}

export const DOWNLOAD_STATUS_COLORS: Record<string, string> = {
  pending:    'badge-premium badge-premium-pending',
  processing: 'badge-premium badge-premium-processing',
  completed:  'badge-premium badge-premium-completed',
  failed:     'badge-premium badge-premium-failed',
  refunded:   'badge-premium badge-premium-refunded',
}
