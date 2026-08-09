import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** When this key changes (e.g. route pathname), the boundary recovers without a full reload. */
  resetKey?: string;
};

type State = {
  hasError: boolean;
};

/**
 * Global React error boundary — class component required by React.
 * Renders a branded recovery UI; never surfaces stack traces to the user.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    // Report white-screen crashes when Sentry is configured (no-op without DSN).
    void import("../setup").then(({ captureClientException }) => {
      captureClientException(error, { componentStack: info.componentStack });
    }).catch(() => {
      /* ignore dynamic import failures */
    });
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.state.hasError &&
      prevProps.resetKey !== undefined &&
      this.props.resetKey !== undefined &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ hasError: false });
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-md text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-black tracking-tight text-foreground">
              Something went wrong on our end
            </h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Your credits and downloads are safe. Reload the page to continue — if this keeps
              happening, message us on WhatsApp.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-[0.98]"
              >
                Reload page
              </button>
              <a
                href="https://wa.me/94772503124"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-6 py-3 text-sm font-bold text-foreground transition-all hover:bg-accent active:scale-[0.98]"
              >
                Contact us on WhatsApp
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
