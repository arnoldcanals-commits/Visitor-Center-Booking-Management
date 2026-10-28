import { Lottie } from "lottie-react";
import dolphinAnimation from "./dolphin.json";

export function LoadingIndicator({ size = 140 }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
      }}
    >
      <Lottie
        src={dolphinAnimation}
        autoplay
        loop
        style={{ width: size, height: size }}
      />
    </div>
  );
}

export default LoadingIndicator;