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
function MapBounds({ sites }: { sites: any[] }) {
  const map = useMap();

  useEffect(() => {
    if (sites.length > 0) {
      // Create a bounding box array of all currently filtered sites
      const bounds = L.latLngBounds(
        sites.map((site) => [Number(site.latitude), Number(site.longitude)]),
      );

      // Force the map to fit exactly to those bounds
      // maxZoom prevents the map from zooming too close when only 1 site is searched
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [sites, map]);

  return null;
}

interface MapProps {
  sites: any[];
  loading?: boolean;
  renderPopup?: (site: any) => React.ReactNode;
  getMarkerColor?: (site: any) => string;
}

export default function Map({ sites, loading, renderPopup, getMarkerColor }: MapProps) {
  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400 font-medium">Loading Map Data...</p>
      </div>
    );
  }

  const defaultGetColor = (site: any) => {
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

    const svgIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">
        <path fill="${color}" d="M12 0c-4.418 0-8 3.582-8 8 0 5.385 8 16 8 16s8-10.615 8-16c0-4.418-3.582-8-8-8zm0 11.5c-1.933 0-3.5-1.567-3.5-3.5s1.567-3.5 3.5-3.5 3.5 1.567 3.5 3.5-1.567 3.5-3.5 3.5z"/>
        <circle cx="12" cy="8.5" r="3.5" fill="white" />
      </svg>
    `;

    return L.divIcon({
      html: svgIcon,
      className: "",
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28],
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
      <MapBounds sites={sites} />

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
              </div>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
