import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import DriverLocationTracker from '../components/DriverLocationTracker.jsx';

// New "DRIVER" specific icon (Steering Wheel)
const SteeringWheelIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white">
    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
  </svg>
);

function formatDuration(totalSeconds) {
  if (totalSeconds == null) return '';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0 && minutes === 0) return '< 1 min';
  return `${hours > 0 ? hours + 'h ' : ''}${minutes}m`;
}

function DriverDashboard() {
  const [route, setRoute] = useState(null);
  const [stops, setStops] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const ws = useRef(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        navigate('/login');
        return;
    }

    function connectWebSocket() {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) return;
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:8000';
      const wsUrl = backendUrl
                    .replace(/^https/, 'wss')
                    .replace(/^http/, 'ws')
                    .replace('/api', '');
      ws.current = new WebSocket(`${wsUrl}/ws/track/?token=${token}`);
      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'student_check_in') {
          setStops(current => current.map(stop => stop.id === data.student_id ? { ...stop, is_boarding_today: data.is_boarding } : stop));
        }
      };
      ws.current.onclose = () => setTimeout(connectWebSocket, 3000);
    }

    const fetchRoute = async () => {
      try {
        const response = await apiClient.get('/transport/driver/my-route/');
        setRoute(response.data);
        setStops(response.data.all_stops_on_route);
        connectWebSocket();
      } catch (err) {
        setError('No active route assigned to you.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoute();
    return () => ws.current?.close();
  }, [navigate]);
  
  const handleOnDragEnd = async (result) => {
    if (!result.destination) return;
    const items = Array.from(stops);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setStops(items);
    try {
      await apiClient.put('/transport/driver/reorder-stops/', { stop_ids: items.map(s => s.id) });
    } catch (err) {
      setStops(route.all_stops_on_route); 
    }
  };

  const updateStopStatus = (id, status) => {
    setStops(stops.map(stop => stop.id === id ? { ...stop, has_boarded: true, boarding_status: status } : stop));
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-indigo-50"><div className="text-xl font-bold text-indigo-600 animate-pulse flex items-center"><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Loading route...</div></div>;
  if (error) return <div className="min-h-screen bg-indigo-50 p-4 flex items-center justify-center"><div className="p-8 text-center bg-white rounded-3xl shadow-xl max-w-md"><div className="text-red-500 mb-4"><svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div><h3 className="text-xl font-bold text-gray-900 mb-2">Access Issue</h3><p className="text-gray-600 mb-6">{error}</p><button onClick={handleLogout} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all">Logout & Retry</button></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      
      {/* --- VIBRANT HEADER --- */}
      <div className="sticky top-0 z-20 shadow-xl bg-gradient-to-r from-indigo-600 to-blue-500">
        <div className="max-w-3xl mx-auto">
            
           {/* Row 1: Nav Bar */}
           <nav className="px-4 py-4 flex justify-between items-center">
             <div className="flex items-center space-x-3">
               <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                 <SteeringWheelIcon />
               </div>
               <div>
                 <h1 className="font-black text-xl text-white tracking-tight leading-none">DRIVER</h1>
                 <span className="text-indigo-100 text-xs font-medium tracking-wider opacity-80">DASHBOARD</span>
               </div>
             </div>
             <button
               onClick={handleLogout}
               className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all backdrop-blur-md flex items-center"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
               Logout
             </button>
           </nav>

           {/* Row 2: Route Title */}
           <div className="px-6 pb-6 pt-2 text-white">
              <span className="text-indigo-200 font-bold text-xs uppercase tracking-wider">Current Assignment</span>
              <h2 className="text-3xl font-extrabold mt-1">{route.route_name}</h2>
              <div className="flex items-center mt-2 text-indigo-100 text-sm font-medium">
                 <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-bold mr-2 flex items-center">
                   <span className="w-2 h-2 bg-green-400 rounded-full mr-1.5 animate-pulse"></span>
                   Active
                 </span>
                 {stops.filter(s => s.is_boarding_today && !s.has_boarded).length} stops remaining
              </div>
           </div>

           {/* Row 3: Integrated Tracker */}
           <div className="bg-indigo-800/30 p-3 backdrop-blur-md border-t border-white/10">
             <DriverLocationTracker />
           </div>
        </div>
      </div>

      {/* --- BRIGHT MAIN CONTENT --- */}
      <div className="max-w-3xl mx-auto p-4 mt-6">
        <DragDropContext onDragEnd={handleOnDragEnd}>
          <Droppable droppableId="stops">
            {(provided) => (
              <ul {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                {stops.map((stop, index) => {
                  const isSkipped = !stop.is_boarding_today;
                  const hasBoarded = stop.has_boarded;
                  
                  // Modern, lighter card styles
                  let cardStyles = "bg-white border-indigo-500 shadow-sm hover:shadow-md";
                  let textMain = "text-gray-900";
                  let textSub = "text-gray-500";
                  
                  if (hasBoarded) {
                    cardStyles = "bg-gray-50 border-gray-300 opacity-60 shadow-none";
                    textMain = "text-gray-400 line-through";
                    textSub = "text-gray-400";
                  } else if (isSkipped) {
                     cardStyles = "bg-red-50 border-red-300";
                     textMain = "text-gray-700";
                  }

                  return (
                    <Draggable key={stop.id} draggableId={String(stop.id)} index={index}>
                      {(provided) => (
                        <li ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                            className={`p-5 rounded-2xl flex justify-between items-center transition-all border-l-[6px] ${cardStyles}`}>
                          
                          <div className="flex items-center overflow-hidden">
                             {/* Stop Number Bubble */}
                            <div className={`mr-5 flex-shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center ${hasBoarded ? 'bg-gray-100' : 'bg-indigo-50'}`}>
                              <span className={`text-[10px] font-bold uppercase ${hasBoarded ? 'text-gray-400' : 'text-indigo-400'}`}>Stop</span>
                              <span className={`text-xl font-black ${hasBoarded ? 'text-gray-400' : 'text-indigo-700'}`}>{index + 1}</span>
                            </div>
                            
                            {/* Student Details */}
                            <div className="truncate">
                              <div className="flex items-center">
                                <strong className={`text-lg truncate ${textMain}`}>
                                  {stop.username}
                                </strong>
                                {isSkipped && <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 text-[10px] font-extrabold rounded-md uppercase tracking-wider">Skipped</span>}
                              </div>
                              <p className={`text-sm truncate mt-0.5 ${textSub}`}>{stop.address}</p>
                              
                              {!hasBoarded && !isSkipped && (
                                <div className="mt-2 flex items-center text-indigo-600 text-xs font-bold bg-indigo-50 px-3 py-1.5 rounded-lg self-start inline-flex">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                                  {formatDuration(stop.driving_time_seconds)} est. travel time
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Action Buttons (Big touch targets) */}
                          {!isSkipped && !hasBoarded && (
                            <div className="flex space-x-3 ml-4 flex-shrink-0">
                              <button onClick={() => updateStopStatus(stop.id, 'missed')} className="group bg-red-50 hover:bg-red-100 p-4 rounded-2xl transition-all active:scale-95 border-2 border-red-100 hover:border-red-200" title="Mark Missed">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500 group-hover:text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                              <button onClick={() => updateStopStatus(stop.id, 'boarded')} className="group bg-emerald-50 hover:bg-emerald-100 p-4 rounded-2xl transition-all active:scale-95 border-2 border-emerald-100 hover:border-emerald-200" title="Mark Boarded">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-500 group-hover:text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              </button>
                            </div>
                          )}
                        </li>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}

export default DriverDashboard;