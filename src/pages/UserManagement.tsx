import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { useToast } from "@/components/ToastContext";
import { Profile } from "@/types";
import { Search, UserCog, Check, X, ShieldAlert, Plus, Trash2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";

const AVAILABLE_PAGES = [
  { name: "Dashboard", path: "/" },
  { name: "Site Data", path: "/sites" },
  { name: "Site Locations", path: "/locations" },
  { name: "SLA Tracking", path: "/sla-tracking" },
  { name: "Fiber Cuts", path: "/fiber-cuts" },
  { name: "Fiber Cut Map", path: "/fiber-cut-map" },
  { name: "Customer Tickets", path: "/tickets" },
  { name: "Audit History", path: "/audit" },
];

export default function UserManagement({ currentUser }: { currentUser: Profile | null }) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editRole, setEditRole] = useState<"admin" | "user">("user");
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [isAddingUser, setIsAddingUser] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  
  const toast = useToast();
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*");
    if (error) {
      console.error("Error fetching users:", error);
    } else if (data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const handleEdit = (user: Profile) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditPermissions(user.permissions || []);
  };

  const handleTogglePermission = (path: string) => {
    setEditPermissions(prev => 
      prev.includes(path) 
        ? prev.filter(p => p !== path)
        : [...prev, path]
    );
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          role: editRole,
          permissions: editPermissions
        })
        .eq("id", editingUser.id);
        
      if (error) throw error;
      
      await fetchUsers();
      setEditingUser(null);
      toast.success("User updated successfully");
    } catch (err: any) {
      toast.error("Error updating user: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteUserId) return;
    
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", deleteUserId);
      if (error) throw error;
      toast.success("User deleted successfully");
      await fetchUsers();
      setDeleteUserId(null);
    } catch (err: any) {
      toast.error("Error deleting user: " + err.message);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSaving(true);
    try {
      const tempClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          }
        }
      );

      const { error } = await tempClient.auth.signUp({
        email: newEmail.trim(),
        password: newPassword,
        options: {
          data: {
            name: newName,
          }
        }
      });
      
      if (error) throw error;
      
      setIsAddingUser(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      toast.success("User created successfully");
      await fetchUsers();
      
    } catch (err: any) {
      toast.error("Error creating user: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center flex-col gap-4">
        <ShieldAlert className="h-16 w-16 text-red-500" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You must be an administrator to view this page.</p>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage system access, roles, and specific page permissions.</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-full bg-card"
          />
        </div>
        <button
          onClick={() => setIsAddingUser(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors whitespace-nowrap shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase font-medium">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Permissions (If User)</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{user.name || "Unknown"}</td>
                    <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        user.role === 'admin' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.role === 'admin' ? (
                        <span className="text-muted-foreground text-xs italic">Full Access</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(user.permissions && user.permissions.length > 0) ? (
                            AVAILABLE_PAGES.filter(p => user.permissions?.includes(p.path)).map(p => (
                              <span key={p.path} className="px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-[10px] rounded-md font-medium">
                                {p.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-red-500 text-xs font-medium">No Access</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                      >
                        <UserCog className="w-4 h-4" />
                        Access
                      </button>
                      <button
                        onClick={() => setDeleteUserId(user.id)}
                        disabled={user.id === currentUser.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-xl shadow-lg border border-border flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-bold text-lg">Edit User Access</h3>
              <button onClick={() => setEditingUser(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">User</p>
                <p className="font-semibold">{editingUser.name} <span className="font-normal text-muted-foreground">({editingUser.email})</span></p>
              </div>
              
              <div className="space-y-3">
                <label className="text-sm font-bold block">Account Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setEditRole("user")}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      editRole === "user" 
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400" 
                        : "border-border hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    Standard User
                  </button>
                  <button
                    onClick={() => setEditRole("admin")}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      editRole === "admin" 
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400" 
                        : "border-border hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    Administrator
                  </button>
                </div>
                {editRole === "admin" && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 p-2 rounded-md">
                    Administrators bypass all page restrictions and have full access to the entire system.
                  </p>
                )}
              </div>
              
              {editRole === "user" && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <label className="text-sm font-bold block">Specific Page Permissions</label>
                  <p className="text-xs text-muted-foreground mb-3">Select which pages this user is allowed to view.</p>
                  
                  <div className="space-y-2">
                    {AVAILABLE_PAGES.map(page => {
                      const isChecked = editPermissions.includes(page.path);
                      return (
                        <label 
                          key={page.path}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isChecked ? 'border-green-500/50 bg-green-50/30 dark:bg-green-900/10' : 'border-border hover:bg-muted/50'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${
                            isChecked ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-gray-600 bg-background'
                          }`}>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={isChecked}
                              onChange={() => handleTogglePermission(page.path)}
                            />
                            {isChecked && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <div className="flex-1">
                            <span className="font-medium text-sm">{page.name}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-end gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-md text-sm font-medium hover:bg-muted transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-xl shadow-lg border border-border flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-bold text-lg">Add New User</h3>
              <button onClick={() => setIsAddingUser(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddUser}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Name</label>
                  <Input 
                    required 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    placeholder="John Doe" 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Email</label>
                  <Input 
                    type="email" 
                    required 
                    value={newEmail} 
                    onChange={e => setNewEmail(e.target.value)} 
                    placeholder="john@example.com" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Password</label>
                  <Input 
                    type="password" 
                    required 
                    minLength={6}
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    placeholder="••••••••" 
                  />
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddingUser(false)}
                  className="px-4 py-2 rounded-md text-sm font-medium hover:bg-muted transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {saving ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deleteUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
                <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Delete User Profile</h3>
              </div>
              <p className="text-muted-foreground mb-1">
                Are you sure you want to delete this profile? This removes their access entirely.
              </p>
              <p className="text-xs text-muted-foreground/70 mb-6">
                Note: Their base authentication account may still exist in Supabase Auth but they won't have a profile or any access.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteUserId(null)}
                  className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Delete Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
