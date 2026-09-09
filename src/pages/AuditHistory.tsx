import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Profile } from "../types";

interface AuditHistoryProps {
  profile: Profile | null;
}

interface AuditLog {
  id: string;
  created_at: string;
  user_email: string;
  record_type: string;
  record_id: string;
  record_name: string;
  action: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
}

export default function AuditHistory({}: AuditHistoryProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);

      const { data, error } = await api.get("/global_audit_logs");

      if (error) throw error;
      
      // Sort and limit in memory since the backend doesn't support complex queries out of the box yet
      const sortedData = (data || []).sort((a: any, b: any) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }).slice(0, 200);

      setLogs(sortedData);
    } catch (error: any) {
      console.error("Error fetching audit logs:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(
    (log) => {
      // Display manual database updates (which lack a field_name) as System changes
      const isManualDbUpdate = log.action === "UPDATE" && !log.field_name;
      
      const searchTarget = isManualDbUpdate 
        ? "system manual update"
        : `${log.user_email || ''} ${log.action || ''} ${log.record_type || ''} ${log.record_name || ''} ${log.field_name || ''}`.toLowerCase();

      return searchTarget.includes(searchTerm.toLowerCase());
    }
  );

  const formatAuditDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${day} ${month}, ${year} at ${hours}:${minutes} ${ampm}`;
  };

  const formatAuditValue = (val: string | null | undefined, field: string | undefined, otherVal: string | null | undefined) => {
    let result = val || "-";

    if (field === 'comments') {
      const v = (val || '').trim();
      const o = (otherVal || '').trim();
      
      if (v === '' && o.toLowerCase().includes('off air')) {
        result = '[On Air]';
      }
    }

    if (field === 'enodb_20' || field === 'enodb_7') {
      const v = (val || '').trim();
      const o = (otherVal || '').trim();
      
      const vNum = v.replace(/\[?off air\]?/gi, '').trim();
      const oNum = o.replace(/\[?off air\]?/gi, '').trim();

      if (vNum === oNum && vNum !== '') {
        if (v.toLowerCase().includes('off air')) {
          result = "Off-Air";
        } else {
          result = "On-Air";
        }
      }
    }

    if (result.length > 30) {
      return (
        <span title={result} className="cursor-help border-b border-dashed border-gray-400 dark:border-gray-600 pb-0.5">
          {result.substring(0, 30)}...
        </span>
      );
    }

    return result;
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Audit History</h1>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter by user email or action..."
          className="border p-2 rounded w-full max-w-md dark:bg-gray-900 dark:border-gray-800 dark:text-gray-100"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded shadow overflow-x-auto border dark:border-gray-800">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <th className="p-4 font-semibold text-sm">Timestamp</th>
              <th className="p-4 font-semibold text-sm">User</th>
              <th className="p-4 font-semibold text-sm">Type</th>
              <th className="p-4 font-semibold text-sm">Record</th>
              <th className="p-4 font-semibold text-sm">Action</th>
              <th className="p-4 font-semibold text-sm">Field</th>
              <th className="p-4 font-semibold text-sm">Old Value</th>
              <th className="p-4 font-semibold text-sm">New Value</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-4 text-center">
                  Loading logs...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center">
                  No logs found.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-4 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {formatAuditDate(log.created_at)}
                  </td>
                  <td className="p-4 text-sm text-gray-700 dark:text-gray-300">
                    {log.user_email ? (
                      log.user_email
                    ) : (
                      <span className="text-gray-500 italic">System</span>
                    )}
                  </td>
                  
                  <td className="p-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {log.record_type}
                  </td>

                  <td className="p-4 text-sm text-gray-700 dark:text-gray-300">
                    {log.record_name || log.record_id || "Unknown Record"}
                  </td>

                  <td className="p-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        log.action === "DELETE"
                          ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          : log.action === "INSERT"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                    {(!log.field_name && log.action === 'UPDATE') ? (
                      <span className="italic text-gray-400">Manual DB Update</span>
                    ) : (
                      log.field_name || "-"
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] xl:max-w-[300px] truncate">
                    {formatAuditValue(log.old_value, log.field_name, log.new_value)}
                  </td>
                  <td className="p-4 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] xl:max-w-[300px] truncate">
                    {formatAuditValue(log.new_value, log.field_name, log.old_value)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
