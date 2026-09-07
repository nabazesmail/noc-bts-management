import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { SlaTracking } from "../types";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "../components/ToastContext";

export default function SlaForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [nocStaffList, setNocStaffList] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [technicalAreas, setTechnicalAreas] = useState<string[]>([]);
  const [reasons, setReasons] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [staff1, setStaff1] = useState("");
  const [staff2, setStaff2] = useState("");
  const [staff3, setStaff3] = useState("");

  const [formData, setFormData] = useState<Partial<SlaTracking>>({
    month: "", day: "", shift: "", region: "", city: "", 
    service_type: "", site_code_dc: "", noc_mtta: "", noc_sla: "3", 
    noc_sla_status: "", site_mttr: "", site_sla: "83", site_sla_status: "", 
    band_type: "", band: "", start_date: "", start_time: "00:00:00", end_date: "", 
    end_time: "00:00:00", duration_time: "", duration_hours: "", duration_minutes: "", 
    responsible_department: "", issue_technical_area: "", reason: "", 
    comment: "", status: "Open", peak_none_peak: ""
  });

  useEffect(() => {
    fetchLookups();
    if (id) {
      fetchSlaRecord();
    }
  }, [id]);

  const fetchLookups = async () => {
    try {
      const { data: cityData } = await api.get("/cities");
      if (cityData) setCities(cityData.map((c: any) => c.name));
      
      const { data: staffData } = await api.get("/noc_staff");
      if (staffData) {
        setNocStaffList(staffData.map((s: any) => {
          const name = String(s.name || '');
          return name.charAt(0).toUpperCase() + name.slice(1);
        }));
      }

      const { data: deptData, error: deptError } = await api.get("/sla_departments");
      if (deptError) console.error("Error fetching sla_departments:", deptError);
      if (deptData) setDepartments(deptData.map((d: any) => d.name));

      const { data: techData, error: techError } = await api.get("/sla_technical_areas");
      if (techError) console.error("Error fetching sla_technical_areas:", techError);
      if (techData) setTechnicalAreas(techData.map((t: any) => t.name));

      const { data: reasonData, error: reasonError } = await api.get("/sla_reasons");
      if (reasonError) console.error("Error fetching sla_reasons:", reasonError);
      if (reasonData) setReasons(reasonData.map((r: any) => r.name));
    } catch (error) {
      console.error("Error fetching lookups", error);
    }
  };

  const fetchSlaRecord = async () => {
    try {
      setLoading(true);
      const { data, error } = await api.get(`/slatracking/${id}`);
      
      if (error) throw error;
      if (data) {
        setFormData(data);
        if (data.noc_staff) {
          const formatName = (n: string) => n.charAt(0).toUpperCase() + n.slice(1);
          const staffParts = data.noc_staff.split(/\s*[+,&]\s*/).map((s: string) => formatName(s.trim())).filter(Boolean);
          if (staffParts[0]) setStaff1(staffParts[0]);
          if (staffParts[1]) setStaff2(staffParts[1]);
          if (staffParts[2]) setStaff3(staffParts[2]);
        }
      }
    } catch (error: any) {
      console.error("Error fetching SLA record:", error.message);
      toast.error("Failed to load SLA record.");
      navigate("/sla-tracking");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const requiredFields = ["month", "day", "shift", "region", "city", "site_code_dc"];
    requiredFields.forEach(f => {
      if (!(formData as any)[f]) newErrors[f] = "Required";
    });

    if (formData.site_code_dc) {
      const codeRegex = /^([A-Z]+(?:-[A-Z]+)?#\d+|[A-Z0-9\-]+\s*Node)$/i;
      if (!codeRegex.test(formData.site_code_dc)) {
        newErrors.site_code_dc = "Format must be like QAM#45, QAM-HAS#45, or SIR-Node";
      }
    }

    if (formData.duration_time && !/^\d{1,}:\d{2}:\d{2}$/.test(formData.duration_time)) {
      newErrors.duration_time = "Format must be HH:MM:SS (e.g., 01:30:00 or 2:15:00)";
    }
    if (formData.duration_hours && isNaN(Number(formData.duration_hours))) {
      newErrors.duration_hours = "Must be numeric";
    }
    if (formData.duration_minutes && isNaN(Number(formData.duration_minutes))) {
      newErrors.duration_minutes = "Must be numeric";
    }

    const checkLogicalSla = (takenStr: string | undefined, maxStr: string | undefined, status: string | undefined, fieldName: string) => {
      if (takenStr && maxStr && status) {
        const taken = parseFloat(takenStr);
        const max = parseFloat(maxStr);
        if (!isNaN(taken) && !isNaN(max)) {
          if (taken <= max && status === "No") {
            newErrors[fieldName] = `Logical Error: Time taken (${taken}) is <= max (${max}), status cannot be 'No'`;
          }
          if (taken > max && status === "Yes") {
            newErrors[fieldName] = `Logical Error: Time taken (${taken}) exceeds max (${max}), status cannot be 'Yes'`;
          }
        }
      }
    };

    checkLogicalSla(formData.noc_mtta, formData.noc_sla, formData.noc_sla_status, "noc_sla_status");
    checkLogicalSla(formData.site_mttr, formData.site_sla, formData.site_sla_status, "site_sla_status");

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      const firstError = document.querySelector('.border-red-500');
      if (firstError) {
        firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSaving(true);
      
      const cleanedData: any = {};
      Object.keys(formData).forEach((key) => {
        const val = (formData as any)[key];
        cleanedData[key] = val === "" ? null : val;
      });

      const staffArr = [staff1, staff2, staff3].filter(s => s.trim() !== "");
      cleanedData.noc_staff = staffArr.length > 0 ? staffArr.join(", ") : null;

      if (id) {
        const { error } = await api.put(`/slatracking/${id}`, cleanedData);
        if (error) throw error;
      } else {
        const { error } = await api.post("/slatracking", cleanedData);
        if (error) throw error;
      }
      
      navigate("/sla-tracking");
    } catch (error: any) {
      console.error("Error saving SLA:", error.message);
      toast.error("Failed to save SLA record: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectClass = (errorKey: string) => `flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors[errorKey] ? "border-red-500 focus-visible:ring-red-500" : "border-input"}`;
  
  const ErrorMsg = ({ name }: { name: string }) => {
    if (!errors[name]) return null;
    return <p className="text-xs text-red-500 font-medium mt-1">{errors[name]}</p>;
  };

  return (
    <div className="p-6 h-full flex flex-col bg-background text-foreground transition-colors overflow-hidden">
      <div className="flex items-center gap-4 mb-6 shrink-0">
        <button
          onClick={() => navigate("/sla-tracking")}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <h1 className="text-2xl font-bold text-foreground">
          {id ? "Edit SLA Record" : "New SLA Record"}
        </h1>
      </div>

      <div className="flex-1 overflow-auto bg-card rounded-lg border border-border shadow-sm p-6 relative">
        <form onSubmit={handleSubmit} className="space-y-8 max-w-6xl mx-auto" noValidate>
          
          {/* Section 1: General Info */}
          <div>
            <h2 className="text-lg font-semibold text-blue-500 border-b border-border pb-2 mb-4">General Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Month <span className="text-red-500">*</span></label>
                <select name="month" value={formData.month || ''} onChange={handleChange} className={selectClass("month")}>
                  <option value="">- Select -</option>
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <ErrorMsg name="month" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Day <span className="text-red-500">*</span></label>
                <select name="day" value={formData.day || ''} onChange={handleChange} className={selectClass("day")}>
                  <option value="">- Select -</option>
                  {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <ErrorMsg name="day" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Shift <span className="text-red-500">*</span></label>
                <select name="shift" value={formData.shift || ''} onChange={handleChange} className={selectClass("shift")}>
                  <option value="">- Select -</option>
                  {[1, 2, 3].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ErrorMsg name="shift" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Region <span className="text-red-500">*</span></label>
                <select name="region" value={formData.region || ''} onChange={handleChange} className={selectClass("region")}>
                  <option value="">- Select -</option>
                  {["1", "2", "3", "4", "RC"].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <ErrorMsg name="region" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">City <span className="text-red-500">*</span></label>
                <select name="city" value={formData.city || ''} onChange={handleChange} className={selectClass("city")}>
                  <option value="">- Select -</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ErrorMsg name="city" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Service Type</label>
                <select name="service_type" value={formData.service_type || ''} onChange={handleChange} className={selectClass("service_type")}>
                  <option value="">- Select -</option>
                  {["LTE", "RXD_Clients", "Z_LOCATION", "Node.Input.AC.power", "TV_Clients"].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Responsible Dept</label>
                  <select name="responsible_department" value={formData.responsible_department || ''} onChange={handleChange} className={selectClass("")}>
                    <option value="">- Select -</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    {formData.responsible_department && !departments.includes(formData.responsible_department) && (
                      <option value={formData.responsible_department}>{formData.responsible_department}</option>
                    )}
                  </select>
                </div>
            </div>
            
            <div className="mt-4 p-4 border border-border rounded-lg bg-muted/20">
              <label className="block text-sm font-medium text-muted-foreground mb-3">NOC Staff (Up to 3)</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select value={staff1} onChange={(e) => setStaff1(e.target.value)} className={selectClass("")}>
                  <option value="">- Employee 1 -</option>
                  {nocStaffList.map(s => <option key={s} value={s}>{s}</option>)}
                  {staff1 && !nocStaffList.includes(staff1) && <option value={staff1}>{staff1}</option>}
                </select>
                <select value={staff2} onChange={(e) => setStaff2(e.target.value)} className={selectClass("")}>
                  <option value="">- Employee 2 -</option>
                  {nocStaffList.map(s => <option key={s} value={s}>{s}</option>)}
                  {staff2 && !nocStaffList.includes(staff2) && <option value={staff2}>{staff2}</option>}
                </select>
                <select value={staff3} onChange={(e) => setStaff3(e.target.value)} className={selectClass("")}>
                  <option value="">- Employee 3 -</option>
                  {nocStaffList.map(s => <option key={s} value={s}>{s}</option>)}
                  {staff3 && !nocStaffList.includes(staff3) && <option value={staff3}>{staff3}</option>}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Site & Issue Details */}
          <div>
            <h2 className="text-lg font-semibold text-blue-500 border-b border-border pb-2 mb-4">Site & Issue Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Site Code <span className="text-red-500">*</span></label>
                <Input type="text" name="site_code_dc" value={formData.site_code_dc || ''} onChange={handleChange} className={errors.site_code_dc ? "border-red-500" : ""} />
                <ErrorMsg name="site_code_dc" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Band Type</label>
                <select name="band_type" value={formData.band_type || ''} onChange={handleChange} className={selectClass("band_type")}>
                  <option value="">- Select -</option>
                  {["Single", "Dual", "Node"].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Band</label>
                <select name="band" value={formData.band || ''} onChange={handleChange} className={selectClass("band")}>
                  <option value="">- Select -</option>
                  {["Both", "B20", "B7", "Node"].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Technical Area</label>
                  <select name="issue_technical_area" value={formData.issue_technical_area || ''} onChange={handleChange} className={selectClass("")}>
                    <option value="">- Select -</option>
                    {technicalAreas.map(t => <option key={t} value={t}>{t}</option>)}
                    {formData.issue_technical_area && !technicalAreas.includes(formData.issue_technical_area) && (
                      <option value={formData.issue_technical_area}>{formData.issue_technical_area}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Reason</label>
                  <select name="reason" value={formData.reason || ''} onChange={handleChange} className={selectClass("")}>
                    <option value="">- Select -</option>
                    {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                    {formData.reason && !reasons.includes(formData.reason) && (
                      <option value={formData.reason}>{formData.reason}</option>
                    )}
                  </select>
                </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
                <select name="status" value={formData.status || ''} onChange={handleChange} className={selectClass("")}>
                  <option value="Open">Open</option>
                  <option value="Follow">Follow</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Done">Done</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-muted-foreground mb-1">Comment</label>
                <textarea name="comment" value={formData.comment || ''} onChange={handleChange} rows={2} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"></textarea>
              </div>
            </div>
          </div>

          {/* Section 3: Timing Details */}
          <div>
            <h2 className="text-lg font-semibold text-blue-500 border-b border-border pb-2 mb-4">Timing Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Start Date</label>
                <Input type="date" onClick={(e) => (e.target as HTMLInputElement).showPicker()} onKeyDown={(e) => e.preventDefault()} name="start_date" value={formData.start_date || ''} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Start Time</label>
                <Input type="time" name="start_time" step="1" value={formData.start_time || ''} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">End Date</label>
                <Input type="date" onClick={(e) => (e.target as HTMLInputElement).showPicker()} onKeyDown={(e) => e.preventDefault()} name="end_date" value={formData.end_date || ''} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">End Time</label>
                <Input type="time" name="end_time" step="1" value={formData.end_time || ''} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Duration Time (HH:MM:SS)</label>
                <Input type="text" name="duration_time" value={formData.duration_time || ''} onChange={handleChange} placeholder="e.g. 01:30:00" className={errors.duration_time ? "border-red-500" : ""} />
                <ErrorMsg name="duration_time" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Duration (Hours)</label>
                <Input type="text" name="duration_hours" value={formData.duration_hours || ''} onChange={handleChange} className={errors.duration_hours ? "border-red-500" : ""} />
                <ErrorMsg name="duration_hours" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Duration (Mins)</label>
                <Input type="text" name="duration_minutes" value={formData.duration_minutes || ''} onChange={handleChange} className={errors.duration_minutes ? "border-red-500" : ""} />
                <ErrorMsg name="duration_minutes" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Peak / Off-Peak</label>
                <Input type="text" name="peak_none_peak" value={formData.peak_none_peak || ''} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* Section 4: SLA Tracking */}
          <div>
            <h2 className="text-lg font-semibold text-blue-500 border-b border-border pb-2 mb-4">SLA Tracking Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
                <h3 className="font-semibold text-muted-foreground uppercase text-xs">NOC SLA</h3>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">NOC MTTA (Time Taken)</label>
                  <Input type="text" name="noc_mtta" value={formData.noc_mtta || ''} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">NOC SLA (Max Allowed)</label>
                  <Input type="text" name="noc_sla" value={formData.noc_sla || ''} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">NOC Status</label>
                  <select name="noc_sla_status" value={formData.noc_sla_status || ''} onChange={handleChange} className={selectClass("noc_sla_status")}>
                    <option value="">-</option>
                    <option value="Yes">Yes (Met)</option>
                    <option value="No">No (Missed)</option>
                    <option value="NA">NA</option>
                  </select>
                  <ErrorMsg name="noc_sla_status" />
                </div>
              </div>

              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
                <h3 className="font-semibold text-muted-foreground uppercase text-xs">Site (Operation) SLA</h3>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Site MTTR (Time Taken)</label>
                  <Input type="text" name="site_mttr" value={formData.site_mttr || ''} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Site SLA (Max Allowed)</label>
                  <Input type="text" name="site_sla" value={formData.site_sla || ''} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Site Status</label>
                  <select name="site_sla_status" value={formData.site_sla_status || ''} onChange={handleChange} className={selectClass("site_sla_status")}>
                    <option value="">-</option>
                    <option value="Yes">Yes (Met)</option>
                    <option value="No">No (Missed)</option>
                    <option value="NA">NA</option>
                  </select>
                  <ErrorMsg name="site_sla_status" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-border sticky bottom-0 bg-card py-4">
            <button
              type="button"
              onClick={() => navigate("/sla-tracking")}
              className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-muted transition-colors text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save SLA Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


