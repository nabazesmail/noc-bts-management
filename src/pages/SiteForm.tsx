import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "../components/ToastContext";
import { formatDateForInput } from "@/lib/utils";

type FieldConfig = {
  name: string;
  label: string;
  type?: string;
  pattern?: string;
  title?: string;
  min?: string;
  max?: string;
  required?: boolean;
  options?: string[]; // predefined options
  isAsyncSelect?: "cities" | "power_sources";
};

export default function SiteForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [powerSources, setPowerSources] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<any>({
    site_no: "", region: "", city: "", site_code: "", site_name: "", site_zone: "", 
    power_source: "", comments: "", enodb_20: "", band_20_ip: "", band20_sec1_cell: "", 
    band20_sec2_cell: "", band20_sec3_cell: "", band20_sec4_cell: "", b20_xa2: "", 
    b20_xb2: "", b20_xc2: "", b20_xd2: "", switch: "", port: "", sfp_b20: "", 
    sfp_core_type: "", b20_on_air_date: "", enodb_7: "", band_7_ip: "", b7_xa1: "", 
    b7_xb1: "", b7_xc1: "", b7_xd1: "", b7_xa2: "", b7_xb2: "", b7_xc2: "", b7_xd2: "", 
    switch_b7: "", port_b7: "", sfp_b7: "", sfp_core_type2: "", b7_on_air_date: "", 
    combined_both_bands: "", active_hours: "",
  });

  useEffect(() => {
    fetchLookups();
    if (id) fetchSite();
  }, [id]);

  const formatLookup = (name: string) => {
    if (!name) return "";
    return name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  };

  const fetchLookups = async () => {
    try {
      const { data: cityData } = await api.get("/cities");
      if (cityData) setCities(cityData.map((c: any) => formatLookup(c.name)));

      const { data: powerData } = await api.get("/power_sources");
      if (powerData) setPowerSources(powerData.map((p: any) => formatLookup(p.name)));
    } catch (e) {
      console.error("Error fetching lookups. Please ensure cities and power_sources tables exist.");
    }
  };

  const fetchSite = async () => {
    const { data } = await api.get(`/sites/${id}`);
    if (data) {
      setFormData({
        ...data,
        city: formatLookup(data.city),
        power_source: formatLookup(data.power_source),
        b20_on_air_date: formatDateForInput(data.b20_on_air_date),
        b7_on_air_date: formatDateForInput(data.b7_on_air_date)
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // clear error on change
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
    if (e.target.name === 'enodb_20' || e.target.name === 'enodb_7') {
      if (errors["band"]) setErrors({ ...errors, band: "" });
    }
    if (e.target.name === 'b20_on_air_date' || e.target.name === 'b7_on_air_date') {
      if (errors["band_date"]) setErrors({ ...errors, band_date: "" });
    }
  };

  const generalFields: FieldConfig[] = [
    { name: "site_no", label: "Site No", type: "text", pattern: "^[0-9]+$", title: "Must be numbers only", required: true },
    { name: "region", label: "Region", type: "text", pattern: "^[1-4]$", title: "Must be 1, 2, 3, or 4", required: true },
    { name: "city", label: "City", isAsyncSelect: "cities", required: true },
    { name: "site_code", label: "Site Code", pattern: "^[A-Z]+(?:-[A-Z]+)?#\\d+$", title: "Format must be like QAM#45 or QAM-HAS#45 (uppercase letters, optional dash, #, numbers)", required: true },
    { name: "site_name", label: "Site Name" },
    { name: "site_zone", label: "Site Zone" },
    { name: "power_source", label: "Power Source", isAsyncSelect: "power_sources" },
    { name: "comments", label: "Comments" },
  ];
  
  const band20Fields: FieldConfig[] = [
    { name: "enodb_20", label: "ENODEB 20" },
    { name: "band_20_ip", label: "Band 20 IP", pattern: "^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$", title: "Must be a valid IPv4 address (e.g. 192.168.1.1)" },
    { name: "band20_sec1_cell", label: "Sec 1 Cell" },
    { name: "band20_sec2_cell", label: "Sec 2 Cell" },
    { name: "band20_sec3_cell", label: "Sec 3 Cell" },
    { name: "band20_sec4_cell", label: "Sec 4 Cell" },
    { name: "b20_xa2", label: "XA2" },
    { name: "b20_xb2", label: "XB2" },
    { name: "b20_xc2", label: "XC2" },
    { name: "b20_xd2", label: "XD2" },
    { name: "switch", label: "Switch" },
    { name: "port", label: "Port" },
    { name: "sfp_b20", label: "SFP" },
    { name: "sfp_core_type", label: "SFP Core Type" },
    { name: "b20_on_air_date", label: "On Air Date", type: "date" },
  ];

  const band7Fields: FieldConfig[] = [
    { name: "enodb_7", label: "ENODEB 7" },
    { name: "band_7_ip", label: "Band 7 IP", pattern: "^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$", title: "Must be a valid IPv4 address (e.g. 192.168.1.1)" },
    { name: "b7_xa1", label: "XA1" },
    { name: "b7_xb1", label: "XB1" },
    { name: "b7_xc1", label: "XC1" },
    { name: "b7_xd1", label: "XD1" },
    { name: "b7_xa2", label: "XA2" },
    { name: "b7_xb2", label: "XB2" },
    { name: "b7_xc2", label: "XC2" },
    { name: "b7_xd2", label: "XD2" },
    { name: "switch_b7", label: "Switch" },
    { name: "port_b7", label: "Port" },
    { name: "sfp_b7", label: "SFP" },
    { name: "sfp_core_type2", label: "SFP Core Type 2" },
    { name: "b7_on_air_date", label: "On Air Date", type: "date" },
  ];

  const otherFields: FieldConfig[] = [
    { name: "combined_both_bands", label: "Combined Both Bands", options: ["0", "1"] },
    { name: "active_hours", label: "Active Hours", type: "text", pattern: "^[0-9]+$", title: "Must be numbers only" },
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const allFields = [...generalFields, ...band20Fields, ...band7Fields, ...otherFields];

    // Check required & patterns
    allFields.forEach((field) => {
      const val = formData[field.name] || "";
      if (field.required && !val) {
        newErrors[field.name] = "This field is required";
      } else if (val && field.pattern) {
        const regex = new RegExp(field.pattern);
        if (!regex.test(val)) {
          newErrors[field.name] = field.title || "Invalid format";
        }
      }
    });

    // Check bands
    if (!formData.enodb_20 && !formData.enodb_7) {
      newErrors["band"] = "You must provide data for at least one band (ENODEB 20 or ENODEB 7)";
    }

    if (!formData.b20_on_air_date && !formData.b7_on_air_date) {
      newErrors["band_date"] = "You must provide an On-Air Date for at least one band";
    }

    setErrors(newErrors);

    const hasErrors = Object.keys(newErrors).length > 0;
    
    if (hasErrors) {
      // Scroll to the first error field
      const firstErrorField = allFields.find(f => newErrors[f.name]);
      if (firstErrorField) {
        setTimeout(() => {
          const el = document.getElementsByName(firstErrorField.name)[0];
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.focus();
          }
        }, 100);
      } else if (newErrors.band || newErrors.band_date) {
        // If it's just a band/date error, scroll to the bottom
        setTimeout(() => {
          window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        }, 100);
      }
    }

    return !hasErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const cleanedData: any = {};
    Object.keys(formData).forEach((key) => {
      cleanedData[key] = formData[key] === "" ? null : formData[key];
    });

    try {
      if (id) {
        await api.put(`/sites/${id}`, cleanedData);
      } else {
        await api.post("/sites", cleanedData);
      }
      navigate("/sites");
    } catch (err: any) {
      toast.error("Error saving site: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderField = (config: FieldConfig) => {
    const hasError = !!errors[config.name];
    const errorClass = hasError ? "border-red-500 focus-visible:ring-red-500" : "";

    if (config.options || config.isAsyncSelect) {
      let opts = config.options || [];
      if (config.isAsyncSelect === "cities") opts = cities;
      if (config.isAsyncSelect === "power_sources") opts = powerSources;

      return (
        <div className="space-y-1">
          <select
            id={config.name}
            value={formData[config.name] || ""}
            onChange={(e) => setFormData({ ...formData, [config.name]: e.target.value })}
            className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errorClass}`}
          >
            <option value="">- Select -</option>
            {opts.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
            {formData[config.name] && !opts.includes(formData[config.name]) && (
              <option value={formData[config.name]}>{formData[config.name]}</option>
            )}
          </select>
          {hasError && <p className="text-xs text-red-500 font-medium">{errors[config.name]}</p>}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <Input
          name={config.name}
          type={config.type || "text"}
          value={formData[config.name] || ""}
          onChange={handleChange}
          className={errorClass}
          onClick={config.type === "date" ? (e) => (e.target as HTMLInputElement).showPicker() : undefined}
          onKeyDown={config.type === "date" ? (e) => e.preventDefault() : undefined}
        />
        {hasError && <p className="text-xs text-red-500 font-medium">{errors[config.name]}</p>}
      </div>
    );
  };

  const renderFieldsSection = (fields: FieldConfig[]) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <label className="text-sm font-medium capitalize flex gap-1 items-center">
            {field.label}
            {field.required && <span className="text-red-500">*</span>}
          </label>
          {renderField(field)}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">
          {id ? "Edit Site" : "New Site"}
        </h2>
        <Button variant="outline" type="button" onClick={() => navigate("/sites")}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
          </CardHeader>
          <CardContent>{renderFieldsSection(generalFields)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Band 20 Configuration</CardTitle>
          </CardHeader>
          <CardContent>{renderFieldsSection(band20Fields)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Band 7 Configuration</CardTitle>
          </CardHeader>
          <CardContent>{renderFieldsSection(band7Fields)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Other Details</CardTitle>
          </CardHeader>
          <CardContent>{renderFieldsSection(otherFields)}</CardContent>
        </Card>

        {errors.band && (
          <div className="p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg dark:bg-red-900/30 dark:border-red-900/50 dark:text-red-400 text-sm font-medium text-center shadow-sm">
            {errors.band}
          </div>
        )}

        {errors.band_date && (
          <div className="p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg dark:bg-red-900/30 dark:border-red-900/50 dark:text-red-400 text-sm font-medium text-center shadow-sm">
            {errors.band_date}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={loading} size="lg" className="w-full md:w-auto">
            {loading ? "Saving..." : "Save Site"}
          </Button>
        </div>
      </form>
    </div>
  );
}



