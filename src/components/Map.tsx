import { useEffect } from "react";
import { MapPin, Trash2 } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Link } from "react-router-dom";

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Component that handles the automatic zooming/bounding box logic
function MapBounds({ sites, forceCenter, forceZoom }: { sites: any[], forceCenter?: [number, number], forceZoom?: number }) {
  const map = useMap();

  useEffect(() => {
    if (forceCenter && forceZoom) {
      map.setView(forceCenter, forceZoom);
    } else if (sites.length > 0) {
      // Create a bounding box array of all currently filtered sites
      const bounds = L.latLngBounds(
        sites.map((site) => [Number(site.latitude), Number(site.longitude)]),
      );

      // Force the map to fit exactly to those bounds
      // maxZoom prevents the map from zooming too close when only 1 site is searched
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [sites, map, forceCenter, forceZoom]);

  return null;
}

interface MapProps {
  sites: any[];
  loading?: boolean;
  renderPopup?: (site: any) => React.ReactNode;
  getMarkerColor?: (site: any) => string;
  forceCenter?: [number, number];
  forceZoom?: number;
  onDeleteLocation?: (locationId: number) => void;
}

export default function Map({ sites, loading, renderPopup, getMarkerColor, forceCenter, forceZoom, onDeleteLocation }: MapProps) {
  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400 font-medium">Loading Map Data...</p>
      </div>
    );
  }

  const defaultGetColor = (site: any) => {
    const isTicket = site.is_ticket === true;
    if (isTicket) {
      return site.status === 'closed' ? "#10b981" : "#ef4444";
    }

    const r = String(site.region || site.region_cut_type || '').trim().toLowerCase();
    let color = "#64748b"; // default slate-500
    if (r === "1" || r === "region 1") color = "#3b82f6"; // blue-500
    else if (r === "2" || r === "region 2") color = "#22c55e"; // green-500
    else if (r === "3" || r === "region 3") color = "#0ea5e9"; // sky-500
    else if (r === "4" || r === "region 4") color = "#a855f7"; // purple-500
    else if (r === "5" || r === "region 5") color = "#f97316"; // orange-500
    else if (r === "6" || r === "region 6") color = "#14b8a6"; // teal-500
    else if (r === "7" || r === "region 7") color = "#f43f5e"; // rose-500
    else if (r.includes("between region 1 & 2") || r.includes("1 & 2") || r.includes("1&2")) color = "#14b8a6"; // teal-500
    else if (r.includes("between region 2 & 3") || r.includes("2 & 3") || r.includes("2&3")) color = "#fbbf24"; // amber-400
    else if (r.includes("between region 3 & 4") || r.includes("3 & 4") || r.includes("3&4")) color = "#ec4899"; // pink-500
    return color;
  };

  const getMarkerIcon = (site: any) => {
    const color = getMarkerColor ? getMarkerColor(site) : defaultGetColor(site);
    const isFiberCut = site.hasOwnProperty('cut_type') || site.hasOwnProperty('reason') || site.hasOwnProperty('region_cut_type');
    const isTicket = site.is_ticket === true;

    let innerIcon = '';
    if (isTicket) {
      if (site.status === 'closed') {
        innerIcon = `
          <g transform="translate(6, 6)" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </g>
        `;
      } else {
        innerIcon = `
          <g transform="translate(8, 8)" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <path d="M12 9v4"/>
            <path d="M12 17h.01"/>
          </g>
        `;
      }
    } else if (isFiberCut) {
      // Scissors icon for Fiber Cuts
      innerIcon = `
        <g transform="translate(8, 8)" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="6" cy="6" r="3"/>
          <circle cx="6" cy="18" r="3"/>
          <line x1="20" y1="4" x2="8.12" y2="15.88"/>
          <line x1="14.47" y1="14.48" x2="20" y2="20"/>
          <line x1="8.12" y1="8.12" x2="12" y2="12"/>
        </g>
      `;
    } else {
      // Radio Tower icon for Sites
      innerIcon = `
        <g transform="translate(8, 8)" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
          <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
          <circle cx="12" cy="12" r="2"/>
          <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
          <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>
        </g>
      `;
    }

    const svgIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="26" height="26" class="drop-shadow-sm">
        <circle cx="20" cy="20" r="18" fill="${color}" stroke="#ffffff" stroke-width="2.5" />
        ${innerIcon}
      </svg>
    `;

    return L.divIcon({
      html: svgIcon,
      className: "bg-transparent border-none",
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      popupAnchor: [0, -13],
    });
  };

  const getBandStatus = (site: any, band: 'B20' | 'B7') => {
    const enb = (band === 'B20' ? site.enodb_20 : site.enodb_7)?.toLowerCase() || '';
    const ip = (band === 'B20' ? site.band_20_ip : site.band_7_ip)?.toLowerCase() || '';
    const date = (band === 'B20' ? site.b20_on_air_date : site.b7_on_air_date)?.toLowerCase() || '';
    const comm = site.comments?.toLowerCase() || '';

    const exists = !!(enb && enb !== '-') || !!(ip && ip !== '-') || !!(date && date !== '-');
    if (!exists) return null;

    if (comm.includes('dismantled')) return "Off-Air (Dismantled)";
    if (comm.includes('out of service') || enb.includes('out of service')) return "Off-Air (Out of Service)";
    if (enb.includes('not on air') || enb.includes('off air') || comm.includes('turned off') || comm.includes('off air') || comm.includes('stolen')) return "Off-Air";

    return "On-Air";
  };

  // Helper to calculate distance in km between two lat/lng coordinates (Haversine formula)
  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const actualSites = sites.filter((s) => !s.is_ticket);

  const getNearestSite = (ticket: any) => {
    if (!ticket.latitude || !ticket.longitude || actualSites.length === 0) return null;
    const ticketLat = Number(ticket.latitude);
    const ticketLng = Number(ticket.longitude);
    
    let nearestSite = null;
    let minDistance = Infinity;

    for (const site of actualSites) {
      if (!site.latitude || !site.longitude) continue;
      const siteLat = Number(site.latitude);
      const siteLng = Number(site.longitude);
      
      const distance = getDistanceFromLatLonInKm(ticketLat, ticketLng, siteLat, siteLng);
      if (distance < minDistance) {
        minDistance = distance;
        nearestSite = site;
      }
    }
    
    return { site: nearestSite, distance: minDistance };
  };

  return (
    <MapContainer
      center={[36.5, 41]}
      zoom={7}
      className="h-full w-full z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Applies the dynamic framing logic based on filtered sites */}
      <MapBounds sites={sites} forceCenter={forceCenter} forceZoom={forceZoom} />

      {sites.map((site) => (
        <Marker
          key={site.is_ticket ? `ticket-${site.id}` : `site-${site.id}`}
          position={[Number(site.latitude), Number(site.longitude)]}
          icon={getMarkerIcon(site)}
        >
          <Popup>
            {renderPopup ? (
              renderPopup(site)
            ) : (
              <div className="p-1">
                {site.is_ticket ? (
                  <>
                    <h3 className="font-bold text-sm mb-1">
                      Customer Complaint ({site.city || 'Unknown'})
                    </h3>
                    <p className="text-xs text-gray-600">Region: {site.region}</p>
                    <p className="text-xs font-semibold mt-2 text-red-600">
                      Status: {site.status?.toUpperCase()}
                    </p>
                    {site.description && (
                      <p className="text-xs text-gray-700 mt-2 italic border-l-2 border-gray-300 pl-2">
                        "{site.description}"
                      </p>
                    )}
                    
                    {(() => {
                      const nearest = getNearestSite(site);
                      if (!nearest || !nearest.site) return null;
                      const distKm = nearest.distance;
                      const distText = distKm < 1 ? `${Math.round(distKm * 1000)} meters` : `${distKm.toFixed(1)} km`;
                      return (
                        <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-md">
                          <p className="text-[11px] font-semibold text-orange-800 dark:text-orange-400 flex items-center gap-1 mb-1">
                            <MapPin className="w-3 h-3" /> Closest Cell Site
                          </p>
                          <p className="text-xs text-orange-900 dark:text-orange-300 ml-4">
                            <span className="font-bold">{nearest.site.site_code}</span> ({distText} away)
                          </p>
                        </div>
                      );
                    })()}

                    <Link 
                      to="/tickets"
                      className="mt-3 inline-block text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
                    >
                      View Tickets &rarr;
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm mb-1">
                        {site.site_name || "Unknown Site"}
                      </h3>
                      {site.location_id && onDeleteLocation && (
                        <button 
                          onClick={() => onDeleteLocation(site.location_id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                          title="Delete Location"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">Code: {site.site_code}</p>
                    <p className="text-xs text-gray-600">Region: {site.region}</p>
                    <div className="mt-2 flex flex-col gap-1">
                      {getBandStatus(site, 'B20') && (
                        <p className="text-xs font-semibold">
                          B20: <span className={getBandStatus(site, 'B20') === "On-Air" ? "text-green-600" : "text-red-600"}>{getBandStatus(site, 'B20')}</span>
                        </p>
                      )}
                      {getBandStatus(site, 'B7') && (
                        <p className="text-xs font-semibold">
                          B7: <span className={getBandStatus(site, 'B7') === "On-Air" ? "text-green-600" : "text-red-600"}>{getBandStatus(site, 'B7')}</span>
                        </p>
                      )}
                      {!getBandStatus(site, 'B20') && !getBandStatus(site, 'B7') && (
                        <p className="text-xs font-semibold text-gray-500">Status Unknown</p>
                      )}
                    </div>
                    <Link 
                      to={`/sites/${site.id}`}
                      className="mt-3 inline-block text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
                    >
                      View Details &rarr;
                    </Link>
                  </>
                )}
              </div>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
