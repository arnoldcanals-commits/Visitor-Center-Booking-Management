import React, { useContext } from "react";
import { AdminDataContext } from "../../contexts/AdminDataContext";

export default function AuditSettings() {
  const { adminData } = useContext(AdminDataContext);
  const auditLogs = adminData?.audit_logs || [];

  return (
    <div className="p-0 overflow-x-auto">
      <div className="p-8 bg-slate-50/50 border-b border-slate-100">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">System Audit Trail</h3>
      </div>
      <table className="w-full text-left font-mono text-[11px]">
        <thead className="bg-slate-50 border-b border-slate-100 text-slate-400">
          <tr>
            <th className="px-10 py-4 uppercase font-black">Action</th>
            <th className="px-10 py-4 uppercase font-black">Target Object</th>
            <th className="px-10 py-4 uppercase font-black">Changes / Metadata</th>
            <th className="px-10 py-4 uppercase font-black text-right">Timestamp</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {auditLogs.map((log) => (
            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-10 py-4">
                <span className={`px-2 py-1 rounded uppercase font-black text-[9px] ${
                  log.action === 'created' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {log.action}
                </span>
              </td>
              <td className="px-10 py-4 text-slate-900 font-bold uppercase tracking-tighter">
                {log.content_type} <span className="text-slate-300 ml-1 font-normal">#{log.object_id}</span>
              </td>
              <td className="px-10 py-4 text-slate-500 max-w-xs truncate">
                {log.changes ? JSON.stringify(log.changes) : "No field-level details"}
              </td>
              <td className="px-10 py-4 text-right text-slate-400 whitespace-nowrap">
                {new Date(log.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}