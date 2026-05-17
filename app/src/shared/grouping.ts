export interface GroupedDownload {
  id: string;
  createdAt: Date;
  status: string;
  providerSlug: string;
  isBulk: boolean;
  batchId: string | null;
  creditsCharged: number;
  items: any[];
}

export function groupDownloads(downloads: any[]): GroupedDownload[] {
  if (!downloads) return [];

  const grouped: GroupedDownload[] = [];
  const batchMap = new Map<string, GroupedDownload>();

  downloads.forEach((d) => {
    const optionsArray = d.options;
    const isBulk = Array.isArray(optionsArray) && optionsArray.some((o: any) => o.name === "isBulk" && o.value === "true");
    const batchId = Array.isArray(optionsArray) && optionsArray.find((o: any) => o.name === "batchId")?.value;

    if (isBulk && batchId) {
      if (!batchMap.has(batchId)) {
        const groupObj: GroupedDownload = {
          id: d.id,
          createdAt: new Date(d.createdAt),
          providerSlug: d.providerSlug,
          isBulk: true,
          batchId,
          creditsCharged: d.creditsCharged || 0,
          status: d.status,
          items: [d],
        };
        batchMap.set(batchId, groupObj);
        grouped.push(groupObj);
      } else {
        const groupObj = batchMap.get(batchId)!;
        groupObj.items.push(d);
        groupObj.creditsCharged += (d.creditsCharged || 0);
        
        // Keep the latest/first createdAt
        if (new Date(d.createdAt) > new Date(groupObj.createdAt)) {
          groupObj.createdAt = new Date(d.createdAt);
        }

        // Determine combined status:
        const total = groupObj.items.length;
        const completed = groupObj.items.filter(i => i.status === "completed").length;
        const failed = groupObj.items.filter(i => i.status === "failed").length;
        const refunded = groupObj.items.filter(i => i.status === "refunded").length;
        const processing = groupObj.items.filter(i => i.status === "processing").length;
        const pending = groupObj.items.filter(i => i.status === "pending").length;

        if (completed === total) {
          groupObj.status = "completed";
        } else if (failed === total) {
          groupObj.status = "failed";
        } else if (refunded === total) {
          groupObj.status = "refunded";
        } else if (processing > 0 || pending > 0) {
          groupObj.status = "processing";
        } else {
          groupObj.status = "completed"; // fallback to render success
        }
      }
    } else {
      grouped.push({
        id: d.id,
        createdAt: new Date(d.createdAt),
        providerSlug: d.providerSlug,
        isBulk: false,
        batchId: null,
        creditsCharged: d.creditsCharged || 0,
        status: d.status,
        items: [d],
      });
    }
  });

  return grouped;
}

export function getBatchStatusText(items: any[]): { text: string; colorClass: string; isProcessing: boolean } {
  const total = items.length;
  const completed = items.filter(i => i.status === "completed").length;
  const failed = items.filter(i => i.status === "failed").length;
  const refunded = items.filter(i => i.status === "refunded").length;
  const processing = items.filter(i => i.status === "processing").length;
  const pending = items.filter(i => i.status === "pending").length;

  if (completed === total) {
    return { text: "Completed", colorClass: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20", isProcessing: false };
  }
  if (failed === total) {
    return { text: "Failed", colorClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", isProcessing: false };
  }
  if (refunded === total) {
    return { text: "Refunded", colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", isProcessing: false };
  }

  const done = completed + failed + refunded;
  if (done === total) {
    return { text: `Completed (${completed}/${total} ok)`, colorClass: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20", isProcessing: false };
  }
  return { text: `Processing (${completed}/${total} done)`, colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", isProcessing: true };
}
