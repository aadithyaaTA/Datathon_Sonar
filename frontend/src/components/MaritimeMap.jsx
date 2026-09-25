import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Compass, Navigation2, Crosshair, MapPin } from 'lucide-react';
import { CLASS_COLORS, getClassColor } from '../services/colors';
import { playTargetClick } from '../services/audio';

function createCustomIcon(color, isVessel = false, heading = 0) {
  if (isVessel) {
    const svgHtml = `
      <div style="transform: rotate(${heading}deg); display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="28px" height="28px">
          <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
        </svg>
      </div>
    `;
    return L.divIcon({
      className: 'custom-vessel-marker',
      html: svgHtml,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }

  const svgHtml = `
    <div style="display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;">
      <div style="width: 14px; height: 14px; border-radius: 2px; background: ${color}; border: 2px solid #141414; box-shadow: 0 0 0 1px rgba(255,255,255,0.4);"></div>
    </div>
  `;
  return L.divIcon({
    className: 'custom-target-marker',
    html: svgHtml,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
}

function MapViewController({ center, zoom, bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.isValid && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    } else if (center) {
      map.setView(center, zoom || 15);
    }
  }, [center, zoom, bounds, map]);
  return null;
}

export default function MaritimeMap({
  vesselNav,
  detections,
  selectedDetection,
  onSelectDetection,
}) {
  const defaultCenter = [vesselNav?.vessel_lat || 13.0827, vesselNav?.vessel_lon || 80.2707];
  const heading = vesselNav?.heading || 90;

  // Calculate Map Bounds
  let bounds = null;
  if (detections && detections.length > 0) {
    const latLngs = [[vesselNav.vessel_lat, vesselNav.vessel_lon]];
    detections.forEach((d) => latLngs.push([d.latitude, d.longitude]));
    bounds = L.latLngBounds(latLngs);
  }

  const handleMarkerClick = (det) => {
    playTargetClick();
    onSelectDetection(det);
  };

  return (
    <div className="bg-[#1f1f1f] border border-white/08 rounded-[2px] p-4 flex flex-col gap-3">
      {/* Header: Visibly larger and bolder */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/08">
        <div className="flex items-center gap-2 text-[18px] font-mono font-bold text-white tracking-wide">
          <div className="p-1.5 rounded-[2px] bg-[#141414] border border-white/10 text-[#c98a4b]">
            <Navigation2 className="w-4 h-4" />
          </div>
          <span>WGS84 MARITIME GIS GEOLOCATION</span>
        </div>
        <div className="flex items-center gap-2 text-[12.5px] font-mono text-slate-400">
          <span>CartoDB Dark Nautical Grid</span>
        </div>
      </div>

      <div className="h-[380px] w-full rounded-[2px] overflow-hidden relative border border-white/10">
        <MapContainer
          center={defaultCenter}
          zoom={15}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <MapViewController center={defaultCenter} bounds={bounds} />

          {/* CartoDB Dark Matter Marine Tile Layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Swath Range Rings */}
          {vesselNav && (
            <>
              <Circle
                center={[vesselNav.vessel_lat, vesselNav.vessel_lon]}
                radius={(vesselNav.swath_width_m || 100) / 2}
                pathOptions={{
                  color: '#c98a4b',
                  fillColor: '#c98a4b',
                  fillOpacity: 0.03,
                  weight: 1.5,
                  dashArray: '4, 6',
                }}
              />
              <Circle
                center={[vesselNav.vessel_lat, vesselNav.vessel_lon]}
                radius={vesselNav.swath_width_m || 100}
                pathOptions={{
                  color: '#555555',
                  fillColor: 'transparent',
                  weight: 1,
                  dashArray: '6, 8',
                }}
              />
            </>
          )}

          {/* Survey Vessel / Towfish Marker */}
          {vesselNav && (
            <Marker
              position={[vesselNav.vessel_lat, vesselNav.vessel_lon]}
              icon={createCustomIcon('#c98a4b', true, heading)}
            >
              <Popup>
                <div className="p-1 font-mono text-xs text-slate-200">
                  <div className="font-bold text-[#c98a4b] mb-1.5 flex items-center gap-1.5 border-b border-white/10 pb-1 text-[13px]">
                    <Compass className="w-4 h-4 text-[#c98a4b]" />
                    SURVEY TOWFISH / AUV
                  </div>
                  <div className="text-[12px] space-y-1 text-slate-300">
                    <p>Lat: <strong className="text-white">{vesselNav.vessel_lat.toFixed(6)}°N</strong></p>
                    <p>Lon: <strong className="text-white">{vesselNav.vessel_lon.toFixed(6)}°E</strong></p>
                    <p>Heading: <strong className="text-slate-200">{heading}° True</strong></p>
                    <p>Altitude: <strong className="text-slate-200">{vesselNav.altitude} m</strong></p>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Detected Target Markers (Locked Colors, Sharp 2px Markers) */}
          {detections?.map((det) => {
            const cColor = getClassColor(det.class_name);
            return (
              <Marker
                key={det.id}
                position={[det.latitude, det.longitude]}
                icon={createCustomIcon(cColor.hex, false)}
                eventHandlers={{
                  click: () => handleMarkerClick(det),
                }}
              >
                <Popup>
                  <div className="p-1.5 font-mono text-xs text-slate-200 min-w-[200px]">
                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10">
                      <span className="font-bold uppercase text-white flex items-center gap-1.5 text-[13px]">
                        <span
                          className="w-2.5 h-2.5 rounded-[1px]"
                          style={{ backgroundColor: cColor.hex }}
                        />
                        {det.class_name.replace('_', ' ')}
                      </span>
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-[2px] font-bold"
                        style={{
                          backgroundColor: `${cColor.hex}22`,
                          color: cColor.hex,
                          border: `1px solid ${cColor.hex}55`,
                        }}
                      >
                        {det.hazard_level}
                      </span>
                    </div>

                    <div className="text-[12px] space-y-1 text-slate-300">
                      <p>Final Score: <strong className="text-white">{Math.round(det.final_score * 100)}%</strong></p>
                      <p>Acoustic Shadow: <strong className="text-slate-200">{det.shadow_detected ? 'CONFIRMED' : 'NO'}</strong></p>
                      <p>Slant Range: <strong className="text-[#c98a4b]">{det.geo_details.slant_range_m}m</strong></p>
                      <div className="text-[11px] text-slate-400 pt-1.5 mt-1 border-t border-white/08 font-mono">
                        {det.latitude.toFixed(6)}°N, {det.longitude.toFixed(6)}°E
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
