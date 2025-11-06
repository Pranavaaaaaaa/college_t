import React, { useState, useRef, useEffect, useCallback } from 'react';
import apiClient from '../api'; // Corrected import path

function DriverLocationTracker() {
  const [isTracking, setIsTracking] = useState(false);
  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState('Awaiting location...');
  const [error, setError] = useState(null);
  const watchId = useRef(null);
  const intervalId = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetches address from coordinates
  const getAddressFromCoords = useCallback(async (lat, lon) => {
    try {
      const response = await apiClient.get(
        `/students/reverse-geocode/?lat=${lat}&lon=${lon}`
      );
      setAddress(response.data.address);
    } catch (err) {
      console.error(err);
      setAddress('Could not find address');
    }
  }, []);

  // Sends location to backend
  const sendLocation = (currentPosition) => {
    if (!currentPosition) return;

    // Get address for display
    getAddressFromCoords(currentPosition.latitude, currentPosition.longitude);
    
    // Send location to backend
    apiClient.post('/transport/update-location/', {
      latitude: currentPosition.latitude,
      longitude: currentPosition.longitude,
    }).catch(err => {
      console.error("Failed to send location", err);
      setError("Failed to send location. Session may be expired.");
    });
  };

  // This is the main function to start or stop tracking
  const handleToggleTracking = () => {
    setIsLoading(true);
    if (isTracking) {
      // --- STOP TRACKING ---
      navigator.geolocation.clearWatch(watchId.current);
      clearInterval(intervalId.current);
      watchId.current = null;
      intervalId.current = null;
      setIsTracking(false);
      setError(null);
      setIsLoading(false);
    } else {
      // --- START TRACKING ---
      setError(null);
      // 1. Get and send position IMMEDIATELY
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const initialPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setPosition(initialPosition); // Update state
          sendLocation(initialPosition); // Send immediately

          // 2. Start the watcher (updates state for the interval)
          watchId.current = navigator.geolocation.watchPosition(
            (posWatch) => {
              const newPosition = {
                latitude: posWatch.coords.latitude,
                longitude: posWatch.coords.longitude,
              };
              setPosition(newPosition);
            },
            (errWatch) => {
              setError(`Watch Error (${errWatch.code}): ${errWatch.message}.`);
            },
            { enableHighAccuracy: true }
          );

          // 3. Start the 10-second interval
          intervalId.current = setInterval(() => {
            setPosition(currentPos => {
              sendLocation(currentPos);
              return currentPos;
            });
          }, 10000); // 10 seconds

          setIsTracking(true);
          setIsLoading(false);
        },
        (errInitial) => {
          setError(`Initial Location Error (${errInitial.code}): ${errInitial.message}.`);
          setIsTracking(false);
          setIsLoading(false);
        },
        { enableHighAccuracy: true }
      );
    }
  };
  
  // Cleanup function to stop tracking if the user navigates away
  useEffect(() => {
    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      if (intervalId.current) clearInterval(intervalId.current);
    };
  }, []);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full bg-white rounded-xl p-1">
      {/* Left Side: Status & Location Info */}
      <div className="flex flex-col gap-1 overflow-hidden">
        <div className="flex items-center space-x-2.5">
           <span className="relative flex h-3 w-3">
             {isTracking && !isLoading && (
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
             )}
             <span className={`relative inline-flex rounded-full h-3 w-3 ${isTracking ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
           </span>
           <span className={`text-xs font-extrabold uppercase tracking-wider ${isTracking ? 'text-emerald-700' : 'text-slate-500'}`}>
             {isTracking ? 'Broadcasting Live' : 'Offline Mode'}
           </span>
        </div>

        <div className="flex items-center text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 mr-1.5 flex-shrink-0 ${isTracking ? 'text-indigo-500' : 'text-gray-400'}`}>
            <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.006.003.002.001.003-.001a.75.75 0 00-.01-.003zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium truncate max-w-[250px] sm:max-w-md">
            {isTracking ? (address || 'Acquiring precise location...') : 'Location hidden'}
          </span>
        </div>
        
        {error && (
          <p className="text-xs text-red-600 font-bold flex items-center mt-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mr-1">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>

      {/* Right Side: Toggle Button with Loading State */}
      <button
        onClick={handleToggleTracking}
        disabled={isLoading}
        className={`shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md flex items-center justify-center min-w-[180px]
          ${isLoading ? 'bg-slate-400 cursor-not-allowed opacity-80' : ''}
          ${!isLoading && isTracking ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30 active:scale-95' : ''}
          ${!isLoading && !isTracking ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30 active:scale-95' : ''}
        `}
      >
        {isLoading ? (
           <>
             <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
             Updating...
           </>
        ) : isTracking ? (
           <>
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-2">
               <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
             </svg>
             Stop Broadcasting
           </>
        ) : (
           <>
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-2">
               <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
               <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
             </svg>
             Start Broadcasting Location
           </>
        )}
      </button>
    </div>
  );
}

export default DriverLocationTracker;


