import React, { useState, useEffect } from 'react';
import apiClient, { setAuthToken } from '../api';
import { useNavigate, Link } from 'react-router-dom';

// --- INSERTING CUSTOM CSS FOR ANIMATIONS ---
const animatedBackgroundStyle = {
  background: 'linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)',
  backgroundSize: '400% 400%',
  animation: 'gradient 15s ease infinite',
  height: '100vh',
  width: '100vw',
  position: 'fixed',
  top: 0,
  left: 0,
  zIndex: -1,
};

const keyframesStyle = `
  @keyframes gradient {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in-up {
    animation: fadeInUp 0.6s ease-out forwards;
  }
`;

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('non-admin');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setAuthToken(null);
    localStorage.removeItem('refresh_token');
  }, []);

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setRole(newRole);
    if (newRole === 'admin') {
      window.location.href = 'http://127.0.0.1:8000/admin/login/';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      const tokenResponse = await apiClient.post('/token/', { username, password });
      const tempToken = tokenResponse.data.access;
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${tempToken}`;

      let userRole = 'unknown';
      try {
        const roleResponse = await apiClient.get('/drivers/check-role/');
        userRole = roleResponse.data.role;
      } catch (roleError) {
        throw new Error("Could not verify user role.");
      }

      if (userRole === 'student') {
        try {
          await apiClient.post('/students/reset-notification-status/');
        } catch (resetErr) {
          console.error("Could not reset notification status", resetErr);
        }
      }

      if (userRole === 'student' || userRole === 'driver') {
        setAuthToken(tempToken);
        localStorage.setItem('refresh_token', tokenResponse.data.refresh);
        // Slight delay to allow exit animation if we had one, but instant is fine here
        navigate(userRole === 'student' ? '/' : '/driver/dashboard');
      } else {
         throw new Error("Invalid role for this login type.");
      }
    } catch (err) {
      delete apiClient.defaults.headers.common['Authorization'];
      setError('Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{keyframesStyle}</style>
      <div style={animatedBackgroundStyle} />
      
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-fade-in-up bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/50">
          <div className="text-center mb-8">
            <img 
              src="https://i0.wp.com/sjbit.edu.in/wp-content/uploads/2021/06/cropped-sjbit-new-logo.png?ssl=1" 
              alt="SJBIT Logo" 
              className="h-24 mx-auto mb-6 object-contain"
            />
            <h2 className="text-3xl font-extrabold text-gray-900">Welcome Back</h2>
            <p className="text-gray-600 mt-2 font-medium">Sign in to continue</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-md animate-pulse">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Login As</label>
              <div className="relative">
                <select 
                  value={role} 
                  onChange={handleRoleChange} 
                  className="appearance-none block w-full px-4 py-3.5 rounded-xl border-0 bg-gray-100/80 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-semibold text-gray-700 transition-all cursor-pointer"
                >
                  <option value="non-admin">Student / Driver</option>
                  <option value="admin">Administrator</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="block w-full px-4 py-3.5 rounded-xl border-0 bg-gray-100/80 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder-gray-400 font-medium"
                placeholder="Username"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="block w-full px-4 py-3.5 rounded-xl border-0 bg-gray-100/80 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder-gray-400 font-medium"
                placeholder="Password"
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-indigo-500/30 active:scale-[0.98]"
            >
              {isLoading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-8 text-center text-gray-600">
            New here?{' '}
            <Link to="/signup" className="font-extrabold text-indigo-600 hover:text-indigo-500 transition-colors">
              Create an Account
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

export default LoginPage;