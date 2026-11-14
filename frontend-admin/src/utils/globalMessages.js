const subscribers = new Set();
const pendingMessages = [];

function normalizeMessage(message) {
  if (typeof message === "string") return message;
  if (Array.isArray(message)) return message.join("; ");
  if (message && typeof message === "object") return JSON.stringify(message);
  return String(message ?? "");
}

function getApiErrorMessage(error) {
  const data = error.response?.data;
  const detail = data?.detail ?? data?.message;
  if (detail) return normalizeMessage(detail);

  if (data && typeof data === "object") {
    const values = Object.values(data).flat(Infinity).filter(Boolean);
    if (values.length) return values.map(normalizeMessage).join("; ");
  }

  if (error.response?.status) {
    return `The server returned an error (${error.response.status}). Please try again.`;
  }
  return error.message || "Unable to connect. Please try again.";
}

export function showGlobalMessage(message, type = "info", sourceError) {
  const config = sourceError?.config;
  if (config?._globalMessageTimer !== undefined) {
    window.clearTimeout(config._globalMessageTimer);
    delete config._globalMessageTimer;
  }

  const text = normalizeMessage(message);
  if (!text) return;

  const globalMessage = { message: text, type };
  if (subscribers.size === 0) {
    pendingMessages.push(globalMessage);
  } else {
    subscribers.forEach((subscriber) => subscriber(globalMessage));
  }
}

export function subscribeToGlobalMessages(subscriber) {
  subscribers.add(subscriber);
  pendingMessages.splice(0).forEach(subscriber);
  return () => subscribers.delete(subscriber);
}

export function queueGlobalApiError(error) {
  if (error.config?.suppressGlobalMessage) return;
  if (error.response && error.response.status < 500) return;

  const config = error.config;
  if (!config) {
    showGlobalMessage(getApiErrorMessage(error), "error");
    return;
  }

  const timer = window.setTimeout(() => {
    if (config._globalMessageTimer !== timer) return;
    delete config._globalMessageTimer;
    showGlobalMessage(getApiErrorMessage(error), "error");
  }, 0);
  config._globalMessageTimer = timer;
}
