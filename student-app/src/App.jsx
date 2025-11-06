import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { NotificationProvider } from './context/NotificationContext.jsx';

// Page Imports
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import PaymentPage from './pages/PaymentPage.jsx';
import ReceiptPage from './pages/ReceiptPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import DriverDashboard from './pages/DriverDashboard.jsx';

// Component Imports
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ProtectedLayout from './components/ProtectedLayout.jsx';

function App() {
  return (
    <NotificationProvider>
      <Routes>
        {/* Public routes (no navbar) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/receipt" element={<ReceiptPage />} />

        {/* --- ROUTING LOGIC UPDATED --- */}

        {/* 1. Student Protected Routes */}
        {/* These routes are protected AND use the main layout with the bell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<DashboardPage />} />
            {/* You could add other student-only routes here, like: */}
            {/* <Route path="/student/profile" element={<StudentProfilePage />} /> */}
          </Route>
        </Route>

        {/* 2. Driver Protected Routes */}
        {/* These routes are protected but DO NOT use the main layout */}
        <Route element={<ProtectedRoute />}>
          <Route 
            path="/driver/dashboard" 
            element={<DriverDashboard />} 
          />
          {/* You could add other driver-only routes here */}
        </Route>

      </Routes>
    </NotificationProvider>
  );
}

export default App;