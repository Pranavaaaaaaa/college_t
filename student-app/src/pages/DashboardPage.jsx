import React, { useState, useEffect } from 'react';
import apiClient from '../api.js';
import BusMap from '../components/BusMap.jsx';
import ProfileSetup from '../components/ProfileSetup.jsx'; 
import { useNotifications } from '../context/NotificationContext.jsx';

function DashboardPage() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isBoarding, setIsBoarding] = useState(false);
  const { addNotification } = useNotifications();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiClient.get('/students/profile/');
        setProfile(response.data);
        setIsBoarding(response.data.is_boarding_today);
      } catch (err) {
        setError('Failed to load profile data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleToggleBoarding = async () => {
    const newStatus = !isBoarding;
    setIsBoarding(newStatus);
    try {
      await apiClient.post('/students/check-in/', { is_boarding: newStatus });
      addNotification({
        title: newStatus ? "Checked In" : "Checked Out",
        body: newStatus ? "Driver will be notified to pick you up." : "You are marked as not riding today.",
        type: newStatus ? 'success' : 'info'
      });
    } catch (err) {
      setIsBoarding(!newStatus);
      addNotification({ title: "Error", body: "Could not update status. Try again.", type: 'error' });
    }
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-12 w-12 bg-indigo-200 rounded-full mb-4"></div>
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
      </div>
    </div>
  );

  if (error) return <div className="p-8 text-center text-red-600 bg-red-50 mx-4 mt-8 rounded-xl border border-red-200">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header / Status Card */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">
                Hello, <span className="text-indigo-600">{profile?.username}</span>
              </h1>
              <p className="text-gray-500 mt-1">Track your bus and manage your ride status.</p>
            </div>

            {profile?.address && (
               <div className={`mt-4 md:mt-0 flex items-center p-4 rounded-2xl border-2 transition-all ${isBoarding ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-100 border-gray-200'}`}>
                <div className="mr-4">
                  <span className="block text-sm font-bold text-gray-500 uppercase tracking-wide">Riding Today?</span>
                  <span className={`block font-bold ${isBoarding ? 'text-emerald-700' : 'text-gray-700'}`}>
                    {isBoarding ? 'YES, Pick me up' : 'NO, I am skipping'}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isBoarding} onChange={handleToggleBoarding} />
                  <div className="w-14 h-8 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {profile && profile.address ? (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 h-[600px]">
            <BusMap />
          </div>
        ) : (
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Complete Your Profile</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">We need to know where you live to assign you a bus route. Please set your location below.</p>
            <ProfileSetup onProfileUpdated={setProfile} />
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;