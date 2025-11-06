import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  // Check for the access token in local storage
  const token = localStorage.getItem('access_token');

  // If the token exists, show the child component (the Dashboard)
  // Otherwise, redirect to the /login page
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;