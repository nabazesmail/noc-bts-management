import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseSiteDate(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const s = dateStr.trim();
  if (!s || s === '-') return null;

  // Check YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)).getTime();
  }

  // Try native date parsing which handles MM/DD/YYYY beautifully
  const nativeDate = new Date(s);
  if (!isNaN(nativeDate.getTime())) {
    // Basic sanity check to ensure the year isn't absurd (like from a typo)
    const year = nativeDate.getFullYear();
    if (year > 1990 && year <= new Date().getFullYear() + 2) {
      return nativeDate.getTime();
    }
  }

  // Fallback for manual slashes
  const parts = s.split(/[\/\-]/);
  if (parts.length === 3) {
    let d = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10) - 1;
    let y = parseInt(parts[2], 10);
    
    if (parts[0].length === 4) {
      y = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10) - 1;
      d = parseInt(parts[2], 10);
    }
    
    // If m is out of bounds, maybe it's MM/DD/YYYY (e.g. 4/15/2019)
    if (m > 11 || m < 0) {
      const temp = m + 1; // get original month
      m = d - 1;          // treat day as month
      d = temp;           // treat original month as day
    }
    
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      if (y < 100) y += 2000;
      return new Date(y, m, d).getTime();
    }
  }
  
  if (/^\d{4}$/.test(s)) return new Date(parseInt(s, 10), 0, 1).getTime();
  
  return null;
}

export function formatDateForInput(dateStr: string | null): string {
  const timestamp = parseSiteDate(dateStr);
  if (!timestamp) return "";
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const timestamp = parseSiteDate(dateStr);
  if (!timestamp) return dateStr; 
  return format(new Date(timestamp), "d MMM, yyyy");
}