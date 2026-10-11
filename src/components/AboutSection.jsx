import React from 'react';
import {
  Utensils,
  Clock,
  PhoneCall,
  MapPin
} from 'lucide-react';

const InstagramIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export const AboutSection = ({ settings }) => {
  const s = settings || {};

  return (
    <section
      id="about-view"
      aria-label="About Trattorias Restaurant"
      style={{
        padding: '20px 0',
        minHeight: 'calc(100vh - 200px)',
        paddingBottom: '80px',
        position: 'relative',
        borderTopLeftRadius: '32px',
        borderTopRightRadius: '32px'
      }}
    >
      {/* Background Circles */}
      <div className="bg-circle bg-circle-1"></div>
      <div className="bg-circle bg-circle-2"></div>
      <div className="bg-circle bg-circle-3"></div>

      <header className="about-header-fresh">
        <h2>About {s.restaurant_name ? s.restaurant_name.replace(/Restaurant/i, '').trim() || s.restaurant_name : 'Trattorias'}</h2>
        <p>{s.tagline || 'Cliffside Dining & Sea-Facing Rooftop in Varkala'}</p>
      </header>

      <div className="bento-grid">
        {/* Story */}
        <div className="bento-card-fresh bento-full-fresh">
          <div className="bento-title-fresh">
            <div className="bento-icon-wrap">
              <Utensils size={18} />
            </div>
            <span className="bento-title-text">Cliffside Dining Story</span>
          </div>
          <div className="bento-story-fresh">
            <p>{s.story_p1 || 'Trattorias Restaurant is a popular cliffside dining spot located at Black Beach, North End Cliff, Varkala in the Thiruvananthapuram (TVM) district.'}</p>
            <p>{s.story_p2 || 'Perched above the Arabian Sea, Trattorias offers rooftop and outdoor seating with panoramic ocean and sunset views, a casual and romantic atmosphere, and complimentary Wi-Fi. Our kitchen serves an eclectic selection spanning International, Italian, Thai, Chinese, and Indian cuisine — celebrated for oriental flavors and breakfast favorites.'}</p>
          </div>
        </div>

        {/* Timings */}
        <div className="bento-card-fresh bento-full-fresh" style={{ padding: '24px 28px' }}>
          <div className="bento-title-fresh" style={{ marginBottom: '12px' }}>
            <div className="bento-icon-wrap" style={{ width: '36px', height: '36px' }}>
              <Clock size={18} />
            </div>
            <span className="bento-title-text" style={{ fontSize: '14px' }}>
              Opening Hours
            </span>
          </div>
          <div className="timing-row">
            <span className="timing-day">Monday – Sunday</span>
            <span className="timing-hours">{s.opening_hours || '8:30 AM – 10:30 PM'}</span>
          </div>
        </div>

        {/* Call */}
        <a
          href={`tel:${s.phone_raw || (s.phone ? s.phone.replace(/[^0-9+]/g, '') : '+919746968992')}`}
          className="bento-card-fresh bento-half-fresh"
          style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <div className="action-icon-fresh">
            <PhoneCall size={20} />
          </div>
          <div className="action-title">Call Us</div>
          <div className="action-sub">{s.phone || '+91 97469 68992'}</div>
        </a>

        {/* Instagram */}
        <a
          href={s.instagram_url || 'https://www.instagram.com/trattorias_restaurant/'}
          target="_blank"
          rel="noopener noreferrer"
          className="bento-card-fresh bento-half-fresh"
          style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <div className="action-icon-fresh">
            <InstagramIcon size={20} color="#fff" />
          </div>
          <div className="action-title">Instagram</div>
          <div className="action-sub">{s.instagram_handle || '@trattorias_restaurant'}</div>
        </a>

        {/* Map */}
        <div className="bento-card-fresh bento-full-fresh map-card-fresh">
          <iframe
            src={s.map_embed_url || "https://maps.google.com/maps?q=8.7422895,76.6989773&t=&z=16&ie=UTF8&iwloc=&output=embed"}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Trattorias Restaurant Location Map at Black Beach, North End Cliff, Varkala"
          ></iframe>
          <div className="map-overlay-fresh" style={{ fontSize: '12px', whiteSpace: 'normal', textAlign: 'center' }}>
            <MapPin size={16} style={{ flexShrink: 0 }} />
            {s.location_address || 'Black Beach, North End Cliff, Varkala, Thiruvananthapuram, Kerala 695141'}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
