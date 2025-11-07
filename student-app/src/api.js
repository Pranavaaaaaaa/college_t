// src/api.js
import axios from 'axios';

// Create a new axios instance
const apiClient = axios.create({
 baseURL: process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:8000/api' // Base URL for all API calls
});

// --- THIS IS THE FIX ---
// This code runs ONCE, immediately when the app loads.
const token = localStorage.getItem('access_token');
if (token) {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// We also create a helper function to easily set/remove the token
// on login and logout.
export const setAuthToken = (token) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('access_token', token);
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
    localStorage.removeItem('access_token');
  }
};

export default apiClient;