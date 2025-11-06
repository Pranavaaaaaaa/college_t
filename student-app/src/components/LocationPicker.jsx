import React, { useMemo, useRef, useCallback, useState } from 'react';
import apiClient from '../api.js';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// --- Icon fix (Leaflet's default icon can break in React) ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
// --- End Icon fix ---

// --- 1. MapSearch component (from ProfileSetup) ---
// We pass the 'map' object to it so it can control the view
function MapSearch({ map }) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError(null);
    if (!query || !map) return;

    try {
      // Call our new forward geocode endpoint
      const response = await apiClient.get(
        `/students/forward-geocode/?q=${query}`
      );
      const { latitude, longitude } = response.data;
      // Fly to the new location
      map.flyTo([latitude, longitude], 17); // Zoom in closer
    } catch (err) {
      setError('Landmark not found.');
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSearch} className="mb-2 flex space-x-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search landmark (e.g., UB City)"
        className="flex-grow p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
      />
      <button
        type="submit"
        className="p-2.5 bg-indigo-600 text-white rounded-md font-bold hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300"
      >
        Search
      </button>
      {error && <div className="text-red-600 text-sm mb-1">{error}</div>}
    </form>
  );
}


// --- 2. DraggableMarker component (Internal helper) ---
function DraggableMarker({ position, setPosition, fetchAddress }) {
  const markerRef = useRef(null);
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      fetchAddress(e.latlng);
    },
  });
  const eventHandlers = useMemo(() => ({
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const latlng = marker.getLatLng();
        setPosition(latlng);
        fetchAddress(latlng);
      }
    },
  }), [setPosition, fetchAddress]);
  
  return position === null ? null : (
    <Marker draggable={true} eventHandlers={eventHandlers} position={position} ref={markerRef}>
      <Popup>Drag me to your home</Popup>
    </Marker>
  );
}

// --- 3. Main LocationPicker component (Updated) ---
function LocationPicker({ position, setPosition, setAddress, map, setMap, defaultCenter }) {
  
  const fetchAddress = useCallback(async (latlng) => {
    setAddress('Loading address...');
    try {
      const response = await apiClient.get(
        `/students/reverse-geocode/?lat=${latlng.lat}&lon=${latlng.lng}`
      );
      // Ensure the address is a string and not an object
      if (response.data && response.data.address) {
        setAddress(response.data.address);
      } else {
        setAddress('Could not find address.');
      }
    } catch (err) {
      console.error("Reverse geocode error:", err);
      setAddress('Could not find address.');
    }
  }, [setAddress]);

  const handleRecenter = () => {
    if (map) {
      map.flyTo(defaultCenter, 12);
    }
  };

  return (
    <div className="relative">
      {/* Search bar is now part of this component */}
      <MapSearch map={map} />
    
      <div className="relative rounded-md overflow-hidden border-2 border-gray-300 shadow-inner">
        <MapContainer 
          center={defaultCenter} 
          zoom={12} 
          style={{ height: '400px', width: '100%' }}
          ref={setMap}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <DraggableMarker 
            position={position} 
            setPosition={setPosition} 
            fetchAddress={fetchAddress} 
          />
        </MapContainer>
        <button 
          type="button"
          onClick={handleRecenter}
          title="Recenter Map"
          className="absolute bottom-4 right-2 z-[450] bg-white border border-gray-300 rounded-md p-2 shadow-lg text-2xl hover:bg-gray-100"
        >
          ⌖
        </button>
      </div>
    </div>
  );
}

export default LocationPicker;