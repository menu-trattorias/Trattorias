import React, { useState, useEffect } from 'react';
import {
  Menu as MenuIcon
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MenuEditor from './MenuEditor';
import CategoryEditor from './CategoryEditor';
import SettingsEditor from './SettingsEditor';
import AdminSidebar from './AdminSidebar';
import { DataService, getSupabase } from '../lib/supabase';
import './admin.css';

export const AdminDashboard = ({ user, onLogout }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') || searchParams.get('page');
  const initialTab =
    urlTab === 'categories' || urlTab === 'settings' || urlTab === 'menu'
      ? urlTab
      : 'menu';

  const [activeTab, setActiveTabState] = useState(initialTab);
  const [categories, setCategories] = useState(null);
  const [menuItems, setMenuItems] = useState(null);
  const [categoryItemCounts, setCategoryItemCounts] = useState(null);
  const [settings, setSettings] = useState(null);
  const [counts, setCounts] = useState({ menuCount: 0, categoryCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const navigate = useNavigate();

  // Sync activeTab state if URL changes externally
  useEffect(() => {
    if (urlTab && ['menu', 'categories', 'settings'].includes(urlTab) && urlTab !== activeTab) {
      setActiveTabState(urlTab);
    }
  }, [urlTab, activeTab]);

  const handleTabChange = (tabId) => {
    setActiveTabState(tabId);
    setSearchParams({ tab: tabId });
  };

  // 1. Fetch lightweight counts once on mount for sidebar badges
  useEffect(() => {
    DataService.getCounts()
      .then((c) => {
        if (c) {
          setCounts({
            menuCount: c.menuCount ?? 0,
            categoryCount: c.categoryCount ?? 0
          });
        }
      })
      .catch((err) => console.error('Failed to load counts:', err));
  }, []);

  // 2. Load page-specific data strictly on demand for the active page
  useEffect(() => {
    let isMounted = true;

    const loadPageData = async () => {
      if (activeTab === 'menu') {
        // "Dishes & Menu" only loads menu items and categories
        if (menuItems === null || categories === null) {
          setIsLoading(true);
          try {
            const [items, cats] = await Promise.all([
              menuItems !== null ? Promise.resolve(menuItems) : DataService.getMenuItems(),
              categories !== null ? Promise.resolve(categories) : DataService.getCategories()
            ]);
            if (isMounted) {
              if (menuItems === null) setMenuItems(items || []);
              if (categories === null) setCategories(cats || []);
              setCounts((prev) => ({
                ...prev,
                menuCount: items?.length ?? prev.menuCount,
                categoryCount: cats?.length ?? prev.categoryCount
              }));
            }
          } catch (err) {
            console.error('Failed to load menu data:', err);
          } finally {
            if (isMounted) setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }
      } else if (activeTab === 'categories') {
        // "Categories" only loads categories and lightweight dish counts
        if (categories === null || categoryItemCounts === null) {
          setIsLoading(true);
          try {
            const [cats, itemCounts] = await Promise.all([
              categories !== null ? Promise.resolve(categories) : DataService.getCategories(),
              categoryItemCounts !== null ? Promise.resolve(categoryItemCounts) : DataService.getCategoryItemCounts()
            ]);
            if (isMounted) {
              if (categories === null) setCategories(cats || []);
              if (categoryItemCounts === null) setCategoryItemCounts(itemCounts || {});
              setCounts((prev) => ({
                ...prev,
                categoryCount: cats?.length ?? prev.categoryCount
              }));
            }
          } catch (err) {
            console.error('Failed to load categories data:', err);
          } finally {
            if (isMounted) setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }
      } else if (activeTab === 'settings') {
        // "Info & Banners" only loads restaurant settings
        if (settings === null) {
          setIsLoading(true);
          try {
            const sett = await DataService.getSettings();
            if (isMounted) {
              setSettings(sett || null);
            }
          } catch (err) {
            console.error('Failed to load settings data:', err);
          } finally {
            if (isMounted) setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }
      }
    };

    loadPageData();

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  // Page-specific refresh handlers: only re-fetch data for the active page
  const handleRefreshMenu = async () => {
    try {
      const [items, cats] = await Promise.all([
        DataService.getMenuItems(),
        DataService.getCategories()
      ]);
      setMenuItems(items || []);
      setCategories(cats || []);
      setCounts((prev) => ({
        ...prev,
        menuCount: items?.length ?? prev.menuCount,
        categoryCount: cats?.length ?? prev.categoryCount
      }));
    } catch (err) {
      console.error('Failed to refresh menu items:', err);
    }
  };

  const handleRefreshCategories = async () => {
    try {
      const [cats, itemCounts] = await Promise.all([
        DataService.getCategories(),
        DataService.getCategoryItemCounts()
      ]);
      setCategories(cats || []);
      setCategoryItemCounts(itemCounts || {});
      setCounts((prev) => ({
        ...prev,
        categoryCount: cats?.length ?? prev.categoryCount
      }));
    } catch (err) {
      console.error('Failed to refresh categories:', err);
    }
  };

  const handleRefreshSettings = async () => {
    try {
      const sett = await DataService.getSettings();
      setSettings(sett || null);
    } catch (err) {
      console.error('Failed to refresh settings:', err);
    }
  };

  const handleLogout = async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    onLogout();
    navigate('/');
  };

  // Extract display name and initials
  const displayName =
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split('@')[0] : 'Aflah');
  const capitalizedName =
    displayName.charAt(0).toUpperCase() + displayName.slice(1);
  const initials =
    capitalizedName.length >= 2
      ? capitalizedName.slice(0, 2).toUpperCase()
      : 'AF';

  return (
    <div className="admin-layout-root">
      {/* Clean Left-Side Navigation */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        menuCount={menuItems ? menuItems.length : counts.menuCount}
        categoryCount={categories ? categories.length : counts.categoryCount}
        user={user}
        onLogout={handleLogout}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Area */}
      <div className="admin-main-wrap">
        {/* Simple Top Bar */}
        <header className="admin-top-bar">
          <div className="admin-top-left">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="admin-mobile-toggle"
              aria-label="Open Sidebar Menu"
            >
              <MenuIcon size={18} />
            </button>
          </div>

          <div className="admin-top-right">
            <div className="admin-top-user-pill">
              <div className="admin-user-avatar">{initials}</div>
              <div className="admin-user-details">
                <span className="admin-user-name">{capitalizedName}</span>
                <span className="admin-user-role">ADMIN</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="admin-content-body">
          {isLoading ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 0',
                color: 'var(--adm-text-secondary)',
                fontSize: '14px'
              }}
            >
              {activeTab === 'menu' && 'Loading menu dishes...'}
              {activeTab === 'categories' && 'Loading categories...'}
              {activeTab === 'settings' && 'Loading restaurant settings & banners...'}
            </div>
          ) : (
            <>
              {activeTab === 'menu' && (
                <MenuEditor
                  menuItems={menuItems || []}
                  categories={categories || []}
                  onRefresh={handleRefreshMenu}
                />
              )}
              {activeTab === 'categories' && (
                <CategoryEditor
                  categories={categories || []}
                  itemCounts={categoryItemCounts || {}}
                  onRefresh={handleRefreshCategories}
                />
              )}
              {activeTab === 'settings' && (
                <SettingsEditor
                  settings={settings}
                  onRefresh={handleRefreshSettings}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
