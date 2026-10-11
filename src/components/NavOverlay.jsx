import React from 'react';
import { X, Utensils, Info } from 'lucide-react';

export const NavOverlay = ({ isOpen, onClose, currentTab, onSelectTab, settings }) => {
  return (
    <div className={`nav-menu-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}>
      <div className="nav-menu-content" onClick={(e) => e.stopPropagation()}>
        <div className="nav-menu-header">
          <h2 className="cafe-name">{settings?.restaurant_name || 'Trattorias Restaurant'}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close Navigation">
            <X size={22} />
          </button>
        </div>
        <ul className="nav-menu-links">
          <li>
            <a
              href="#main"
              className={`nav-link ${currentTab === 'main' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                onSelectTab('main');
                onClose();
              }}
            >
              <Utensils size={18} style={{ marginRight: '10px', display: 'inline' }} />
              Main Menu
            </a>
          </li>
          <li>
            <a
              href="#about"
              className={`nav-link ${currentTab === 'about' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                onSelectTab('about');
                onClose();
              }}
            >
              <Info size={18} style={{ marginRight: '10px', display: 'inline' }} />
              About Us
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default NavOverlay;
