import React, { useEffect, useRef, useState } from "react";
import { Lottie } from "lottie-react";
import FreezingEYES from "./FreezingEYES.json";

const FADE_DURATION_MS = 350;

export default function WelcomeTransition({ onFinished, duration = 2200 }) {
  const [isExiting, setIsExiting] = useState(false);
  const hasFinishedRef = useRef(false);

  const finish = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setIsExiting(true);
    setTimeout(onFinished, FADE_DURATION_MS);
  };

  useEffect(() => {
    const timer = setTimeout(finish, duration);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gray-50 dark:bg-gray-950 transition-opacity duration-[350ms] ${
        isExiting ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="w-full max-w-4xl flex items-center justify-center px-8">
        <Lottie
          src={FreezingEYES}
          autoplay
          loop={false}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}