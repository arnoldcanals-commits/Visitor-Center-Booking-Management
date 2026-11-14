import React, { useContext, useMemo, useState } from "react";
import { AdminDataContext } from "../../contexts/AdminDataContext";
import {
  formatAuditAction,
  formatAuditChanges,
  getAuditActor,
} from "./auditFormatting";

const EMPTY_AUDIT_LOGS = [];

export default function AuditSettings() {
  const { adminData } = useContext(AdminDataContext);
  const [search, setSearch] = useState("");
  const auditLogs = adminData?.audit_logs || EMPTY_AUDIT_LOGS;
  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return auditLogs;
    return auditLogs.filter((log) =>
      [
        getAuditActor(log),
        log.action,
        log.content_type_name,
        log.content_type,
        log.object_id,
        formatAuditChanges(log.changes),
        JSON.stringify(log.changes || {}),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [auditLogs, search]);

  return (
    <div className="p-0 overflow-x-auto">
      <div className="p-8 bg-slate-50/50 border-b border-slate-100">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">System Audit Trail</h3>
      </div>
      <div className="p-4">
        <label className="sr-only" htmlFor="audit-search">Search audit log</label>
        <input
          id="audit-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search people, actions, targets, or changes"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>
      <table className="w-full text-left font-mono text-[11px]">
        <thead className="bg-slate-50 border-b border-slate-100 text-slate-400">
          <tr>
            <th className="px-6 py-4 uppercase font-black">Who</th>
            <th className="px-10 py-4 uppercase font-black">Action</th>
            <th className="px-10 py-4 uppercase font-black">Target Object</th>
            <th className="px-10 py-4 uppercase font-black">What changed</th>
            <th className="px-10 py-4 uppercase font-black text-right">Timestamp</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {filteredLogs.map((log) => (
            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 text-slate-700">
                {getAuditActor(log)}
              </td>
              <td className="px-10 py-4">
                <span className={`px-2 py-1 rounded uppercase font-black text-[9px] ${
                  log.action === 'created' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {formatAuditAction(log.action)}
                </span>
              </td>
              <td className="px-10 py-4 text-slate-900 font-bold uppercase tracking-tighter">
                {log.content_type_name || log.content_type} <span className="text-slate-300 ml-1 font-normal">#{log.object_id}</span>
              </td>
              <td className="px-10 py-4 text-slate-500 max-w-xl">
                <p className="break-words">{formatAuditChanges(log.changes)}</p>
                <details className="mt-1">
                  <summary className="cursor-pointer text-[10px] text-slate-400">
                    Full audit data
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words text-[10px]">
                    {JSON.stringify(log.changes, null, 2)}
                  </pre>
                </details>
              </td>
              <td className="px-10 py-4 text-right text-slate-400 whitespace-nowrap">
                {new Date(log.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
          {filteredLogs.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                {search ? "No matching audit entries found." : "No audit entries recorded yet."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}