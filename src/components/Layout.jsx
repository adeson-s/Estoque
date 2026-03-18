import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import BottomNav from './BottomNav';

export default function Layout() {
  const location = useLocation();

  return (
    <>
      <Sidebar />
      <MobileHeader pathname={location.pathname} />
      <div className="main-content">
        <Outlet />
      </div>
      <BottomNav />
    </>
  );
}
