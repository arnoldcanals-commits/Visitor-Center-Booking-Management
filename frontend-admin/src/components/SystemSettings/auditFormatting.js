function formatValue(value) {
  if (value === null || value === undefined || value === "") return "empty";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "none";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function getAuditActor(log) {
  return log.changes?.actor || log.user_name || "System";
}

export function formatAuditAction(action) {
  return (action || "unknown").replace(/_/g, " ");
}

export function formatAuditChanges(changes) {
  const entries = Object.entries(changes || {}).filter(
    ([field]) => field !== "actor"
  );

  if (!entries.length) return "No field-level changes";

  return entries
    .map(([field, change]) => {
      const label = field.replace(/_/g, " ");

      if (
        change &&
        typeof change === "object" &&
        Object.prototype.hasOwnProperty.call(change, "from") &&
        Object.prototype.hasOwnProperty.call(change, "to")
      ) {
        return `${label}: ${formatValue(change.from)} → ${formatValue(change.to)}`;
      }

      if (change && typeof change === "object" && change.operation) {
        const ids = Array.isArray(change.ids) ? change.ids : [];
        return `${label} ${change.operation}: ${
          ids.length ? ids.join(", ") : "none"
        }`;
      }

      if (change && typeof change === "object" && change.changed === true) {
        return `${label} changed`;
      }

      return `${label}: ${formatValue(change)}`;
    })
    .join("; ");
}
