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
    } else {
      if (selectedMarkerId && markersRefs.current) {
        const marker = markersRefs.current[selectedMarkerId];
        if (marker && map.hasLayer(marker) && !marker.isPopupOpen()) {
          marker.openPopup();
        }
      }
    }
  }, [center, map, selectedMarkerId, markersRefs]);

  useEffect(() => {
    const onMoveEnd = () => {
      if (selectedMarkerId && markersRefs.current) {
        const marker = markersRefs.current[selectedMarkerId];
        if (marker && map.hasLayer(marker) && !marker.isPopupOpen()) {
          marker.openPopup();
        }
      }
    };

    map.on('moveend', onMoveEnd);
    return () => {
      map.off('moveend', onMoveEnd);
    };
  }, [map, selectedMarkerId, markersRefs]);

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

export const TYPE_COLORS: Record<string, string> = {
  'Fixed Camera': '#0ea5e9', // Light Blue
  'PTZ Camera': '#8b5cf6',   // Purple
  'LPR/AI Camera': '#10b981', // Emerald
  'Speed Cam': '#f59e0b',    // Amber
  '4G': '#ec4899',           // Pink
  '5G': '#f43f5e',           // Rose
  'WiFi': '#3b82f6',         // Indigo
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
  onPopupClose,
}: {
  lastCenterChangeTime: React.RefObject<number>;
  onPopupClose: () => void;
}) {
  useMapEvents({
    popupclose: () => {
      const timeSinceMove = Date.now() - (lastCenterChangeTime.current || 0);
      // Ignore programmatic popupclose events caused by panning/zooming animations
      if (timeSinceMove > 1000) {
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
  hasMiddleContent,
  markerRef,
}: {
  marker: MapMarkerItem;
  isSelected: boolean;
  pinColor: string;
  onSelectMarker?: (marker: MapMarkerItem) => void;
  hasMiddleContent: boolean;
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
    >
      <Popup className="custom-leaflet-popup" autoPan={false}>
        <div className="p-1 space-y-1.5 min-w-[210px] text-slate-900 font-sans">
          <div className={`font-bold text-sm text-slate-900 pb-1 flex items-center justify-between ${
            hasMiddleContent ? 'border-b' : ''
          }`}>
            <span>{marker.title}</span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded text-white font-bold shrink-0 ml-1"
              style={{ backgroundColor: marker.color || '#3b82f6' }}
            >
              {marker.category}
            </span>
          </div>

          {(marker.type || marker.status) && (
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
              {marker.type && (
                <span className="bg-blue-50/80 text-blue-600 border border-blue-200/50 px-1.5 py-0.5 rounded shrink-0">
                  📹 {marker.type}
                </span>
              )}
              {marker.status && (
                <span className={`px-1.5 py-0.5 rounded border shrink-0 ${
                  marker.status.includes('ปกติ') || marker.status.includes('ออนไลน์')
                    ? 'bg-emerald-50/80 text-emerald-600 border-emerald-200/50'
                    : 'bg-rose-50/80 text-rose-600 border-rose-200/50'
                }`}>
                  {marker.status}
                </span>
              )}
            </div>
          )}

          {marker.address && marker.address !== '-' && (
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

  const renderedMarkers = useMemo(() => {
    const list = markers.map((marker) => {
      const isSelected = marker.id === selectedMarkerId;
      const pinColor = marker.color || CATEGORY_COLORS[marker.category] || '#3b82f6';
      const hasMiddleContent = !!((marker.address && marker.address !== '-') || marker.notes || marker.type || marker.status);
      return (
        <MapMarker
          key={marker.id}
          marker={marker}
          isSelected={isSelected}
          pinColor={pinColor}
          onSelectMarker={stableOnSelectMarker}
          hasMiddleContent={hasMiddleContent}
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
          <MapController
            center={center}
            selectedMarkerId={selectedMarkerId}
            markersRefs={markersRefs}
          />
          <MapEventsCollector
            lastCenterChangeTime={lastCenterChangeTime}
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
        </MapContainer>
      </div>
    </div>
  );
};
