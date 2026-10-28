import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ShieldCheck, MapPin, IndianRupee } from 'lucide-react';

// Custom modern SVG marker pin
const createCustomIcon = (trustScore) => {
  const isHighTrust = trustScore >= 80;
  const pinColor = isHighTrust ? '#10b981' : '#3b82f6';

  const svgHtml = `
    <div style="
      background-color: ${pinColor};
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
    ">
      <div style="
        transform: rotate(45deg);
        color: white;
        font-size: 11px;
        font-weight: bold;
      ">
        ${Math.round(trustScore)}
      </div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-leaflet-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const ProviderMap = ({ providers, selectedProvider, onSelectProvider }) => {
  // Default center coordinates: Mangaluru City Center
  const defaultCenter = [12.8703, 74.8436];

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        className="h-full w-full"
        style={{ minHeight: '400px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {providers.map((p) => {
          if (!p.latitude || !p.longitude) return null;

          return (
            <Marker
              key={p.id}
              position={[p.latitude, p.longitude]}
              icon={createCustomIcon(p.trust_score)}
              eventHandlers={{
                click: () => onSelectProvider && onSelectProvider(p),
              }}
            >
              <Popup>
                <div className="p-1 space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm">{p.full_name}</h4>
                  <p className="text-xs text-brand-600 font-semibold">{p.service_category}</p>
                  <p className="text-xs text-slate-600 flex items-center">
                    <MapPin className="h-3 w-3 mr-1 text-slate-400" />
                    {p.service_address}
                  </p>
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                    <span className="font-bold text-slate-800">₹{p.hourly_rate}/hr</span>
                    <span className="font-semibold text-emerald-600">
                      Trust: {p.trust_score.toFixed(1)}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default ProviderMap;