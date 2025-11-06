import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient, { setAuthToken } from '../api';
import LocationPicker from '../components/LocationPicker';

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
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(50px); }
    to { opacity: 1; transform: translateX(0); }
  }
  .animate-slide-in {
    animation: slideInRight 0.5s ease-out forwards;
  }
`;

const FormInput = ({ label, type, value, onChange, required = true, autoComplete = "off", placeholder = "" }) => (
  <div>
    <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={onChange} 
      required={required}
      autoComplete={autoComplete}
      placeholder={placeholder}
      className="block w-full px-4 py-3.5 rounded-xl border-0 bg-gray-100/80 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
    />
  </div>
);

function SignupPage() {
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  
  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState('');
  const [map, setMap] = useState(null);
  const defaultCenter = [12.9716, 77.5946];

  const handleFinalSubmit = async () => {
    if (!position || !address || address.includes('Loading') || address.includes('Could not find')) {
      setError("Please select a valid location on the map.");
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      await apiClient.post('/students/signup/', { username, email, password, student_id: studentId });
      const tokenResponse = await apiClient.post('/token/', { username, password });
      setAuthToken(tokenResponse.data.access);
      localStorage.setItem('refresh_token', tokenResponse.data.refresh);
      await apiClient.put('/students/profile/', { latitude: position.lat, longitude: position.lng, address: address });
      navigate('/payment');
    } catch (err) {
      if (err.response && err.response.data) {
        const errors = err.response.data;
        setError(typeof errors === 'object' ? Object.entries(errors).map(([key, v]) => `${key}: ${v.join(', ')}`).join('; ') : JSON.stringify(errors));
      } else {
        setError('Connection error during signup.');
      }
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{keyframesStyle}</style>
      {step === 1 && <div style={animatedBackgroundStyle} />}
      
      <div className="min-h-screen flex flex-col">
        {step === 1 ? (
          <div className="flex-grow flex items-center justify-center p-4">
            <div className="animate-slide-in bg-white/95 backdrop-blur-md p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-lg border border-white/50">
              <div className="mb-6">
                <h2 className="text-3xl font-extrabold text-gray-900">Create Account</h2>
                <p className="text-indigo-600 font-bold">Step 1 of 2: Personal Details</p>
              </div>

              {error && <div className="mb-6 p-3 bg-red-100 text-red-700 rounded-xl text-sm font-medium">{error}</div>}

              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setStep(2); setError(null); }}>
                <FormInput label="Username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="johndoe" />
                <FormInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="john@college.edu" />
                <FormInput label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="••••••••" />
                <FormInput label="Student ID" type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="STU-12345" />
                
                <button type="submit" className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold rounded-xl transition-all shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center">
                  Next: Set Location →
                </button>
              </form>

              <p className="mt-8 text-center text-gray-600">
                Already have an account? <Link to="/login" className="font-extrabold text-indigo-600">Log in</Link>
              </p>
            </div>
          </div>
        ) : (
          <div className="h-screen w-screen relative bg-gray-100 overflow-hidden animate-fade-in-up">
            {/* Full Screen Map */}
            <div className="absolute inset-0 z-0">
              <LocationPicker 
                position={position} 
                setPosition={setPosition} 
                setAddress={setAddress} 
                map={map}
                setMap={setMap}
                defaultCenter={defaultCenter}
              />
            </div>

            {/* Consolidated Bottom Panel */}
            <div className="absolute bottom-0 left-0 right-0 z-10 p-4 pointer-events-none flex justify-center">
              <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] w-full max-w-2xl pointer-events-auto space-y-4 border border-white/50">
                
                {/* Integrated Header */}
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xl font-extrabold text-gray-900">Where should we pick you up?</h2>
                  <span className="bg-indigo-100 text-indigo-800 text-xs font-extrabold px-3 py-1 rounded-full">STEP 2/2</span>
                </div>

                {error && <div className="p-3 bg-red-100 text-red-700 rounded-xl text-sm font-bold text-center">{error}</div>}
                
                <div className={`p-4 rounded-2xl text-sm font-medium flex items-center transition-all ${address && !address.includes('Could not') ? 'bg-indigo-50 text-indigo-900 border-2 border-indigo-100' : 'bg-gray-100 text-gray-500 border-2 border-transparent'}`}>
                   <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 mr-3 flex-shrink-0 ${address && !address.includes('Could not') ? 'text-indigo-600' : 'text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                   </svg>
                   <span className="truncate">{address || "Search or drag the pin to your location..."}</span>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button 
                    onClick={() => setStep(1)} 
                    className="px-6 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleFinalSubmit} 
                    disabled={isLoading || !position || address.includes('Loading')} 
                    className="flex-grow py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-indigo-500/30"
                  >
                    {isLoading ? 'Finishing up...' : 'Confirm Location'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default SignupPage;