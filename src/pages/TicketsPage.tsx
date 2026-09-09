import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Profile } from "@/types";
import { useToast } from "@/components/ToastContext";
import { Plus, X, Search, Ticket, MapPin, Map, Clock, CheckCircle2, Copy, Edit2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { formatDisplayDate } from "@/lib/utils";

export default function TicketsPage({ profile }: { profile: Profile | null }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const toast = useToast();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editTicketId, setEditTicketId] = useState<string | null>(null);
  const [confirmTicket, setConfirmTicket] = useState<any>(null);
  const [deleteTicket, setDeleteTicket] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [citiesList, setCitiesList] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    region: "",
    city: "",
    latitude: "",
    longitude: "",
    description: "",
    status: "open",
    tracking_id: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTickets();
    fetchCities();
  }, []);

  const fetchCities = async () => {
    const { data } = await api.get("/cities");
    if (data) {
      setCitiesList(data.map((c: any) => c.name).sort());
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    const { data, error } = await api.get("/tickets");
      
    if (error) {
      console.error("Error fetching tickets:", error);
    } else if (data) {
      setTickets(data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const payload = {
        region: formData.region,
        city: formData.city,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        description: formData.description,
        status: formData.status,
        tracking_id: formData.tracking_id
      };

      if (editTicketId) {
        const { error } = await api.put(`/tickets/${editTicketId}`, payload);
        if (error) throw error;
        toast.success("Ticket updated successfully");
      } else {
        const { error } = await api.post("/tickets", payload);
        if (error) throw error;
        toast.success("Ticket saved successfully");
      }
      
      setIsAdding(false);
      setEditTicketId(null);
      setFormData({ region: "", city: "", latitude: "", longitude: "", description: "", status: "open", tracking_id: "" });
      await fetchTickets();
    } catch (err: any) {
      toast.error("Error saving ticket: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (ticket: any) => {
    setFormData({
      region: ticket.region || "",
      city: ticket.city || "",
      latitude: ticket.latitude ? String(ticket.latitude) : "",
      longitude: ticket.longitude ? String(ticket.longitude) : "",
      description: ticket.description || "",
      status: ticket.status || "open",
      tracking_id: ticket.tracking_id || ""
    });
    setEditTicketId(ticket.id);
    setIsAdding(true);
  };

  const confirmDelete = async () => {
    if (!deleteTicket) return;
    try {
      const { error } = await api.delete(`/tickets/${deleteTicket.id}`);
      if (error) throw error;
      toast.success("Ticket deleted successfully");
      setDeleteTicket(null);
      await fetchTickets();
    } catch (err: any) {
      toast.error("Error deleting ticket: " + err.message);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const confirmStatusToggle = async () => {
    if (!confirmTicket) return;
    const newStatus = confirmTicket.status === "open" ? "closed" : "open";
    try {
      const { error } = await api.put(`/tickets/${confirmTicket.id}`, { status: newStatus });
        
      if (error) throw error;
      toast.success("Ticket status updated");
      setConfirmTicket(null);
      await fetchTickets();
    } catch (err: any) {
      toast.error("Error updating status: " + err.message);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.city?.toLowerCase().includes(search.toLowerCase()) ||
      t.region?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.tracking_id?.toLowerCase().includes(search.toLowerCase());

    const matchesRegion = regionFilter === "All" || t.region === regionFilter;
    const matchesStatus = statusFilter === "All" || t.status === statusFilter;

    return matchesSearch && matchesRegion && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Ticket className="w-10 h-10 text-white drop-shadow-md" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white dark:text-white uppercase">CUSTOMER TICKETS</h2>
            <p className="text-gray-300 dark:text-gray-400 mt-1">Manage network complaint tickets and map them to sites.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <select
            className="flex h-10 w-full sm:w-36 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring dark:bg-gray-900 dark:border-gray-800"
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
          >
            <option value="All">All Regions</option>
            <option value="Region 1">Region 1</option>
            <option value="Region 2">Region 2</option>
            <option value="Region 3">Region 3</option>
            <option value="Region 4">Region 4</option>
          </select>

          <select
            className="flex h-10 w-full sm:w-32 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring dark:bg-gray-900 dark:border-gray-800"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search tickets..."
              className="pl-9 bg-white dark:bg-gray-900"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => {
              setEditTicketId(null);
              setFormData({ region: "", city: "", latitude: "", longitude: "", description: "", status: "open", tracking_id: "" });
              setIsAdding(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Ticket
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-muted-foreground">Loading tickets...</p>
        ) : filteredTickets.length === 0 ? (
          <p className="text-muted-foreground">No tickets found.</p>
        ) : (
          filteredTickets.map(ticket => (
            <div key={ticket.id} className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-blue-500" />
                  <span className="font-bold text-lg">{ticket.city || "Unknown City"}</span>
                  {ticket.tracking_id && (
                    <div className="flex items-center gap-1 ml-2">
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-mono rounded border border-blue-200 dark:border-blue-800">
                        {ticket.tracking_id}
                      </span>
                      <button 
                        onClick={() => handleCopy(ticket.id, ticket.tracking_id)}
                        className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                        title="Copy Tracking ID"
                      >
                        {copiedId === ticket.id ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setConfirmTicket(ticket)}
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    ticket.status === 'open' 
                      ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' 
                      : 'bg-green-100 text-green-700 border border-green-200'
                  }`}
                >
                  {ticket.status}
                </button>
              </div>
              
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Map className="h-4 w-4" />
                  <span>Region: {ticket.region || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <MapPin className="h-4 w-4" />
                  <span>Lat: {ticket.latitude}, Lng: {ticket.longitude}</span>
                  <Link 
                    to={`/locations?lat=${ticket.latitude}&lng=${ticket.longitude}&zoom=14`}
                    className="ml-auto flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded transition-colors"
                  >
                    <Map className="h-3 w-3" />
                    View on Map
                  </Link>
                </div>
                {ticket.description && (
                  <div className="mt-3 text-sm bg-muted/50 p-3 rounded-md border border-border/50">
                    {ticket.description}
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDisplayDate(ticket.created_at)}
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => startEdit(ticket)}
                    className="p-1 hover:bg-muted text-gray-500 hover:text-blue-600 rounded transition-colors"
                    title="Edit Ticket"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => setDeleteTicket(ticket)}
                    className="p-1 hover:bg-muted text-gray-500 hover:text-red-600 rounded transition-colors"
                    title="Delete Ticket"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {ticket.status === 'closed' && (
                    <div className="flex items-center gap-1 text-green-600 ml-2 border-l pl-3 border-border">
                      <CheckCircle2 className="h-3 w-3" />
                      Resolved
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-border">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <h3 className="font-bold text-lg">{editTicketId ? "Edit Ticket" : "Create New Ticket"}</h3>
              <button onClick={() => { setIsAdding(false); setEditTicketId(null); }} className="p-1 hover:bg-muted rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Region</label>
                  <select 
                    required 
                    className="w-full flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData.region} 
                    onChange={e => setFormData({...formData, region: e.target.value})}
                  >
                    <option value="">Select Region...</option>
                    <option value="Region 1">Region 1</option>
                    <option value="Region 2">Region 2</option>
                    <option value="Region 3">Region 3</option>
                    <option value="Region 4">Region 4</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">City</label>
                  <select 
                    required 
                    className="w-full flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData.city} 
                    onChange={e => setFormData({...formData, city: e.target.value})}
                  >
                    <option value="">Select City...</option>
                    {citiesList.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Latitude</label>
                  <Input 
                    required 
                    type="number"
                    step="any"
                    value={formData.latitude} 
                    onChange={e => setFormData({...formData, latitude: e.target.value})} 
                    placeholder="33.5"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Longitude</label>
                  <Input 
                    required 
                    type="number"
                    step="any"
                    value={formData.longitude} 
                    onChange={e => setFormData({...formData, longitude: e.target.value})} 
                    placeholder="36.2"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium">Status</label>
                <select 
                  className="w-full flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={formData.status} 
                  onChange={e => setFormData({...formData, status: e.target.value})}
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Tracking ID (Optional)</label>
                <Input 
                  value={formData.tracking_id} 
                  onChange={e => setFormData({...formData, tracking_id: e.target.value})} 
                  placeholder="e.g. INC-12345"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Description (Optional)</label>
                <textarea 
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Describe the complaint..."
                />
              </div>
              
              <div className="pt-4 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => { setIsAdding(false); setEditTicketId(null); }}
                  className="px-4 py-2 rounded-md hover:bg-muted font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Change Ticket Status?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Are you sure you want to mark this ticket as {confirmTicket.status === 'open' ? 'closed' : 'open'}?
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                onClick={() => setConfirmTicket(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                onClick={confirmStatusToggle}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Delete Ticket?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Are you sure you want to permanently delete this ticket for <span className="font-bold text-gray-700 dark:text-gray-300">{deleteTicket.city}</span>? This action cannot be undone.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                onClick={() => setDeleteTicket(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                onClick={confirmDelete}
              >
                Delete Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
