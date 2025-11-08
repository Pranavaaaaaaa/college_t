import React, { useState, useMemo, useRef, useCallback } from 'react';
import apiClient from '../api';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
// --- 1. NEW COMPONENT: A simple search bar ---
// We pass the 'map' object to it so it can control the view
function MapSearch({ map }) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError(null);
    if (!query) return;

    try {
      // Call our new forward geocode endpoint
      const response = await apiClient.get(
        `/students/forward-geocode/?q=${query}`
      );

      const { latitude, longitude } = response.data;

      // If we have a map, fly to the new location
      if (map) {
        map.flyTo([latitude, longitude], 18); // Zoom to level 15
      }
    } catch (err) {
      setError('Landmark not found.');
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSearch} style={{ marginBottom: '10px' }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for a landmark (e.g., UB City)"
        style={{ width: '250px' }}
      />
      <button type="submit">Search</button>
      {error && <div style={{ color: 'red', fontSize: '12px' }}>{error}</div>}
    </form>
  );
}


// --- 2. DraggableMarker component (unchanged from last time) ---
function DraggableMarker({ position, setPosition, setAddress }) {
  const markerRef = useRef(null);
  const fetchAddress = useCallback(async (latlng) => {
    setAddress('Loading address...');
    try {
      const response = await apiClient.get(
        `/students/reverse-geocode/?lat=${latlng.lat}&lon=${latlng.lng}`
      );
      setAddress(response.data.address);
    } catch (err) {
      console.error(err);
      setAddress('Could not find address for this location.');
    }
  }, [setAddress]);

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      fetchAddress(e.latlng);
    },
  });

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latlng = marker.getLatLng();
          setPosition(latlng);
          fetchAddress(latlng);
        }
      },
    }),
    [setPosition, fetchAddress],
  );

  return position === null ? null : (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}>
      <Popup>Drag me to your exact location!</Popup>
    </Marker>
  );
}


// --- 3. Main ProfileSetup Component (Updated) ---
function ProfileSetup({ onProfileUpdated }) {
  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [map, setMap] = useState(null); // New state to hold the map instance

  const defaultCenter = [12.9716, 77.5946]; // Bengaluru

  const handleSubmit = async (e) => {
    // ... (This function is unchanged from last time)
    e.preventDefault();
    setError(null);
    if (!position || !address || address.includes('Loading')) {
      setError('Please select a valid location on the map.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiClient.put('/students/profile/', {
        latitude: position.lat,
        longitude: position.lng,
        address: address,
      });
      onProfileUpdated(response.data);
    } catch (err) {
      setError('Failed to save location.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h3>Welcome! Please set your pickup location.</h3>
      <p>Search for a nearby landmark, then click/drag to pin your home.</p>

      {/* We add the search bar here and pass the map instance to it */}
      <MapSearch map={map} />

      <MapContainer 
        center={defaultCenter} 
        zoom={12} 
        style={{ height: '400px', width: '100%' }}
        ref={setMap} // This callback saves the map instance to our state
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <DraggableMarker 
          position={position} 
          setPosition={setPosition} 
          setAddress={setAddress}
        />
      </MapContainer>

      {/* This box for showing the selected pin's address is unchanged */}
      {address && (
        <div style={{ margin: '15px 0', padding: '10px', background: '#f4f4f4', border: '1px solid #ddd' }}>
          <strong>Selected Address:</strong> {address}
        </div>
      )}

      <button type="submit" onClick={handleSubmit} disabled={isLoading || !position}>
        {isLoading ? 'Saving...' : 'Save Location'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default ProfileSetup;