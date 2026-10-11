import React, { useState } from 'react';
import {
  Utensils,
  FolderTree,
  Sliders,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

export const AdminSidebar = ({
  activeTab,
  setActiveTab,
  menuCount = 0,
  categoryCount = 0,
  user,
  onLogout,
  isMobileOpen,
  setIsMobileOpen
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    {
      id: 'menu',
      label: 'Dishes & Menu',
      icon: Utensils,
      count: menuCount
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: FolderTree,
      count: categoryCount
    },
    {
      id: 'settings',
      label: 'Info & Banners',
      icon: Sliders
    }
  ];

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    if (setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="admin-mobile-backdrop"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close sidebar overlay"
        />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="admin-sidebar-brand">
          <div className="admin-brand-content">
            <h2 className="admin-brand-title">Trattorias</h2>
            <span className="admin-brand-sub">Admin Portal</span>
          </div>

          {/* Desktop Collapse / Expand Toggle */}
          <button
            type="button"
            className="admin-collapse-toggle admin-desktop-only"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight size={13} strokeWidth={2.5} />
            ) : (
              <ChevronLeft size={13} strokeWidth={2.5} />
            )}
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            className="admin-mobile-close-btn"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close sidebar"
            title="Close menu"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="admin-sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={`admin-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
                title={item.label}
              >
                <div className="admin-nav-item-left">
                  <div className="admin-nav-icon">
                    <Icon size={18} strokeWidth={2} />
                  </div>
                  {(!isCollapsed || isMobileOpen) && <span className="admin-nav-label">{item.label}</span>}
                </div>

                {(!isCollapsed || isMobileOpen) && item.count !== undefined && item.count > 0 && (
                  <span className="admin-nav-badge">{item.count}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Footer / Log out */}
        <div className="admin-sidebar-footer">
          <button
            type="button"
            onClick={() => {
              if (setIsMobileOpen) setIsMobileOpen(false);
              onLogout();
            }}
            className="admin-logout-link"
            title="Log out"
          >
            <div className="admin-nav-icon">
              <LogOut size={18} strokeWidth={2} />
            </div>
            {(!isCollapsed || isMobileOpen) && <span>Log out</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;

