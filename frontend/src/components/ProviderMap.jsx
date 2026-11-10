import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Star, MapPin, IndianRupee, ShieldCheck } from 'lucide-react';

// Light Map Marker for Leaflet
const createLightMarker = (trustScore) => {
  const score = parseFloat(trustScore) || 50;
  const pinColor = score >= 85 ? '#16a34a' : score >= 70 ? '#2563eb' : '#d97706';

  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 48" width="32" height="42">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#0f172a" flood-opacity="0.25"/>
        </filter>
      </defs>
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z" fill="${pinColor}" stroke="#ffffff" stroke-width="2" filter="url(#shadow)"/>
      <circle cx="18" cy="18" r="9" fill="#ffffff"/>
      <text x="18" y="22" font-size="9" font-weight="900" fill="${pinColor}" text-anchor="middle" font-family="sans-serif">${Math.round(score)}</text>
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: 'custom-leaflet-pin',
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -40],
  });
};

const ProviderMap = ({ providers = [], selectedProvider, onSelectProvider, onBookProvider }) => {
  // Center coordinates: Mangaluru Central
  const defaultCenter = [12.8703, 74.8436];

  return (
    <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden h-full min-h-[460px] relative shadow-sm">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        className="h-full w-full"
        style={{ minHeight: '460px', background: '#f8fafc' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {providers.map((p) => {
          if (!p.latitude || !p.longitude) return null;

          return (
            <Marker
              key={p.id || p.user_id}
              position={[parseFloat(p.latitude), parseFloat(p.longitude)]}
              icon={createLightMarker(p.trust_score)}
              eventHandlers={{
                click: () => onSelectProvider && onSelectProvider(p),
              }}
            >
              <Popup>
                <div className="p-3 bg-white border border-[#e2e8f0] rounded-xl text-[#172033] text-xs space-y-2 min-w-[210px] shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-[#172033] text-sm">{p.full_name}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {p.trust_score ? `${Number(p.trust_score).toFixed(0)} Trust` : 'Verified'}
                    </span>
                  </div>

                  <p className="text-blue-600 font-semibold text-[11px]">{p.service_category}</p>

                  <div className="flex items-center justify-between text-[#475569] text-[11px] pt-1 border-t border-[#e2e8f0]">
                    <span>Rate: <strong className="text-[#172033]">₹{p.hourly_rate}/hr</strong></span>
                    <span className="text-amber-500 font-bold">{p.rating ? `★ ${Number(p.rating).toFixed(1)}` : '★ New'}</span>
                  </div>

                  {onBookProvider && (
                    <button
                      onClick={() => onBookProvider(p)}
                      className="w-full mt-2 py-1.5 btn-primary text-[11px] font-bold uppercase tracking-wider cursor-pointer shadow-sm"
                    >
                      Book This Pro
                    </button>
                  )}
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
