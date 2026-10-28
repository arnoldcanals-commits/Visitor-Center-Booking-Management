import { useEffect, useState } from "react";

const STORAGE_KEY = "showWelcome";

// Login.jsx sets sessionStorage["showWelcome"] = "true" right after a
// successful login. This hook picks that up on the first render of
// whatever page calls it (Dashboard), then immediately clears the flag —
// so refreshing the page or navigating back to Dashboard later won't
// show it again until the next real login.
//
// Deliberately NOT using React state/context for this: the whole reason
// the previous approach (App.jsx-level overlay) kept breaking is that
// Login unmounts the instant AuthContext flips `user` to truthy, before
// it can reliably hand anything off in-memory. sessionStorage survives
// that unmount/remount/redirect sequence with no race at all.
export default function useWelcomeOnLogin() {
  const [showWelcome, setShowWelcome] = useState(
    () => sessionStorage.getItem(STORAGE_KEY) === "true"
  );

  useEffect(() => {
    if (showWelcome) {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [showWelcome]);

  const dismiss = () => setShowWelcome(false);

  return [showWelcome, dismiss];
}