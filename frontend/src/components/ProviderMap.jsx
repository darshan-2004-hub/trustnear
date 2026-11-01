import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Star, MapPin, IndianRupee, ShieldCheck } from 'lucide-react';

// Neon Cyber Radar Marker for Leaflet
const createDarkMarker = (trustScore) => {
  const score = parseFloat(trustScore) || 50;
  const color = score >= 85 ? '#2dd4bf' : score >= 70 ? '#6d5dfc' : '#fbbf24';

  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 48" width="32" height="42">
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="${color}" flood-opacity="0.6"/>
        </filter>
      </defs>
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z" fill="#262b47" stroke="${color}" stroke-width="2.5" filter="url(#glow)"/>
      <circle cx="18" cy="18" r="8" fill="${color}"/>
      <text x="18" y="21.5" font-size="9" font-weight="900" fill="#1c2036" text-anchor="middle" font-family="sans-serif">${Math.round(score)}</text>
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
    <div className="theme-card overflow-hidden h-full min-h-[460px] relative shadow-2xl map-dark-tiles">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        className="h-full w-full"
        style={{ minHeight: '460px', background: '#161a2e' }}
      >
        {/* OpenStreetMap with CSS Cyber-Dark Inversion: 100% Free & No Watermarks */}
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
              icon={createDarkMarker(p.trust_score)}
              eventHandlers={{
                click: () => onSelectProvider && onSelectProvider(p),
              }}
            >
              <Popup>
                <div className="p-3 bg-[#262b47] border border-[#363d66] rounded-xl text-white text-xs space-y-2 min-w-[210px]">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-sm">{p.full_name}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2dd4bf]/20 text-[#2dd4bf]">
                      {p.trust_score ? `${Number(p.trust_score).toFixed(0)} Trust` : 'Verified'}
                    </span>
                  </div>

                  <p className="text-[#6d5dfc] font-semibold text-[11px]">{p.service_category}</p>

                  <div className="flex items-center justify-between text-[#a9b0d0] text-[11px] pt-1 border-t border-[#363d66]">
                    <span>Rate: <strong className="text-white">₹{p.hourly_rate}/hr</strong></span>
                    <span className="text-[#fbbf24] font-bold">★ {p.rating || 4.9}</span>
                  </div>

                  {onBookProvider && (
                    <button
                      onClick={() => onBookProvider(p)}
                      className="w-full mt-2 py-1.5 btn-primary text-[11px] font-bold uppercase tracking-wider cursor-pointer"
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