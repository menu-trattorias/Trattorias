import React, { useState, useEffect, useMemo, useRef } from 'react';
import Header from '../components/Header';
import NavOverlay from '../components/NavOverlay';
import SearchBar from '../components/SearchBar';
import CategoryChips from '../components/CategoryChips';
import MenuSection from '../components/MenuSection';
import FoodModal from '../components/FoodModal';
import AboutSection from '../components/AboutSection';
import Footer from '../components/Footer';
import { DataService } from '../lib/supabase';
import { filterMenuItems } from '../lib/search';
import { INITIAL_SETTINGS } from '../data/initialSettings';
import { SearchX, Star, ArrowUp, ExternalLink } from 'lucide-react';

export const PublicMenu = () => {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('main'); // 'main' | 'about'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('main-view');
  const [selectedFoodItem, setSelectedFoodItem] = useState(null);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const scrollContainerRef = useRef(null);
  const isManualScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await DataService.getInitialData();
        setCategories(data.categories || []);
        setMenuItems(data.menuItems || []);
        setSettings(data.settings || INITIAL_SETTINGS);
      } catch (err) {
        console.error('Failed to load menu data:', err);
        setSettings(INITIAL_SETTINGS);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Sync document title for dynamic SPA SEO
  useEffect(() => {
    const currentSettings = settings || INITIAL_SETTINGS;
    const restaurantName = currentSettings.restaurant_name || 'Trattorias Restaurant';

    if (activeTab === 'about') {
      document.title = `About Us | ${restaurantName} - Cliffside Dining in Varkala`;
    } else if (searchQuery.trim()) {
      document.title = `Search "${searchQuery}" | ${restaurantName} Menu Varkala`;
    } else {
      document.title = `${restaurantName} Varkala | Cliffside Dining & Menu | Black Beach`;
    }
  }, [activeTab, searchQuery, settings]);

  const activeSettings = settings || INITIAL_SETTINGS;
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Filter menu items by search query (product name, category name, price, variants, etc.)
  const filteredItems = useMemo(() => {
    return filterMenuItems(menuItems, categoryMap, searchQuery);
  }, [menuItems, categoryMap, searchQuery]);

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const grouped = {};
    filteredItems.forEach((item) => {
      const catId = item.categoryId || 'other';
      if (!grouped[catId]) {
        grouped[catId] = [];
      }
      grouped[catId].push(item);
    });
    return grouped;
  }, [filteredItems]);

  // Handle scroll for Back-to-Top, Sticky Nav shadow, and Category ScrollSpy
  useEffect(() => {
    const container = scrollContainerRef.current;
    const target = container || window;

    const handleScroll = () => {
      const scrollPos = container ? container.scrollTop : window.scrollY;
      setShowScrollTop(scrollPos > 400);

      // Sticky nav styling
      const stickyNav = document.getElementById('sticky-nav');
      if (stickyNav) {
        if (scrollPos > 120) {
          stickyNav.classList.add('is-stuck');
        } else {
          stickyNav.classList.remove('is-stuck');
        }
      }

      // ScrollSpy for Active Category
      if (isManualScrollingRef.current || activeTab !== 'main' || searchQuery.trim()) {
        return;
      }

      if (scrollPos < 150) {
        setActiveCategory('main-view');
        return;
      }

      const navHeight = stickyNav?.offsetHeight || 130;
      const visibleCategories = categories.filter(
        (cat) => cat.id !== 'main-view' && itemsByCategory[cat.id]?.length > 0
      );

      let currentCat = 'main-view';
      const containerTop = container ? container.getBoundingClientRect().top : 0;

      for (let i = 0; i < visibleCategories.length; i++) {
        const cat = visibleCategories[i];
        const sectionEl = document.getElementById(cat.id);
        if (sectionEl) {
          const rect = sectionEl.getBoundingClientRect();
          const topRelativeToContainer = rect.top - containerTop;
          if (topRelativeToContainer <= navHeight + 40) {
            currentCat = cat.id;
          } else {
            break;
          }
        }
      }

      setActiveCategory(currentCat);
    };

    target.addEventListener('scroll', handleScroll, { passive: true });
    return () => target.removeEventListener('scroll', handleScroll);
  }, [categories, itemsByCategory, activeTab, searchQuery]);

  // Scroll to top
  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle category chip click
  const handleSelectCategory = (categoryId) => {
    setActiveCategory(categoryId);
    if (activeTab !== 'main') {
      setActiveTab('main');
    }

    isManualScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isManualScrollingRef.current = false;
    }, 850);

    if (categoryId === 'main-view') {
      scrollToTop();
      return;
    }

    const container = scrollContainerRef.current;
    const sectionEl = document.getElementById(categoryId);
    const stickyNav = document.getElementById('sticky-nav');
    const navHeight = stickyNav?.offsetHeight || 130;

    if (container && sectionEl) {
      const containerTop = container.getBoundingClientRect().top;
      const sectionTop = sectionEl.getBoundingClientRect().top;
      const targetScroll = sectionTop - containerTop + container.scrollTop - navHeight + 8;

      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
    } else if (sectionEl) {
      const sectionTop = sectionEl.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: Math.max(0, sectionTop - navHeight + 8),
        behavior: 'smooth'
      });
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#F4F7F5' }}>
        <div style={{ textAlign: 'center', color: '#16391B' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Trattorias Restaurant</div>
          <div style={{ fontSize: '14px', color: '#6B8B7B' }}>Loading digital menu...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-frame">
      {/* Navigation Overlay */}
      <NavOverlay
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        currentTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'main') scrollToTop();
        }}
        settings={activeSettings}
      />

      <div className="screen-content" id="scroll-container" ref={scrollContainerRef}>
        {/* Header & Hero Carousel */}
        <Header onOpenNav={() => setIsNavOpen(true)} settings={activeSettings} />

        <main className="main-content">
          {activeTab === 'main' ? (
            <div id="main-view" style={{ minHeight: '100vh' }}>
              <div id="nav-sentinel" style={{ position: 'absolute', top: 0, width: '100%', height: '1px', visibility: 'hidden', pointerEvents: 'none' }}></div>

              {/* Sticky Navigation Wrapper */}
              <div className="sticky-nav-wrapper" id="sticky-nav">
                <SearchBar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onClearSearch={() => setSearchQuery('')}
                />
                <CategoryChips
                  categories={categories}
                  activeCategory={activeCategory}
                  onSelectCategory={handleSelectCategory}
                />
              </div>

              {/* Menu List */}
              <div className="menu-list">
                {filteredItems.length === 0 ? (
                  <div id="search-no-results" className="search-no-results">
                    <div className="no-results-icon">
                      <SearchX size={36} />
                    </div>
                    <h3>No dishes found</h3>
                    <p id="no-results-text">
                      We couldn't find anything matching "{searchQuery}". Try searching by dish name, price (e.g. 270), or category.
                    </p>
                    <button type="button" className="search-reset-btn" onClick={() => setSearchQuery('')}>
                      Clear Search
                    </button>
                  </div>
                ) : (
                  categories
                    .filter((cat) => cat.id !== 'main-view' && itemsByCategory[cat.id]?.length > 0)
                    .map((cat) => (
                      <MenuSection
                        key={cat.id}
                        sectionId={cat.id}
                        title={cat.name}
                        subtitle={cat.subtitle}
                        items={itemsByCategory[cat.id]}
                        onOpenModal={(item) => setSelectedFoodItem(item)}
                      />
                    ))
                )}
              </div>

              {/* Social & Review Cards */}
              <div style={{ padding: '0 20px' }}>
                <a
                  href={activeSettings?.instagram_url || 'https://www.instagram.com/trattorias_restaurant/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                >
                  <div className="instagram-card-new">
                    <div className="insta-title">Follow Us On Instagram</div>
                    <div className="instagram-qr-new">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                          activeSettings?.instagram_url || 'https://www.instagram.com/trattorias_restaurant/'
                        )}&color=16391B&bgcolor=ffffff&margin=0`}
                        alt="Instagram QR"
                      />
                    </div>
                    <p className="insta-desc">{activeSettings?.instagram_handle || '@trattorias_restaurant'}</p>
                  </div>
                </a>

                <a
                  href={activeSettings?.google_reviews_url || 'https://www.google.com/maps/place/Trattorias+Restaurant/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="review-card-new"
                  aria-label="Leave a Review on Google"
                >
                  <div className="review-card-inner">
                    <div className="review-stars" aria-hidden="true">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={20} className="star-icon" />
                      ))}
                    </div>
                    <div className="review-prompt">
                      Share Your Experience
                    </div>
                    <div className="review-cta-btn">
                      <span>Leave a Review</span>
                      <ExternalLink size={16} className="review-cta-icon" />
                    </div>
                  </div>
                </a>
              </div>
            </div>
          ) : (
            <AboutSection settings={activeSettings} />
          )}

          <Footer settings={activeSettings} />
        </main>
      </div>

      {/* Food Detail Modal */}
      {selectedFoodItem && (
        <FoodModal item={selectedFoodItem} onClose={() => setSelectedFoodItem(null)} />
      )}

      {/* Floating Scroll-to-Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          aria-label="Back to top"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 900,
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: '#16391B',
            color: '#FFFFFF',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
};

export default PublicMenu;
