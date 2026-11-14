import { useEffect, useState } from "react";
import { subscribeToGlobalMessages } from "../utils/globalMessages";

const MESSAGE_STYLES = {
  error: {
    title: "Something went wrong",
    icon: "!",
    color: "bg-red-100 text-red-700",
  },
  success: {
    title: "Success",
    icon: "✓",
    color: "bg-emerald-100 text-emerald-700",
  },
  warning: {
    title: "Please note",
    icon: "!",
    color: "bg-amber-100 text-amber-700",
  },
  info: {
    title: "Message",
    icon: "i",
    color: "bg-blue-100 text-blue-700",
  },
};

export default function GlobalMessageModal() {
  const [messages, setMessages] = useState([]);
  const current = messages[0];

  useEffect(() => {
    return subscribeToGlobalMessages((message) => {
      setMessages((pending) => [...pending, message]);
    });
  }, []);

  useEffect(() => {
    if (!current) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMessages((pending) => pending.slice(1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [current]);

  if (!current) return null;

  const style = MESSAGE_STYLES[current.type] || MESSAGE_STYLES.info;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="global-message-title"
        aria-describedby="global-message-content"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
      >
        <div className="flex items-start gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold ${style.color}`}>
            {style.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="global-message-title" className="text-lg font-semibold text-slate-900 dark:text-white">
              {style.title}
            </h2>
            <p id="global-message-content" className="mt-2 break-words text-sm text-slate-600 dark:text-slate-300">
              {current.message}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            autoFocus
            onClick={() => setMessages((pending) => pending.slice(1))}
            className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Dismiss
          </button>
        </div>
      </section>
    </div>
  );
}
