import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';

/**
 * This component acts as the "frame" for your protected pages.
 * It renders the Navbar, and then renders the specific
 * page (e.g., DashboardPage) where the <Outlet /> is.
 */
function ProtectedLayout() {
  return (
    <div>
      <Navbar />
      <main>
        {/* <Outlet /> is the placeholder for your routed pages */}
        <Outlet />
      </main>
    </div>
  );
}

export default ProtectedLayout;