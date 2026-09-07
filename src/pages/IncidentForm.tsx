import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Save, ArrowLeft, Loader2, Flame, Clock, Calendar, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "../components/ToastContext";

const defaultFormData = {
  month: "", start_date: "", start_time: "", end_date: "", end_time: "",
  duration_time: "", duration_hours: "", duration_minutes: "",
  issue_scope: "", affected_service: "", responsible_department: "",
  reason: "", maintenance_approval: ""
};

export default function IncidentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>(defaultFormData);
  const toast = useToast();

  useEffect(() => {
    if (id) {
      fetchRecord();
    }
  }, [id]);

  const formatForDatePicker = (dateStr?: string) => {
    if (!dateStr || dateStr.trim() === '') return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return dateStr;
    }
  };

  const fetchRecord = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      if (data) {
        const formattedData = { ...data };
        if (formattedData.start_date) formattedData.start_date = formatForDatePicker(formattedData.start_date);
        if (formattedData.end_date) formattedData.end_date = formatForDatePicker(formattedData.end_date);
        setFormData({ ...defaultFormData, ...formattedData });
      }
    } catch (error: any) {
      console.error("Error fetching record:", error.message);
      toast.error("Failed to load record.");
      navigate("/incidents");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Clean up empty strings to null for numeric fields to avoid SQL errors
      const submissionData = { ...formData };
      ['duration_hours', 'duration_minutes'].forEach(field => {
        if (submissionData[field] === "") {
          submissionData[field] = null;
        }
      });
      
      // Clean up empty strings for dates/times
      ['start_date', 'start_time', 'end_date', 'end_time'].forEach(field => {
        if (submissionData[field] === "") {
          submissionData[field] = null;
        }
      });

      if (id) {
        // Update existing record
        const { error } = await supabase
          .from("incidents")
          .update(submissionData)
          .eq("id", id);
        
        if (error) throw error;
      } else {
        // Ensure user is attached
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          submissionData.created_by = session.user.id;
        }

        // Insert new record
        const { error } = await supabase
          .from("incidents")
          .insert([submissionData]);
          
        if (error) throw error;
      }
      
      navigate("/incidents");
    } catch (error: any) {
      console.error("Error saving record:", error.message);
      toast.error(`Failed to save record: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] overflow-auto custom-scrollbar pb-10">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between bg-card p-6 rounded-lg border border-border shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate("/incidents")}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Flame className="h-6 w-6 text-red-500" />
                {id ? "Edit Incident" : "New Incident"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {id ? "Update details for the selected network incident." : "Record a new network incident."}
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-md font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Record"}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section 1: Temporal Data */}
          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="bg-muted/50 p-4 border-b border-border flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <h2 className="font-semibold">Timing Details</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Month</label>
                <select 
                  name="month" 
                  value={formData.month || ''} 
                  onChange={handleChange}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select Month</option>
                  {['January', 'February', 'March', 'April', 'MAY', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Start Date</label>
                <Input 
                  type="date" 
                  name="start_date" 
                  value={formData.start_date || ''} 
                  onChange={handleChange} 
                  required
                  onClick={(e) => 'showPicker' in HTMLInputElement.prototype && (e.target as HTMLInputElement).showPicker()}
                  onKeyDown={(e) => e.preventDefault()}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Start Time</label>
                <Input 
                  type="time" 
                  name="start_time" 
                  value={formData.start_time || ''} 
                  onChange={handleChange} 
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">End Date</label>
                <Input 
                  type="date" 
                  name="end_date" 
                  value={formData.end_date || ''} 
                  onChange={handleChange} 
                  required
                  onClick={(e) => 'showPicker' in HTMLInputElement.prototype && (e.target as HTMLInputElement).showPicker()}
                  onKeyDown={(e) => e.preventDefault()}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">End Time</label>
                <Input 
                  type="time" 
                  name="end_time" 
                  value={formData.end_time || ''} 
                  onChange={handleChange} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Duration Time (HH:MM:SS)</label>
                <Input type="text" placeholder="e.g. 0:30:00" name="duration_time" value={formData.duration_time || ''} onChange={handleChange} required />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Duration (Hours)</label>
                <Input type="number" step="0.1" name="duration_hours" value={formData.duration_hours || ''} onChange={handleChange} />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Duration (Minutes)</label>
                <Input type="number" name="duration_minutes" value={formData.duration_minutes || ''} onChange={handleChange} />
              </div>

            </div>
          </div>

          {/* Section 2: Impact & Scope */}
          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="bg-muted/50 p-4 border-b border-border flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <h2 className="font-semibold">Impact & Scope</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Issue Scope</label>
                <Input type="text" name="issue_scope" value={formData.issue_scope || ''} onChange={handleChange} placeholder="e.g. RAQ#11 LTE site" required />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Affected Service</label>
                <Input type="text" name="affected_service" value={formData.affected_service || ''} onChange={handleChange} placeholder="What services were affected?" />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Responsible Department</label>
                <select 
                  name="responsible_department" 
                  value={formData.responsible_department || ''} 
                  onChange={handleChange}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select Department</option>
                  <option value="Operation">Operation</option>
                  <option value="IP">IP</option>
                  <option value="Core">Core</option>
                  <option value="Transmission">Transmission</option>
                  <option value="Developers">Developers</option>
                  <option value="System Admin">System Admin</option>
                  <option value="Unknown">Unknown</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Maintenance Approval</label>
                <select 
                  name="maintenance_approval" 
                  value={formData.maintenance_approval || ''} 
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select Approval</option>
                  <option value="Suddenly">Suddenly</option>
                  <option value="YES">YES</option>
                  <option value="NO">NO</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Reason for Incident</label>
                <textarea 
                  name="reason" 
                  value={formData.reason || ''} 
                  onChange={handleChange} 
                  rows={3}
                  placeholder="Provide a detailed description of why the incident occurred..."
                  required
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
