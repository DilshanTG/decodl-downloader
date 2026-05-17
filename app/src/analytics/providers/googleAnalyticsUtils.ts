// Google Analytics — disabled, returning empty data
export async function getDailyPageViews(): Promise<{ totalViews: number; prevDayViewsChangePercent: string }> {
  return { totalViews: 0, prevDayViewsChangePercent: '0' }
}

export async function getSources(): Promise<Array<{ source: string; visitors: number }>> {
  return []
}
