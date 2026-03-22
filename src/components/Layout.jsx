import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import BottomNav from './BottomNav';

export default function Layout() {
  const { pathname } = useLocation();

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .sidebar {
            display: none !important;
          }
          .mobile-header {
            display: flex !important;
          }
          .layout-main {
            margin-left: 0 !important;
            width: 100vw !important;
          }
        }

        @media (min-width: 769px) {
          .mobile-header {
            display: none !important;
          }
        }

        .mobile-header {
          display: none;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #1a2e28;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        }

        .mobile-header-logo img {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          object-fit: cover;
        }

        .mobile-header-center h1 {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          color: #fff;
          font-family: 'Sora', sans-serif;
          letter-spacing: 0.2px;
        }

        .mobile-header-action {
          background: rgba(255,255,255,0.08);
          border: none;
          border-radius: 8px;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6ee7b7;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.18s;
        }

        .mobile-header-action:active {
          background: rgba(255,255,255,0.15);
        }
      `}</style>

      {/* Aparece só no mobile */}
      <MobileHeader pathname={pathname} />

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Some no mobile via CSS */}
        <Sidebar />

        <main
          className="layout-main"
          style={{
            marginLeft: '190px',
            width: 'calc(100vw - 190px)',
            minHeight: '100vh',
            overflowY: 'auto',
            background: '#f4f6f8',
          }}
        >
          <Outlet />

          <BottomNav />
        </main>
      </div>
    </>
  );
}