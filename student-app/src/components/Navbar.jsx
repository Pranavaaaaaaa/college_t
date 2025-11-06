import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import NotificationBell from './NotificationBell.jsx';
// We assume your setAuthToken function is in 'api.js'
// Adjust the path if necessary (e.g., '../api')
import { setAuthToken } from '../api'; 

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // 1. Clear the token from axios
    setAuthToken(null);
    // 2. Clear tokens from localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    // 3. Redirect to login
    navigate('/login');
  };

  return (
    <nav className="bg-gray-800 text-white shadow-md">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <Link to="/" className="text-xl font-bold hover:text-gray-300">
            College Transport
          </Link>

          {/* Right-side icons */}
          <div className="flex items-center">
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="ml-4 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;