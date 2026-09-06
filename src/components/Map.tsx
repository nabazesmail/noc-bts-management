import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

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
}

export default function Map({ sites, loading, renderPopup, getMarkerColor, forceCenter, forceZoom }: MapProps) {
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
          key={site.id}
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
                    <a 
                      href="/tickets"
                      className="mt-3 inline-block text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
                    >
                      View Tickets &rarr;
                    </a>
                  </>
                ) : (
                  <>
                    <h3 className="font-bold text-sm mb-1">
                      {site.site_name || "Unknown Site"}
                    </h3>
                    <p className="text-xs text-gray-600">Code: {site.site_code}</p>
                    <p className="text-xs text-gray-600">Region: {site.region}</p>
                    <p className="text-xs font-semibold mt-2">
                      Status:{" "}
                      {site.b20_on_air_date || site.b7_on_air_date
                        ? "On-Air"
                        : "Off-Air"}
                    </p>
                    <a 
                      href={`/sites/${site.id}`}
                      className="mt-3 inline-block text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
                    >
                      View Details &rarr;
                    </a>
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
