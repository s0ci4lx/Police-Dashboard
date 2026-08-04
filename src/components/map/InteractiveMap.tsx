import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';

export interface MapMarkerItem {
  id: string;
  lat: number;
  lng: number;
  title: string;
  category: string;
  address?: string;
  notes?: string;
  type?: string;
  status?: string;
  color?: string;
  rawData?: any;
}

interface InteractiveMapProps {
  markers: MapMarkerItem[];
  center: { lat: number; lng: number; zoom?: number };
  zoom?: number;
  title?: string;
  height?: string;
  enableClustering?: boolean;
  onSelectMarker?: (marker: MapMarkerItem) => void;
  selectedMarkerId?: string;
}

// Custom Leaflet Pin Marker Icon generator using SVG SVG HTML
export function createCustomIcon(color: string = '#3b82f6') {
  const svgHtml = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.5));">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3" fill="#ffffff"></circle>
    </svg>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-leaflet-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

// Larger, ringed & pulsing pin for the currently-selected marker
export function createHighlightedIcon(color: string = '#3b82f6') {
  const svgHtml = `
    <div class="cctv-selected-pin">
      <span class="cctv-selected-ring" style="border-color:${color}"></span>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="44" height="44" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 4px 8px rgba(0,0,0,0.6));">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3.2" fill="#ffffff"></circle>
      </svg>
    </div>
  `;
  return L.divIcon({
    html: svgHtml,
    className: 'custom-selected-marker',
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -44],
  });
}

// Controller component to smoothly adjust Map View when center changes without abrupt zoom jitter
function MapController({ center }: { center: { lat: number; lng: number; zoom?: number } }) {
  const map = useMap();

  useEffect(() => {
    if (center && typeof center.lat === 'number' && typeof center.lng === 'number') {
      const currentCenter = map.getCenter();
      const latDiff = Math.abs(currentCenter.lat - center.lat);
      const lngDiff = Math.abs(currentCenter.lng - center.lng);

      // Only animate setView if the center has actually changed noticeably
      if (latDiff > 0.0001 || lngDiff > 0.0001) {
        map.setView([center.lat, center.lng], center.zoom || map.getZoom(), {
          animate: true,
          duration: 0.8,
        });
      }
    }
  }, [center, map]);

  return null;
}

export const CATEGORY_COLORS: Record<string, string> = {
  'อบจ.สงขลา': '#ec4899', // Pink
  'มหาดไทย': '#0ea5e9', // Light Blue
  'เอกชน': '#10b981', // Emerald
  'รฟท./สภ.': '#f59e0b', // Amber
  'หน่วยงานอื่นๆ': '#8b5cf6', // Purple
  'โรงเรียน': '#3b82f6',
  'วัด / มัสยิด': '#a855f7',
  'ปั๊มน้ำมัน': '#eab308',
  'ร้านสะดวกซื้อ': '#f43f5e',
  'โรงพยาบาล': '#06b6d4',
  'ธนาคาร': '#10b981',
  'สถานที่ท่องเที่ยว': '#f97316',
};

/**
 * Center + zoom that frames a set of markers (average position, zoom from spread).
 * Falls back to the given default when there are no valid points.
 */
export function centerOfMarkers(
  points: { lat: number; lng: number }[],
  fallback: { lat: number; lng: number; zoom: number },
): { lat: number; lng: number; zoom: number } {
  const valid = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (valid.length === 0) return fallback;

  const lats = valid.map((p) => p.lat);
  const lngs = valid.map((p) => p.lng);
  const lat = lats.reduce((a, b) => a + b, 0) / valid.length;
  const lng = lngs.reduce((a, b) => a + b, 0) / valid.length;

  const spread = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
  const zoom = spread < 0.008 ? 16 : spread < 0.03 ? 15 : spread < 0.08 ? 14 : spread < 0.2 ? 13 : spread < 0.6 ? 12 : 11;

  return { lat, lng, zoom };
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  markers,
  center,
  zoom = 13,
  title = 'แผนที่ภูมิสารสนเทศ (GIS Map)',
  height = '450px',
  enableClustering = true,
  onSelectMarker,
  selectedMarkerId,
}) => {
  const [mapStyle, setMapStyle] = React.useState<'streets' | 'satellite' | 'dark'>('streets');

  const tileUrls = {
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  };

  const tileAttributions = {
    dark: '&copy; CARTO &copy; OpenStreetMap',
    streets: '&copy; OpenStreetMap contributors',
    satellite: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP',
  };

  return (
    <div className="glass-panel bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Map Header Control Strip */}
      <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 z-10 relative">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            {title}
          </h3>
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
            {markers.length.toLocaleString('th-TH')} หมุด
          </span>
        </div>

        {/* Map Layer Switcher Buttons */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setMapStyle('dark')}
            className={`px-3 py-1 rounded-lg transition-all ${
              mapStyle === 'dark' ? 'bg-blue-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            แผนที่มืด (Dark Police)
          </button>
          <button
            onClick={() => setMapStyle('streets')}
            className={`px-3 py-1 rounded-lg transition-all ${
              mapStyle === 'streets' ? 'bg-blue-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ถนน (Streets)
          </button>
          <button
            onClick={() => setMapStyle('satellite')}
            className={`px-3 py-1 rounded-lg transition-all ${
              mapStyle === 'satellite' ? 'bg-blue-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ดาวเทียม (Satellite)
          </button>
        </div>
      </div>

      {/* Main Leaflet Map Canvas Container */}
      <div style={{ height }} className="w-full relative z-0">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={center.zoom || zoom}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <MapController center={center} />

          <TileLayer
            attribution={tileAttributions[mapStyle]}
            url={tileUrls[mapStyle]}
            maxZoom={19}
          />

          {enableClustering ? (
            <MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={45}
              spiderfyOnMaxZoom={true}
              showCoverageOnHover={false}
            >
              {markers.map((marker) => {
                const isSelected = marker.id === selectedMarkerId;
                const pinColor = marker.color || CATEGORY_COLORS[marker.category] || '#3b82f6';
                return (
                <Marker
                  key={marker.id}
                  position={[marker.lat, marker.lng]}
                  icon={isSelected ? createHighlightedIcon(pinColor) : createCustomIcon(pinColor)}
                  zIndexOffset={isSelected ? 1000 : 0}
                  eventHandlers={{
                    click: () => {
                      if (onSelectMarker) {
                        onSelectMarker(marker);
                      }
                    },
                  }}
                >
                  <Popup className="custom-leaflet-popup">
                    <div className="p-1 space-y-1.5 min-w-[210px] text-slate-900 font-sans">
                      <div className="font-bold text-sm text-slate-900 border-b pb-1 flex items-center justify-between">
                        <span>{marker.title}</span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded text-white font-bold shrink-0 ml-1"
                          style={{ backgroundColor: marker.color || '#3b82f6' }}
                        >
                          {marker.category}
                        </span>
                      </div>

                      {marker.address && (
                        <p className="text-xs text-slate-600 font-normal leading-tight">
                          📍 {marker.address}
                        </p>
                      )}

                      {marker.notes && (
                        <p className="text-[11px] text-slate-500 italic bg-slate-100 p-1.5 rounded">
                          {marker.notes}
                        </p>
                      )}

                      <div className="pt-1 flex items-center justify-between text-[11px] border-t border-slate-200">
                        <span className="font-mono text-slate-500">
                          {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}
                        </span>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${marker.lat},${marker.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-blue-600 hover:underline"
                        >
                          Google Maps ➔
                        </a>
                      </div>
                    </div>
                  </Popup>
                </Marker>
                );
              })}
            </MarkerClusterGroup>
          ) : (
            markers.map((marker) => {
              const isSelected = marker.id === selectedMarkerId;
              const pinColor = marker.color || CATEGORY_COLORS[marker.category] || '#3b82f6';
              return (
              <Marker
                key={marker.id}
                position={[marker.lat, marker.lng]}
                icon={isSelected ? createHighlightedIcon(pinColor) : createCustomIcon(pinColor)}
                zIndexOffset={isSelected ? 1000 : 0}
                eventHandlers={{
                  click: () => {
                    if (onSelectMarker) {
                      onSelectMarker(marker);
                    }
                  },
                }}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-1 space-y-1.5 min-w-[210px] text-slate-900 font-sans">
                    <div className="font-bold text-sm text-slate-900 border-b pb-1 flex items-center justify-between">
                      <span>{marker.title}</span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded text-white font-bold shrink-0 ml-1"
                        style={{ backgroundColor: marker.color || '#3b82f6' }}
                      >
                        {marker.category}
                      </span>
                    </div>

                    {marker.address && (
                      <p className="text-xs text-slate-600 font-normal leading-tight">
                        📍 {marker.address}
                      </p>
                    )}

                    {marker.notes && (
                      <p className="text-[11px] text-slate-500 italic bg-slate-100 p-1.5 rounded">
                        {marker.notes}
                      </p>
                    )}

                    <div className="pt-1 flex items-center justify-between text-[11px] border-t border-slate-200">
                      <span className="font-mono text-slate-500">
                        {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}
                      </span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${marker.lat},${marker.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-blue-600 hover:underline"
                      >
                        Google Maps ➔
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
              );
            })
          )}
        </MapContainer>
      </div>
    </div>
  );
};
