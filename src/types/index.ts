export type UserRole = "admin" | "user";

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions?: string[];
}

export interface Site {
  longitude(longitude: any): number;
  latitude(latitude: any): number;
  id: string;
  site_no: string;
  region: string;
  city: string;
  site_code: string;
  enodb_20: string;
  band_20_ip: string;
  active_hours: string;
  b20_on_air_date: string | null;
  b7_on_air_date: string | null;
  site_name: string;
  site_zone: string;
  power_source: string;
  comments: string;
  band20_sec_1_cell: string;
  band20_sec_2_cell: string;
  band20_sec_3_cell: string;
  band20_sec_4_cell: string;
  b20_xa2: string;
  b20_xb2: string;
  b20_xc2: string;
  b20_xd2: string;
  switch: string;
  port: string;
  sfp_b20: string;
  sfp_core_type: string;
  enodb_7: string;
  band_7_ip: string;
  b7_xa1: string;
  b7_xb1: string;
  b7_xc1: string;
  b7_xd1: string;
  b7_xa2: string;
  b7_xb2: string;
  b7_xc2: string;
  b7_xd2: string;
  switch_b7: string;
  port_b7: string;
  sfp_b7: string;
  sfp_core_type2: string;
  combined_both_bands: string;
}

export interface SiteLocation {
  id: string;
  site_code: string;
  latitude: number;
  longitude: number;
}

export interface SiteHistory {
  site_code: any;
  site_name: any;
  id: string;
  site_id: string;
  user_email: string;
  action: "create" | "update" | "delete";
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface SlaTracking {
  id?: string;
  month?: string;
  day?: string;
  shift?: string;
  noc_staff?: string;
  region?: string;
  city?: string;
  service_type?: string;
  site_code_dc?: string;
  noc_mtta?: string;
  noc_sla?: string;
  noc_sla_status?: string;
  site_mttr?: string;
  site_sla?: string;
  site_sla_status?: string;
  band_type?: string;
  band?: string;
  start_date?: string;
  start_time?: string;
  end_date?: string;
  end_time?: string;
  duration_time?: string;
  duration_hours?: string;
  duration_minutes?: string;
  responsible_department?: string;
  issue_technical_area?: string;
  reason?: string;
  comment?: string;
  status?: string;
  peak_none_peak?: string;
}



