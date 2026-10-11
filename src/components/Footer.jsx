import React from 'react';

export const Footer = ({ settings }) => {
  return (
    <footer className="app-footer">
      <h3>{settings?.restaurant_name || 'Trattorias Restaurant'}</h3>
      <p>{settings?.tagline || 'Eclectic dining with sea-facing rooftop & sunset views.'}</p>

      <div className="footer-bottom">
        &copy; {new Date().getFullYear()} {settings?.restaurant_name || 'Trattorias Restaurant'}. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
