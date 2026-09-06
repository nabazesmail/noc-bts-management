import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Save, ArrowLeft, Loader2, MapPin, Clock, AlertTriangle, Activity } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "../components/ToastContext";

const defaultFormData = {
  quarter: "", month: "", start_date: "", start_time: "", end_date: "", end_time: "",
  duration: "", duration_minutes: "", noc_report_time: "", dispatched_team_source_city: "",
  team_dispatch_date: "", dispatched_time: "", arival_time: "", splicing_time: "",
  excavator_machine: "", maintenance_end_time: "", supervisors_name: "", region_cut_type: "",
  cut_type: "", cut_location: "", lat_coordinates: "", log_coordinates: "", distance_source_city: "",
  distance_km: "", protection: "", noc_cut_evaluation: "", reason: "", area_reason: "",
  impacted_lte_no: "", lte1: "", lte2: "", lte3: "", lte4: "", lte5: "", lte6: "", lte7: "", lte8: "",
  lte9: "", lte10: "", lte11: "", lte12: "", lte13: "", lte14: "", lte15: "", lte16: "", lte17: "",
  lte18: "", lte19: "", lte20: "", lte21: "", lte22: "", lte23: "", impacted_rxd_no: "",
  impacted_subpoints_rxd: "", impacted_rxd01: "", impacted_rxd02: "", impacted_heh_no: "",
  impacted_heh: "", impacted_z_location_no: "", impacted_subpoints_z_location: "",
  impacted_z_location01: "", impacted_z_location02: "", impacted_nodes: "",
  temporary_impacted_lte_no: "", temporary_impacted_lte: "", temporary_impacted_rxd_no: "",
  temporary_impacted_rxd: "", temporary_impacted_z_locatin: "", temporary_impacted_nodes: "",
  duration_temporary_impacted_services: "", comment: "", noc_response_time: "", noc_sla: "",
  noc_sla_status: "", dispatch_difference: "", dispatch_sla: "", dispatch_sla_status: "",
  travel_time: "", arrival_sla: "", arrival_sla_status: "", on_site_work_duration: "",
  troublshooting_sla: "", troublshoot_sla_status: "", link_recovery_duration: "", link_sla: "",
  link_sla_status2: ""
};

export default function FiberCutForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [reasons, setReasons] = useState<string[]>([]);
  const [formData, setFormData] = useState<any>(defaultFormData);
  const toast = useToast();

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const { data: locData } = await supabase.from('fiber_cut_locations').select('location_name');
        if (locData) setLocations(locData.map((d: any) => d.location_name));

        const { data: reasonData } = await supabase.from('fiber_cut_reasons').select('reason_text');
        if (reasonData) setReasons(reasonData.map((d: any) => d.reason_text));
      } catch (err) {
        console.error("Error fetching lookups", err);
      }
    };
    fetchLookups();

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
        .from("fiber_cuts")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      if (data) {
        const formattedData = { ...data };
        if (formattedData.start_date) formattedData.start_date = formatForDatePicker(formattedData.start_date);
        if (formattedData.end_date) formattedData.end_date = formatForDatePicker(formattedData.end_date);
        if (formattedData.team_dispatch_date) formattedData.team_dispatch_date = formatForDatePicker(formattedData.team_dispatch_date);
        setFormData({ ...defaultFormData, ...formattedData });
      }
    } catch (error: any) {
      console.error("Error fetching record:", error.message);
      toast.error("Failed to load record.");
      navigate("/fiber-cuts");
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
      let result;
      const dataToSave = { ...formData };
      
      // Clean up empty strings for UUIDs or other non-text if needed, though they are all TEXT in DB right now
      if (id) {
        result = await supabase.from("fiber_cuts").update(dataToSave).eq("id", id);
      } else {
        delete dataToSave.id;
        delete dataToSave.created_at;
        result = await supabase.from("fiber_cuts").insert([dataToSave]);
      }

      if (result.error) throw result.error;
      navigate("/fiber-cuts");
    } catch (error: any) {
      console.error("Error saving record:", error.message);
      toast.error("Failed to save record: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const SectionHeading = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wider border-b border-border pb-2 mb-4 flex items-center gap-2">
      <Icon className="w-4 h-4" /> {title}
    </h3>
  );

  return (
    <div className="p-6 h-full flex flex-col bg-background text-foreground overflow-hidden">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/fiber-cuts")}
            className="p-2 bg-card border border-border rounded-md hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {id ? "Edit Fiber Cut Record" : "New Fiber Cut Record"}
          </h1>
        </div>
        <button
          type="submit"
          form="fiber-cut-form"
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Record
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <form id="fiber-cut-form" onSubmit={handleSubmit} className="space-y-6 max-w-6xl mx-auto pb-12">
          
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <SectionHeading icon={MapPin} title="General & Location Information" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Location *</label>
                <select name="cut_location" value={formData.cut_location} onChange={handleChange} required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="">Select Location...</option>
                  {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Region *</label>
                <select name="region_cut_type" value={formData.region_cut_type} onChange={handleChange} required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="">Select Region...</option>
                  <option value="Region 1">Region 1</option>
                  <option value="Region 2">Region 2</option>
                  <option value="Region 3">Region 3</option>
                  <option value="Region 4">Region 4</option>
                  <option value="Between Region 1 & 2">Between Region 1 & 2</option>
                  <option value="Between Region 2 & 3">Between Region 2 & 3</option>
                  <option value="Between Region 3 & 4">Between Region 3 & 4</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Quarter *</label>
                <select name="quarter" value={formData.quarter} onChange={handleChange} required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="">Select Quarter...</option>
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Month *</label>
                <select name="month" value={formData.month} onChange={handleChange} required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="">Select Month...</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Cut Type *</label>
                <select name="cut_type" value={formData.cut_type} onChange={handleChange} required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="">Select Type...</option>
                  <option value="Backbone">Backbone</option>
                  <option value="Backhaul">Backhaul</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Reason *</label>
                <select name="reason" value={formData.reason} onChange={handleChange} required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="">Select Reason...</option>
                  {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Area Reason</label>
                <Input name="area_reason" value={formData.area_reason} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Evaluation</label>
                <Input name="noc_cut_evaluation" value={formData.noc_cut_evaluation} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Lat Coordinates *</label>
                <Input name="lat_coordinates" value={formData.lat_coordinates} onChange={handleChange} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Log Coordinates *</label>
                <Input name="log_coordinates" value={formData.log_coordinates} onChange={handleChange} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Distance Source City</label>
                <Input name="distance_source_city" value={formData.distance_source_city} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Distance (KM)</label>
                <Input name="distance_km" value={formData.distance_km} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <SectionHeading icon={Clock} title="Timeline & Dispatch Details" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Start Date *</label>
                <Input 
                  type="date" 
                  name="start_date" 
                  value={formData.start_date} 
                  onChange={handleChange} 
                  onClick={(e) => 'showPicker' in e.target && (e.target as any).showPicker()}
                  onKeyDown={(e) => e.preventDefault()}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Start Time *</label>
                <Input type="time" name="start_time" value={formData.start_time} onChange={handleChange} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">End Date</label>
                <Input 
                  type="date" 
                  name="end_date" 
                  value={formData.end_date} 
                  onChange={handleChange} 
                  onClick={(e) => 'showPicker' in e.target && (e.target as any).showPicker()}
                  onKeyDown={(e) => e.preventDefault()}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">End Time</label>
                <Input type="time" name="end_time" value={formData.end_time} onChange={handleChange} />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Duration</label>
                <Input name="duration" value={formData.duration} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Duration Mins</label>
                <Input name="duration_minutes" value={formData.duration_minutes} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">NOC Report Time</label>
                <Input type="time" name="noc_report_time" value={formData.noc_report_time} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Team Dispatch Date</label>
                <Input 
                  type="date" 
                  name="team_dispatch_date" 
                  value={formData.team_dispatch_date} 
                  onChange={handleChange} 
                  onClick={(e) => 'showPicker' in e.target && (e.target as any).showPicker()}
                  onKeyDown={(e) => e.preventDefault()}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Dispatched Team City</label>
                <Input name="dispatched_team_source_city" value={formData.dispatched_team_source_city} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Supervisor Name *</label>
                <Input name="supervisors_name" value={formData.supervisors_name} onChange={handleChange} placeholder="e.g. Jasem + Ayman" required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Excavator Machine</label>
                <Input name="excavator_machine" value={formData.excavator_machine} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Dispatched Time</label>
                <Input type="time" name="dispatched_time" value={formData.dispatched_time} onChange={handleChange} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Arrival Time</label>
                <Input type="time" name="arival_time" value={formData.arival_time} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Splicing Time</label>
                <Input type="time" name="splicing_time" value={formData.splicing_time} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Maintenance End Time</label>
                <Input type="time" name="maintenance_end_time" value={formData.maintenance_end_time} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">On-Site Work Duration</label>
                <Input name="on_site_work_duration" value={formData.on_site_work_duration} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <SectionHeading icon={AlertTriangle} title="Impact Details" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Total Impacted Nodes</label>
                <Input name="impacted_nodes" value={formData.impacted_nodes} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Impacted LTE No</label>
                <Input name="impacted_lte_no" value={formData.impacted_lte_no} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Impacted RXD No</label>
                <Input name="impacted_rxd_no" value={formData.impacted_rxd_no} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Impacted Z-Location No</label>
                <Input name="impacted_z_location_no" value={formData.impacted_z_location_no} onChange={handleChange} />
              </div>
            </div>
            
            <details className="mb-4">
              <summary className="text-sm font-semibold text-muted-foreground cursor-pointer hover:text-foreground">View Specific LTE Impacts (LTE 1-23)</summary>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-4">
                {Array.from({length: 23}, (_, i) => i + 1).map(num => (
                  <div key={num} className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">LTE {num}</label>
                    <Input name={`lte${num}`} value={formData[`lte${num}`]} onChange={handleChange} />
                  </div>
                ))}
              </div>
            </details>

            <details>
              <summary className="text-sm font-semibold text-muted-foreground cursor-pointer hover:text-foreground">View Temporary Impacts & Other</summary>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Temp Impacted LTE No</label>
                  <Input name="temporary_impacted_lte_no" value={formData.temporary_impacted_lte_no} onChange={handleChange} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Temp Impacted LTE</label>
                  <Input name="temporary_impacted_lte" value={formData.temporary_impacted_lte} onChange={handleChange} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Temp Impacted Nodes</label>
                  <Input name="temporary_impacted_nodes" value={formData.temporary_impacted_nodes} onChange={handleChange} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Duration Temp Services</label>
                  <Input name="duration_temporary_impacted_services" value={formData.duration_temporary_impacted_services} onChange={handleChange} />
                </div>
              </div>
            </details>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <SectionHeading icon={Activity} title="SLA & Analysis" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">NOC Response Time</label>
                <Input name="noc_response_time" value={formData.noc_response_time} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">NOC SLA</label>
                <Input name="noc_sla" value={formData.noc_sla} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">NOC SLA Status</label>
                <select name="noc_sla_status" value={formData.noc_sla_status} onChange={handleChange} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="">Select...</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="NA">NA</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Dispatch SLA Status</label>
                <Input name="dispatch_sla_status" value={formData.dispatch_sla_status} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Arrival SLA Status</label>
                <Input name="arrival_sla_status" value={formData.arrival_sla_status} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Link SLA Status</label>
                <Input name="link_sla_status2" value={formData.link_sla_status2} onChange={handleChange} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">Comment</label>
                <Input name="comment" value={formData.comment} onChange={handleChange} />
              </div>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
