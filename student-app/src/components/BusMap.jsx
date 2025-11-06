import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../api';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useNotifications } from '../context/NotificationContext.jsx'; 

// --- Icon fix (unchanged) ---
let DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const busIcon = new L.Icon({
    iconUrl: 'https://icon-library.com/images/google-maps-bus-icon/google-maps-bus-icon-18.jpg',
    iconSize: [36, 36],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});

// Helper function to calculate distance between two points (in meters)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

function BusMap() {
  const [routeInfo, setRouteInfo] = useState(null);
  const [busPosition, setBusPosition] = useState(null);
  const [routePolyline, setRoutePolyline] = useState([]);
  const [busAddress, setBusAddress] = useState('Awaiting signal...');
  const [error, setError] = useState(null);
  const [myStop, setMyStop] = useState(null);
  const [mapCenter, setMapCenter] = useState([12.9716, 77.5946]);
  const [map, setMap] = useState(null);
  const [distance, setDistance] = useState(null); // NEW: Show distance on UI
  const myStopRef = useRef(null);
  const ws = useRef(null);
  const { addNotification } = useNotifications();

  const fetchRouteGeometry = useCallback(async (busPos) => {
    console.log("Step 1: Inside fetchRouteGeometry.");

    if (!myStopRef.current) {
        console.log("Step 2a: FAILED - myStopRef.current is null.");
        return;
    }
    if (!busPos) {
        console.log("Step 2b: FAILED - busPos is null or undefined.");
        return;
    }
    console.log("Step 2c: PASSED - Have both myStopRef and busPos.");
    console.log("   myStopRef.current:", myStopRef.current);
    console.log("   busPos:", busPos);

    try {
      console.log("Step 3: Preparing API call parameters...");
      const params = {
          start_lat: busPos[0],
          start_lon: busPos[1],
          end_lat: myStopRef.current.latitude,
          end_lon: myStopRef.current.longitude
      };
      console.log("   Params:", params);

      console.log("Step 4: Calling apiClient.get...");
      const response = await apiClient.get('/transport/route-geometry/', { params });
      console.log("Step 5: API call successful. Response:", response.data);

      console.log("Polyline data:", response.data.polyline);
      setRoutePolyline(response.data.polyline);

      if (response.data.snapped_start_point) {
        setBusPosition(response.data.snapped_start_point);
      }
      setBusAddress(response.data.bus_address);

      // NEW: Calculate and display distance
      const dist = calculateDistance(
        busPos[0], busPos[1],
        myStopRef.current.latitude, myStopRef.current.longitude
      );
      setDistance(dist);
      console.log(`Distance from bus to your stop: ${dist.toFixed(0)} meters`);

  } catch (err) {
      console.error("Step 6: ERROR during fetchRouteGeometry", err);
      if (err.response) {
          console.error("   API Error Details:", err.response.status, err.response.data);
      } else if (err.request) {
            console.error("   Network Error: No response received.", err.request);
      } else {
            console.error("   Error setting up request:", err.message);
      }
  }
}, []);

  useEffect(() => {
        let isMounted = true;

        const wsBaseUrl = (process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:8000')
                        .replace(/^http/, 'ws');

        const connectWebSocket = () => {
            const token = localStorage.getItem('access_token');
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                console.log("WebSocket already connected.");
                return;
            }

            ws.current = new WebSocket(`${wsBaseUrl}/ws/track/?token=${token}`);
            ws.current.onopen = () => console.log('WebSocket connected!');

            ws.current.onmessage = (event) => {
              if (!isMounted) return;
              const data = JSON.parse(event.data);
              console.log("WebSocket message received:", data);

              if (data.type === 'location') {
                const newBusPos = [data.latitude, data.longitude];
                console.log("🚌 Bus location update:", newBusPos);
                fetchRouteGeometry(newBusPos);
              } 
              else if (data.type === 'notification') {
                console.log("🔔 NOTIFICATION RECEIVED:", data);
                addNotification({ title: data.title, body: data.body });
              } else {
                console.log("⚠️ Unknown message type:", data.type);
              }
            };

            ws.current.onclose = () => {
                console.log('WebSocket disconnected. Attempting to reconnect...');
                ws.current = null;
                if (isMounted) {
                    setRoutePolyline([]);
                    setBusAddress('Awaiting signal...');
                    setTimeout(connectWebSocket, 3000);
                }
            };

            ws.current.onerror = (err) => {
                console.error('WebSocket error:', err);
                if (isMounted) setRoutePolyline([]);
                if (ws.current) ws.current.close();
            };
        };

        const fetchRouteInfoAndConnect = async () => {
            try {
                const response = await apiClient.get('/transport/my-route/');
                if (!isMounted) return;
                const data = response.data;
                setRouteInfo(data);
                const foundMyStop = data.all_stops_on_route.find(stop => stop.pickup_order === data.your_pickup_order);
                if (foundMyStop) {
                    setMyStop(foundMyStop);
                    myStopRef.current = foundMyStop;
                    setMapCenter([foundMyStop.latitude, foundMyStop.longitude]);
                    console.log("✅ Your stop loaded:", foundMyStop);
                    connectWebSocket();
                } else { 
                    setError("Error: Could not find your stop on the assigned route."); 
                }

            } catch (err) { 
                if (err.response && err.response.data.message) {
                  setError(err.response.data.message);
                } else {
                  setError('Failed to fetch route info.');
                }
                console.error(err); 
            }
        };

        fetchRouteInfoAndConnect();

        return () => {
            isMounted = false;
            if (ws.current) {
                ws.current.close();
                console.log("WebSocket closed on component unmount.");
            }
        };
    }, [fetchRouteGeometry, addNotification]);

  const handleRecenter = () => {
    if (!map) return;

    if (busPosition && myStop) {
      const stopLatLng = L.latLng(myStop.latitude, myStop.longitude);
      const busLatLng = L.latLng(busPosition[0], busPosition[1]);
      const bounds = L.latLngBounds(stopLatLng, busLatLng);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (myStop) {
      map.flyTo([myStop.latitude, myStop.longitude], 15);
    }
  };

  if (error) {
    return <div className="p-4 text-red-600"><strong>Note:</strong> {error}</div>;
  }
  if (!routeInfo || !myStop) {
    return <div className="p-4">Loading your route information...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold">Route: {routeInfo.route_name}</h2>
        <button onClick={handleRecenter} title="Recenter Map" className="text-2xl p-2 rounded-md hover:bg-gray-100">
          ⌖
        </button>
      </div>
      
      <div className="relative shadow-lg rounded-md overflow-hidden">
        <MapContainer 
          center={mapCenter} 
          zoom={15} 
          style={{ height: '400px', width: '100%' }}
          ref={setMap}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <Marker position={[myStop.latitude, myStop.longitude]}>
            <Popup>
              <strong>My Stop (Pickup #{myStop.pickup_order})</strong><br/>{myStop.address}
            </Popup>
          </Marker>
          {busPosition && (
            <Marker position={busPosition} icon={busIcon}>
              <Popup>Bus Location</Popup>
            </Marker>
          )}
          {routePolyline.length > 0 && (
            <Polyline key={JSON.stringify(routePolyline)} positions={routePolyline} color="blue" />
          )}
        </MapContainer>
      </div>
      
      <div className="p-4 bg-gray-100 rounded-md mt-4">
        <strong>Bus Status:</strong>
        {busPosition ? (
          <div>
            <span> {busAddress}</span>
            {distance !== null && (
              <div className="mt-2">
                <strong>Distance to your stop:</strong> 
                <span className={
                  distance <= 30 ? "text-red-600 font-bold text-lg animate-pulse" :
                  distance <= 500 ? "text-red-600 font-bold" : 
                  "text-green-600"
                }>
                  {` ${distance.toFixed(0)} meters`}
                </span>
                {distance <= 30 && <span className="ml-2 text-xl">🚨 BUS IS HERE!</span>}
                {distance > 30 && distance <= 500 && <span className="ml-2">🔥 (Within geofence!)</span>}
              </div>
            )}
          </div>
        ) : (
          <span> Awaiting signal from driver...</span>
        )}
      </div>
    </div>
  );
}

export default BusMap;