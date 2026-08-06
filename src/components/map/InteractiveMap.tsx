import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
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
  onClearSelection?: () => void;
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
function MapController({
  center,
  selectedMarkerId,
  markersRefs,
}: {
  center: { lat: number; lng: number; zoom?: number };
  selectedMarkerId?: string;
  markersRefs: React.RefObject<Record<string, L.Marker>>;
}) {
  const map = useMap();
  const prevCenterRef = useRef<{ lat: number; lng: number; zoom?: number } | null>(null);

  useEffect(() => {
    const prevCenter = prevCenterRef.current;
    
    // Determine if center changed noticeably compared to the previous center prop
    const centerChanged = !prevCenter ||
      Math.abs(prevCenter.lat - center.lat) > 0.00001 ||
      Math.abs(prevCenter.lng - center.lng) > 0.00001 ||
      (center.zoom !== undefined && prevCenter.zoom !== center.zoom);

    prevCenterRef.current = center;

    if (centerChanged) {
      const targetZoom = center.zoom || map.getZoom();
      map.setView([center.lat, center.lng], targetZoom, {
        animate: true,
        duration: 0.8,
      });
    }
  }, [center, map, selectedMarkerId, markersRefs]);

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

const DYNAMIC_PALETTE = [
  '#f43f5e', '#d946ef', '#8b5cf6', '#6366f1', '#3b82f6',
  '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e',
  '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444'
];

export function getCategoryColor(category: string): string {
  if (!category) return '#3b82f6';
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % DYNAMIC_PALETTE.length;
  return DYNAMIC_PALETTE[index];
}

export const TYPE_COLORS: Record<string, string> = {
  'Fixed Camera': '#0ea5e9', // Light Blue
  'PTZ Camera': '#8b5cf6',   // Purple
  'LPR/AI Camera': '#10b981', // Emerald
  'Speed Cam': '#f59e0b',    // Amber
  '4G': '#ec4899',           // Pink
  '4g': '#ec4899',           // Pink
  '5G': '#f43f5e',           // Rose
  'WiFi': '#3b82f6',         // Blue
  'WIFI': '#3b82f6',         // Blue
  'ยุทธวิธี': '#8b5cf6',        // Purple
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

// Helper component to collect map events and notify when a popup is closed
function MapEventsCollector({
  lastCenterChangeTime,
  lastSelectChangeTime,
  onPopupClose,
}: {
  lastCenterChangeTime: React.RefObject<number>;
  lastSelectChangeTime: React.RefObject<number>;
  onPopupClose: () => void;
}) {
  useMapEvents({
    popupclose: () => {
      const now = Date.now();
      const timeSinceMove = now - (lastCenterChangeTime.current || 0);
      const timeSinceSelect = now - (lastSelectChangeTime.current || 0);
      // Ignore programmatic popupclose events fired by pan/zoom animations OR by
      // the marker re-render churn that happens right after a pin is selected.
      // Without the select-time guard, selecting a marker that does not also move
      // the map center (e.g. the Local POI map) closes its own popup instantly.
      if (timeSinceMove > 1000 && timeSinceSelect > 600) {
        onPopupClose();
      }
    },
  });
  return null;
}

// A custom Marker wrapper
const MapMarker = ({
  marker,
  isSelected,
  pinColor,
  onSelectMarker,
  markerRef,
}: {
  marker: MapMarkerItem;
  isSelected: boolean;
  pinColor: string;
  onSelectMarker?: (marker: MapMarkerItem) => void;
  markerRef: (ref: L.Marker | null) => void;
}) => {
  return (
    <Marker
      ref={markerRef}
      position={[marker.lat, marker.lng]}
      icon={isSelected ? createHighlightedIcon(pinColor) : createCustomIcon(pinColor)}
      zIndexOffset={isSelected ? 1000 : 0}
      eventHandlers={{
        click: () => {
          if (onSelectMarker) {
            setTimeout(() => {
              onSelectMarker(marker);
            }, 50);
          }
        },
      }}
    />
  );
};


export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  markers,
  center,
  zoom = 13,
  title = 'แผนที่ภูมิสารสนเทศ (GIS Map)',
  height = '450px',
  enableClustering = true,
  onSelectMarker,
  onClearSelection,
  selectedMarkerId,
}) => {
  const [mapStyle, setMapStyle] = React.useState<'streets' | 'satellite' | 'dark'>('streets');
  const lastCenterChangeTime = useRef<number>(0);
  const lastSelectChangeTime = useRef<number>(0);
  const markersRefs = useRef<Record<string, L.Marker>>({});

  // Use refs to stabilize callbacks and prevent useMemo from re-running on every render
  // when parent components pass inline functions (which causes popup blinking).
  const onSelectMarkerRef = useRef(onSelectMarker);
  const onClearSelectionRef = useRef(onClearSelection);

  useEffect(() => {
    onSelectMarkerRef.current = onSelectMarker;
    onClearSelectionRef.current = onClearSelection;
  }, [onSelectMarker, onClearSelection]);

  const stableOnSelectMarker = useCallback((marker: MapMarkerItem) => {
    if (onSelectMarkerRef.current) {
      onSelectMarkerRef.current(marker);
    }
  }, []);

  const stableOnClearSelection = useCallback(() => {
    if (onClearSelectionRef.current) {
      onClearSelectionRef.current();
    }
  }, []);

  useEffect(() => {
    lastCenterChangeTime.current = Date.now();
  }, [center]);

  useEffect(() => {
    lastSelectChangeTime.current = Date.now();
  }, [selectedMarkerId]);

  // react-leaflet applies a Popup's `className` only once at creation, so an open
  // popup keeps its old is-light/is-dark class when the base map style changes —
  // leaving e.g. white title text on the white "streets" card. Re-key the popup on
  // style change to recreate it with the right theme, and bump the select-time
  // guard first so the recreate's own popupclose doesn't drop the selection.
  const changeMapStyle = useCallback((style: 'streets' | 'satellite' | 'dark') => {
    lastSelectChangeTime.current = Date.now();
    setMapStyle(style);
  }, []);

  const selectedMarkerData = useMemo(() => {
    return markers.find((m) => m.id === selectedMarkerId) || null;
  }, [markers, selectedMarkerId]);

  const renderedMarkers = useMemo(() => {
    const list = markers.map((marker) => {
      const isSelected = marker.id === selectedMarkerId;
      const pinColor = marker.color || getCategoryColor(marker.category);
      return (
        <MapMarker
          key={marker.id}
          marker={marker}
          isSelected={isSelected}
          pinColor={pinColor}
          onSelectMarker={stableOnSelectMarker}
          markerRef={(ref) => {
            if (ref) {
              markersRefs.current[marker.id] = ref;
            } else {
              delete markersRefs.current[marker.id];
            }
          }}
        />
      );
    });

    if (enableClustering) {
      return (
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={45}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          disableClusteringAtZoom={16}
          iconCreateFunction={(cluster: any) => {
            const childCount = cluster.getChildCount();
            let c = 'marker-cluster-';
            if (childCount < 10) {
              c += 'small';
            } else if (childCount < 100) {
              c += 'medium';
            } else {
              c += 'large';
            }
            
            const markers = cluster.getAllChildMarkers();
            let dominantColor = '#3b82f6'; // default blue
            if (markers.length > 0) {
               const icon = markers[0].options.icon as any;
               if (icon && icon.options && icon.options.html) {
                  const match = icon.options.html.match(/fill="([^"]+)"/);
                  if (match && match[1]) {
                    dominantColor = match[1];
                  }
               }
            }

            return L.divIcon({
              html: `<div style="background-color: ${dominantColor}dd; width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid rgba(255,255,255,0.7); color: white; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.5);"><span>${childCount}</span></div>`,
              className: `marker-cluster ${c} custom-colored-cluster`,
              iconSize: L.point(40, 40),
            });
          }}
        >
          {list}
        </MarkerClusterGroup>
      );
    }
    return <>{list}</>;
  }, [markers, selectedMarkerId, enableClustering, onSelectMarker]);

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
            onClick={() => changeMapStyle('dark')}
            className={`px-3 py-1 rounded-lg transition-all ${
              mapStyle === 'dark' ? 'bg-blue-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            แผนที่มืด (Dark Police)
          </button>
          <button
            onClick={() => changeMapStyle('streets')}
            className={`px-3 py-1 rounded-lg transition-all ${
              mapStyle === 'streets' ? 'bg-blue-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ถนน (Streets)
          </button>
          <button
            onClick={() => changeMapStyle('satellite')}
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
          <MapController
            center={center}
            selectedMarkerId={selectedMarkerId}
            markersRefs={markersRefs}
          />
          <MapEventsCollector
            lastCenterChangeTime={lastCenterChangeTime}
            lastSelectChangeTime={lastSelectChangeTime}
            onPopupClose={() => {
              stableOnClearSelection();
            }}
          />

          <TileLayer
            attribution={tileAttributions[mapStyle]}
            url={tileUrls[mapStyle]}
            maxZoom={19}
          />

          {renderedMarkers}

          {/* Global Modern Popup */}
          {selectedMarkerData && (() => {
            const isDark = mapStyle === 'dark'; 
            return (
              <Popup
                key={`popup-${selectedMarkerData.id}-${mapStyle}`}
                position={[selectedMarkerData.lat, selectedMarkerData.lng]}
                autoPan={false}
                className={`modern-glass-popup ${isDark ? 'is-dark' : 'is-light'}`}
              >
                <div className="w-[280px] p-4 font-sans relative">
                  {/* Header Section */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="pr-2">
                      <h4 
                        className="font-bold text-[15px] leading-tight mb-2 drop-shadow-md"
                        style={{ color: isDark ? '#ffffff' : '#1e293b' }}
                      >
                        {selectedMarkerData.title}
                      </h4>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded text-white font-bold shadow-lg"
                        style={{ backgroundColor: getCategoryColor(selectedMarkerData.category) }}
                      >
                        {selectedMarkerData.category}
                      </span>
                    </div>
                  </div>

                  {/* Badges Section */}
                  {(selectedMarkerData.type || selectedMarkerData.status) && (
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      {selectedMarkerData.type && (
                        <div className="flex items-center gap-1.5 bg-blue-500/20 border border-blue-400/30 text-blue-300 px-2 py-1 rounded-lg text-xs font-semibold backdrop-blur-sm">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          {selectedMarkerData.type}
                        </div>
                      )}
                      {selectedMarkerData.status && (
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-semibold backdrop-blur-sm ${
                          selectedMarkerData.status.includes('ปกติ') || selectedMarkerData.status.includes('ออนไลน์')
                            ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
                            : 'bg-rose-500/20 border-rose-400/30 text-rose-300'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            selectedMarkerData.status.includes('ปกติ') || selectedMarkerData.status.includes('ออนไลน์')
                              ? 'bg-emerald-400 animate-pulse'
                              : 'bg-rose-400'
                          }`}></div>
                          {selectedMarkerData.status}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Details Section */}
                  {selectedMarkerData.address && selectedMarkerData.address !== '-' && (
                    <div className={`flex items-start gap-2 ${isDark ? 'text-slate-300' : 'text-slate-600'} text-xs mb-3`}>
                      <svg className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'} shrink-0 mt-0.5`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="leading-relaxed drop-shadow-sm">{selectedMarkerData.address}</span>
                    </div>
                  )}

                  {selectedMarkerData.notes && (
                    <div className={`${isDark ? 'bg-slate-900/60 border-slate-700/50' : 'bg-slate-50 border-slate-200'} border p-2.5 rounded-lg mb-4 backdrop-blur-sm`}>
                      <p className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'} italic leading-relaxed`}>
                        "{selectedMarkerData.notes}"
                      </p>
                    </div>
                  )}

                  {/* Footer Section */}
                  <div className={`flex items-center justify-between pt-3 border-t ${isDark ? 'border-slate-700/50' : 'border-slate-200'} mt-1`}>
                    <div className="flex flex-col">
                      <span className={`text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-wider font-semibold mb-0.5`}>Coordinates</span>
                      <span className={`font-mono text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {selectedMarkerData.lat.toFixed(4)}, {selectedMarkerData.lng.toFixed(4)}
                      </span>
                    </div>
                    
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedMarkerData.lat},${selectedMarkerData.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
                      className="px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-1 hover:brightness-110"
                    >
                      Google Maps
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </Popup>
            );
          })()}
        </MapContainer>
      </div>
    </div>
  );
};
