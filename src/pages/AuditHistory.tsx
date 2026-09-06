import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Profile } from "../types";

interface AuditHistoryProps {
  profile: Profile | null;
}

interface AuditLog {
  id: string;
  created_at: string;
  user_email: string;
  site_id: string;
  site_name: string;
  site_code: string;
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

      // FIXED QUERY: Fetches direct columns without the 'sites(...)' join
      const { data, error } = await supabase
        .from("site_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error("Error fetching audit logs:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(
    (log) => {
      // Ignore phantom empty logs coming from the old undeleted database trigger
      if (log.action === "UPDATE" && !log.field_name) {
        return false;
      }
      return (
        log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.site_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.site_code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  );

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
              <th className="p-4 font-semibold text-sm">Site</th>
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
                  <td className="p-4 text-sm text-gray-900 dark:text-gray-100">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-4 text-sm text-gray-700 dark:text-gray-300">{log.user_email}</td>

                  {/* Safely display the site code directly from the history table */}
                  <td className="p-4 text-sm text-gray-700 dark:text-gray-300">
                    {log.site_code || log.site_name || "Unknown Site"}
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
                    {log.field_name || "-"}
                  </td>
                  <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                    {log.old_value || "-"}
                  </td>
                  <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                    {log.new_value || "-"}
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
