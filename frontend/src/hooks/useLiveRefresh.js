import { useEffect, useRef } from "react";

export const LIVE_REFRESH_INTERVAL = 15_000;

export function useLiveRefresh(
  refresh,
  { enabled = true, interval = LIVE_REFRESH_INTERVAL } = {}
) {
  const refreshRef = useRef(refresh);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return undefined;

    const refreshIfVisible = async () => {
      if (document.visibilityState === "hidden" || isRefreshingRef.current) {
        return;
      }

      isRefreshingRef.current = true;
      try {
        await refreshRef.current();
      } finally {
        isRefreshingRef.current = false;
      }
    };

    const intervalId = window.setInterval(() => {
      void refreshIfVisible();
    }, interval);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshIfVisible();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, interval]);
}

export function setIfChanged(setState, nextValue) {
  setState((currentValue) =>
    JSON.stringify(currentValue) === JSON.stringify(nextValue)
      ? currentValue
      : nextValue
  );
}
