/**
 * Maps Wasp/HttpError (and plain Errors) to friendly, actionable toast copy.
 * Pure — no React, no side effects.
 */

export type FriendlyError = {
  title: string;
  description: string;
  variant: "destructive";
  actionHref?: string;
  actionLabel?: string;
};

function extractStatus(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const e = err as Record<string, unknown>;
  const candidates = [e.statusCode, e.status, (e as any).data?.statusCode, (e as any).data?.status];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) return c;
    if (typeof c === "string" && /^\d+$/.test(c)) return Number(c);
  }
  // Wasp sometimes embeds status in the message: "402: Insufficient..."
  const msg = typeof e.message === "string" ? e.message : "";
  const m = msg.match(/\b([45]\d{2})\b/);
  if (m) return Number(m[1]);
  return undefined;
}

function extractMessage(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (typeof err === "object" && typeof (err as any).message === "string") {
    return (err as any).message as string;
  }
  return "";
}

function isNetworkError(err: unknown, message: string): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const name = err && typeof err === "object" ? String((err as any).name || "") : "";
  return (
    name === "TypeError" ||
    /failed to fetch|networkerror|network request failed|load failed|offline/i.test(message)
  );
}

/**
 * Convert any thrown client/server error into toast-friendly content.
 */
export function toFriendlyError(err: unknown): FriendlyError {
  const status = extractStatus(err);
  const rawMessage = extractMessage(err);
  // Strip leading "HTTP 402: " style prefixes for cleaner copy
  const message = rawMessage.replace(/^(HTTP\s*)?\d{3}\s*[:\-–]?\s*/i, "").trim();

  if (status === 402 || /insufficient credits|not enough credits/i.test(rawMessage)) {
    return {
      title: "Not enough credits",
      description:
        message ||
        "You don't have enough credits for this download. Top up to continue.",
      variant: "destructive",
      actionHref: "/pricing",
      actionLabel: "Buy Credits",
    };
  }

  if (status === 429 || /too many|rate limit|slow down|concurrent/i.test(rawMessage)) {
    return {
      title: "Please slow down",
      description:
        message ||
        "You've hit a rate limit. Wait a moment and try again.",
      variant: "destructive",
    };
  }

  if (status === 401 || /unauthorized|not authenticated|please log in|sign in/i.test(rawMessage)) {
    return {
      title: "Please sign in again",
      description: message || "Your session expired. Sign in to continue.",
      variant: "destructive",
      actionHref: "/login",
      actionLabel: "Sign in",
    };
  }

  if (status === 400 || status === 403 || status === 404) {
    return {
      title: status === 404 ? "Not found" : "Please check your input",
      description: message || "Please check your input and try again.",
      variant: "destructive",
    };
  }

  if (
    (status !== undefined && status >= 500) ||
    isNetworkError(err, rawMessage) ||
    !message
  ) {
    return {
      title: "Something went wrong on our end",
      description: "Please try again in a moment.",
      variant: "destructive",
    };
  }

  // Unknown but has a human-readable server message
  return {
    title: "Something went wrong",
    description: message.length > 200 ? "Please try again in a moment." : message,
    variant: "destructive",
  };
}
