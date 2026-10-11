import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Menu } from 'lucide-react';

export const Header = ({ onOpenNav, settings }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef(null);
  const banners = settings?.banners || [];

  // Track latest currentSlide in a ref to avoid stale state in timers
  const currentSlideRef = useRef(0);
  currentSlideRef.current = currentSlide;

  // Flags and timers to manage smooth transitions and prevent fighting between auto-scroll and onScroll
  const isProgrammaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef(null);
  const scrollDebounceTimerRef = useRef(null);
  const isInteractingRef = useRef(false);
  const autoScrollTimerRef = useRef(null);

  // Smoothly scroll to target slide
  const scrollToSlide = useCallback((index, behavior = 'smooth') => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    
    // Calculate exact target left position using the child offset or client width
    const targetChild = container.children[index];
    const targetLeft = targetChild ? targetChild.offsetLeft : index * (container.clientWidth || 0);

    // Block handleScroll from fighting the programmatic smooth scroll
    isProgrammaticScrollRef.current = true;
    if (programmaticScrollTimerRef.current) {
      clearTimeout(programmaticScrollTimerRef.current);
    }
    programmaticScrollTimerRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 650);

    setCurrentSlide(index);
    container.scrollTo({
      left: targetLeft,
      behavior
    });
  }, []);

  // Start / restart the auto-scroll interval
  const startAutoScroll = useCallback(() => {
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
    }
    if (banners.length <= 1) return;

    autoScrollTimerRef.current = setInterval(() => {
      if (isInteractingRef.current) return;
      const nextSlide = (currentSlideRef.current + 1) % banners.length;
      scrollToSlide(nextSlide, 'smooth');
    }, 3500);
  }, [banners.length, scrollToSlide]);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
  }, []);

  // Handle banner list changes and initialize auto-scroll
  useEffect(() => {
    if (banners.length > 1) {
      startAutoScroll();
    } else {
      stopAutoScroll();
    }
    return () => stopAutoScroll();
  }, [banners.length, startAutoScroll, stopAutoScroll]);

  // Handle tab visibility (pause when backgrounded, resume when active)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAutoScroll();
      } else if (banners.length > 1) {
        startAutoScroll();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [banners.length, startAutoScroll, stopAutoScroll]);

  // Keep carousel aligned on window resize
  useEffect(() => {
    const handleResize = () => {
      if (carouselRef.current) {
        const container = carouselRef.current;
        const targetChild = container.children[currentSlideRef.current];
        const targetLeft = targetChild ? targetChild.offsetLeft : currentSlideRef.current * (container.clientWidth || 0);
        container.scrollTo({
          left: targetLeft,
          behavior: 'auto'
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (programmaticScrollTimerRef.current) clearTimeout(programmaticScrollTimerRef.current);
      if (scrollDebounceTimerRef.current) clearTimeout(scrollDebounceTimerRef.current);
      if (autoScrollTimerRef.current) clearInterval(autoScrollTimerRef.current);
    };
  }, []);

  // User manual scroll / swipe handler
  const handleScroll = () => {
    // If the scroll was triggered programmatically (auto-scroll or dot click), do NOT override state
    if (isProgrammaticScrollRef.current) return;

    if (scrollDebounceTimerRef.current) {
      clearTimeout(scrollDebounceTimerRef.current);
    }

    // Debounce to wait until scroll settles / snaps
    scrollDebounceTimerRef.current = setTimeout(() => {
      if (!carouselRef.current || isProgrammaticScrollRef.current) return;
      const container = carouselRef.current;
      const width = container.clientWidth;
      if (width > 0) {
        const newIndex = Math.round(container.scrollLeft / width);
        if (newIndex >= 0 && newIndex < banners.length && newIndex !== currentSlideRef.current) {
          setCurrentSlide(newIndex);
        }
      }
    }, 100);
  };

  // Dot click handler
  const handleDotClick = (index) => {
    scrollToSlide(index, 'smooth');
    // Restart interval from this slide
    startAutoScroll();
  };

  // Interaction handlers (pause auto-scroll when user touches or hovers)
  const handleTouchStart = () => {
    isInteractingRef.current = true;
    stopAutoScroll();
  };

  const handleTouchEnd = () => {
    isInteractingRef.current = false;
    startAutoScroll();
  };

  const handleMouseEnter = () => {
    isInteractingRef.current = true;
  };

  const handleMouseLeave = () => {
    isInteractingRef.current = false;
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
            <div
              className="banner-carousel"
              ref={carouselRef}
              onScroll={handleScroll}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
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
                  <button
                    key={index}
                    type="button"
                    className={`dot ${currentSlide === index ? 'active' : ''}`}
                    onClick={() => handleDotClick(index)}
                    aria-label={`Go to banner slide ${index + 1}`}
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
