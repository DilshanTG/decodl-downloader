import * as React from "react";

import type { ToastActionElement, ToastProps } from "../components/ui/toast";

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 6000;
const TOAST_REMOVE_DELAY_DESTRUCTIVE = 8000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  /** Auto-dismiss duration in ms; 0 = no auto-dismiss */
  duration?: number;
};

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type ActionType = typeof actionTypes;

type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: ToasterToast;
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<ToasterToast>;
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      toastId?: ToasterToast["id"];
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      toastId?: ToasterToast["id"];
    };

interface State {
  toasts: ToasterToast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function isDestructive(t: ToasterToast): boolean {
  return t.variant === "destructive";
}

/**
 * When over limit: drop oldest non-destructive first; only drop destructive
 * toasts when every visible toast is destructive.
 */
function applyToastLimit(toasts: ToasterToast[]): ToasterToast[] {
  if (toasts.length <= TOAST_LIMIT) return toasts;

  const next = [...toasts];
  while (next.length > TOAST_LIMIT) {
    // Prefer removing the oldest non-destructive (end of array is oldest
    // once we prepend newest — we store newest first)
    let removeIdx = -1;
    for (let i = next.length - 1; i >= 0; i--) {
      if (!isDestructive(next[i])) {
        removeIdx = i;
        break;
      }
    }
    if (removeIdx === -1) {
      // All destructive — drop oldest (last)
      removeIdx = next.length - 1;
    }
    const removed = next.splice(removeIdx, 1)[0];
    if (removed && toastTimeouts.has(removed.id)) {
      clearTimeout(toastTimeouts.get(removed.id));
      toastTimeouts.delete(removed.id);
    }
  }
  return next;
}

const addToRemoveQueue = (toastId: string, delay: number = TOAST_REMOVE_DELAY) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    });
  }, delay);

  toastTimeouts.set(toastId, timeout);
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: applyToastLimit([action.toast, ...state.toasts]),
      };

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t,
        ),
      };

    case "DISMISS_TOAST": {
      const { toastId } = action;

      // Clear any pending auto-dismiss timer so we don't double-fire
      const clearTimer = (id: string) => {
        const t = toastTimeouts.get(id);
        if (t) {
          clearTimeout(t);
          toastTimeouts.delete(id);
        }
      };

      if (toastId) {
        clearTimer(toastId);
        // Short delay for exit animation, then hard-remove from state
        addToRemoveQueue(toastId, 350);
      } else {
        state.toasts.forEach((toast) => {
          clearTimer(toast.id);
          addToRemoveQueue(toast.id, 350);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t,
        ),
      };
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

const listeners: Array<(state: State) => void> = [];

let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

type Toast = Omit<ToasterToast, "id">;

function toast({ duration, ...props }: Toast) {
  const id = genId();

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    });
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

  const resolvedDuration =
    duration !== undefined
      ? duration
      : props.variant === "destructive"
        ? TOAST_REMOVE_DELAY_DESTRUCTIVE
        : TOAST_REMOVE_DELAY;

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      duration: resolvedDuration,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  // Auto-dismiss after duration (0 = sticky). DISMISS_TOAST queues removal for exit animation.
  if (resolvedDuration > 0) {
    const timeout = setTimeout(() => {
      toastTimeouts.delete(id);
      dispatch({ type: "DISMISS_TOAST", toastId: id });
    }, resolvedDuration);
    toastTimeouts.set(id, timeout);
  }

  return {
    id: id,
    dismiss,
    update,
  };
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

export { toast, useToast };
