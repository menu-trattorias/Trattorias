import React, { useState, useEffect, useRef } from 'react';
import { Menu } from 'lucide-react';

export const Header = ({ onOpenNav, settings }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef(null);
  const banners = settings?.banners || [];

  // Auto-scroll banners
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [banners.length]);

  // Scroll carousel container when currentSlide changes
  useEffect(() => {
    if (carouselRef.current) {
      const scrollWidth = carouselRef.current.offsetWidth;
      carouselRef.current.scrollTo({
        left: currentSlide * scrollWidth,
        behavior: 'smooth'
      });
    }
  }, [currentSlide]);

  const handleScroll = () => {
    if (carouselRef.current) {
      const scrollLeft = carouselRef.current.scrollLeft;
      const width = carouselRef.current.offsetWidth;
      const newIndex = Math.round(scrollLeft / width);
      if (newIndex !== currentSlide && newIndex >= 0 && newIndex < banners.length) {
        setCurrentSlide(newIndex);
      }
    }
  };

  return (
    <header className="hero-header" itemScope itemType="https://schema.org/Restaurant">
      <div className="top-nav">
        <button className="icon-btn" onClick={onOpenNav} aria-label="Open Navigation Menu">
          <Menu size={22} />
        </button>
        <div className="logo">
          <h1 className="cafe-name" itemProp="name">{settings?.restaurant_name || 'Trattorias Restaurant'}</h1>
        </div>
        <div style={{ width: '40px' }}></div> {/* Spacer for flex alignment */}
      </div>

      <div className="hero-content">
        {banners.length > 0 ? (
          <>
            <div className="banner-carousel" ref={carouselRef} onScroll={handleScroll}>
              {banners.map((banner, index) => (
                <img
                  key={banner.id || index}
                  src={banner.url}
                  alt={banner.alt || `Trattorias Restaurant Cliffside Dining Varkala Banner ${index + 1}`}
                  className="banner-image"
                  loading={index === 0 ? 'eager' : 'lazy'}
                  fetchPriority={index === 0 ? 'high' : 'auto'}
                  itemProp="image"
                />
              ))}
            </div>

            {banners.length > 1 && (
              <div className="carousel-dots">
                {banners.map((_, index) => (
                  <div
                    key={index}
                    className={`dot ${currentSlide === index ? 'active' : ''}`}
                    onClick={() => setCurrentSlide(index)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              width: '100%',
              minHeight: '130px',
              padding: '24px 20px',
              boxSizing: 'border-box',
              background: 'linear-gradient(145deg, #16391B 0%, #2D6A4F 100%)',
              color: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.02em', marginBottom: '4px' }}>
              {settings?.restaurant_name || 'Trattorias Restaurant'}
            </div>
            <div style={{ fontSize: '12.5px', opacity: 0.88, maxWidth: '320px' }}>
              {settings?.tagline || 'Cliffside Dining & Sea-Facing Rooftop in Varkala'}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
