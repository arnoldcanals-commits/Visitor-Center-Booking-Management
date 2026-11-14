import { useEffect, useState } from "react";
import { Lottie } from "lottie-react";
import { LoaderCircle } from "lucide-react";
import dolphinAnimation from "./dolphin.json";

const LOADER_SESSION_KEY = "frontend-long-loader-played";

export function LoadingIndicator({ size = 140 }) {
  const [playLongAnimation, setPlayLongAnimation] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(LOADER_SESSION_KEY)) return;

    sessionStorage.setItem(LOADER_SESSION_KEY, "true");
    setPlayLongAnimation(true);
  }, []);

  return (
    <div
      role="status"
      aria-label="Loading"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
      }}
    >
      {playLongAnimation ? (
        <Lottie
          src={dolphinAnimation}
          autoplay
          loop={false}
          subscriptions={{
            complete: () => setPlayLongAnimation(false),
          }}
          style={{ width: size, height: size }}
        />
      ) : (
        <LoaderCircle
          className="animate-spin text-neutral-500"
          size={28}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default LoadingIndicator;