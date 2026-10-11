import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Check,
  X,
  Eye,
  EyeOff,
  Image as ImageIcon,
  RotateCcw
} from 'lucide-react';
import { DataService } from '../lib/supabase';
import { filterMenuItems } from '../lib/search';
import UnsavedChangesBar from './UnsavedChangesBar';
import CategorySelectDropdown from './CategorySelectDropdown';

export const MenuEditor = ({ menuItems = [], categories = [], onRefresh }) => {
  const [localMenuItems, setLocalMenuItems] = useState([...menuItems]);
  const [baselineMenuItems, setBaselineMenuItems] = useState(() => JSON.stringify(menuItems));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editingItem, setEditingItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isStuck, setIsStuck] = useState(false);
  const sentinelRef = useRef(null);

  // Form State for Modal
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    categoryId: '',
    categoryName: '',
    description: '',
    price: '',
    image_url: '',
    variants: [],
    is_available: true
  });

  const [variantInput, setVariantInput] = useState({ name: '', price: '' });

  // Sync state when parent menuItems changes
  useEffect(() => {
    setLocalMenuItems([...menuItems]);
    setBaselineMenuItems(JSON.stringify(menuItems));
  }, [menuItems]);

  const filteredCategories = categories.filter((c) => c.id !== 'main-view');
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Compute item counts for each category
  const categoryItemCounts = useMemo(() => {
    const counts = { all: localMenuItems.length };
    for (const item of localMenuItems) {
      if (item.categoryId) {
        counts[item.categoryId] = (counts[item.categoryId] || 0) + 1;
      }
    }
    return counts;
  }, [localMenuItems]);

  // Track modified dishes count and dirty state
  const { hasUnsavedChanges, modifiedCount } = useMemo(() => {
    const isDirty = JSON.stringify(localMenuItems) !== baselineMenuItems;
    if (!isDirty) return { hasUnsavedChanges: false, modifiedCount: 0 };

    let count = 0;
    try {
      const originalMap = new Map(JSON.parse(baselineMenuItems).map((i) => [i.id, i]));
      for (const item of localMenuItems) {
        const orig = originalMap.get(item.id);
        if (!orig || JSON.stringify(item) !== JSON.stringify(orig)) {
          count++;
        }
      }
    } catch {
      count = 1;
    }
    return { hasUnsavedChanges: true, modifiedCount: count };
  }, [localMenuItems, baselineMenuItems]);

  // Filter items based on local state
  const searchedItems = useMemo(() => {
    return filterMenuItems(localMenuItems, categoryMap, searchQuery);
  }, [localMenuItems, categoryMap, searchQuery]);

  const filteredItems = searchedItems.filter((item) => {
    return selectedCategory === 'all' || item.categoryId === selectedCategory;
  });

  // Sentinel observer for sticky state elevation
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(!entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0,
        rootMargin: '-60px 0px 0px 0px'
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const isFiltered = searchQuery.trim() !== '' || selectedCategory !== 'all';
  const selectedCategoryObj = categories.find((c) => c.id === selectedCategory);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleClearCategory = () => {
    setSelectedCategory('all');
  };

  const openNewItemModal = () => {
    const defaultCat = filteredCategories[0] || { id: 'general', name: 'General' };
    setFormData({
      id: `item-${Date.now()}`,
      name: '',
      categoryId: defaultCat.id,
      categoryName: defaultCat.name,
      description: '',
      price: '₹',
      image_url: '',
      variants: [],
      is_available: true
    });
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setFormData({
      id: item.id,
      name: item.name || '',
      categoryId: item.categoryId || '',
      categoryName: item.categoryName || '',
      description: item.description || '',
      price: item.price || '',
      image_url: item.image_url || '',
      variants: Array.isArray(item.variants) ? [...item.variants] : [],
      is_available: item.is_available !== false
    });
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleModalSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const cat = categories.find((c) => c.id === formData.categoryId);
    const itemToSave = {
      ...formData,
      categoryName: cat ? cat.name : formData.categoryName
    };

    try {
      await DataService.saveMenuItem(itemToSave);
      setIsModalOpen(false);
      setStatusMsg(`Saved "${itemToSave.name}" successfully!`);
      setTimeout(() => setStatusMsg(''), 3000);
      onRefresh();
    } catch (err) {
      console.error('Failed to save menu item:', err);
      alert(`Save failed: ${err.message || 'Please check your admin session and database permissions.'}`);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await DataService.deleteMenuItem(id);
        setStatusMsg(`Deleted "${name}"`);
        setTimeout(() => setStatusMsg(''), 3000);
        onRefresh();
      } catch (err) {
        console.error('Failed to delete menu item:', err);
        alert(`Delete failed: ${err.message || 'Please check your admin session and database permissions.'}`);
      }
    }
  };

  const toggleAvailability = (item) => {
    const updatedList = localMenuItems.map((i) =>
      i.id === item.id ? { ...i, is_available: !(i.is_available !== false) } : i
    );
    setLocalMenuItems(updatedList);
  };

  const handleSaveBatch = async () => {
    setIsSaving(true);
    try {
      await DataService.saveMenuItemsBatch(localMenuItems);
      setBaselineMenuItems(JSON.stringify(localMenuItems));
      setStatusMsg('Menu item changes saved successfully!');
      setTimeout(() => setStatusMsg(''), 3000);
      onRefresh();
    } catch (err) {
      console.error('Failed to save menu changes:', err);
      alert(`Save failed: ${err.message || 'Please check your admin session and database permissions.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    try {
      setLocalMenuItems(JSON.parse(baselineMenuItems));
    } catch {
      setLocalMenuItems([...menuItems]);
    }
  };

  const addVariant = () => {
    if (variantInput.name.trim() && variantInput.price.trim()) {
      setFormData({
        ...formData,
        variants: [
          ...formData.variants,
          { name: variantInput.name.trim(), price: variantInput.price.trim() }
        ]
      });
      setVariantInput({ name: '', price: '' });
    }
  };

  const removeVariant = (index) => {
    const updated = [...formData.variants];
    updated.splice(index, 1);
    setFormData({ ...formData, variants: updated });
  };

  return (
    <div>
      {/* Header controls */}
      <div className="admin-header-row">
        <h1 className="admin-page-title">Dishes &amp; Menu</h1>
        <button onClick={openNewItemModal} className="admin-btn-primary">
          <Plus size={16} /> Add Dish
        </button>
      </div>

      {statusMsg && (
        <div
          style={{
            background: 'var(--adm-success-bg)',
            color: 'var(--adm-success)',
            padding: '10px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13.5px',
            fontWeight: '500'
          }}
        >
          {statusMsg}
        </div>
      )}

      {/* Sentinel for Sticky State Detection */}
      <div ref={sentinelRef} className="admin-sticky-sentinel" />

      {/* Redesigned Sticky Filter Section */}
      <div className={`admin-sticky-filter-wrapper ${isStuck ? 'is-stuck' : ''}`}>
        <div className="admin-filter-bar-card">
          <div className="admin-filter-controls-row">
            {/* Search Input with Icon and Clear Button */}
            <div className="admin-search-input-wrap">
              <Search size={16} className="admin-search-icon" />
              <input
                type="text"
                placeholder="Search dish by name, price (e.g. 270), category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="admin-search-clear-btn"
                  onClick={handleClearSearch}
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Custom Responsive Category Dropdown */}
            <CategorySelectDropdown
              value={selectedCategory}
              onChange={setSelectedCategory}
              categories={filteredCategories}
              itemCounts={categoryItemCounts}
              showAllOption={true}
              allLabel="All Categories"
              variant="filter"
            />

            {/* Quick Reset Button (Visible when filters are active) */}
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="admin-filter-reset-btn"
                title="Reset all filters"
                aria-label="Reset all filters"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Metadata / Active Filters Bar */}
          <div className="admin-filter-meta-bar">
            <div className="admin-filter-count-text">
              Showing <strong>{filteredItems.length}</strong> {filteredItems.length === 1 ? 'dish' : 'dishes'}
              {isFiltered && <span>(out of {localMenuItems.length} total)</span>}
            </div>

            {isFiltered && (
              <div className="admin-filter-active-pills">
                {selectedCategory !== 'all' && selectedCategoryObj && (
                  <button
                    type="button"
                    className="admin-filter-pill"
                    onClick={handleClearCategory}
                    title="Clear category filter"
                  >
                    <span>Category: {selectedCategoryObj.name}</span>
                    <X size={11} />
                  </button>
                )}
                {searchQuery.trim() && (
                  <button
                    type="button"
                    className="admin-filter-pill"
                    onClick={handleClearSearch}
                    title="Clear search query"
                  >
                    <span>Search: "{searchQuery}"</span>
                    <X size={11} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 1. Desktop Table View (screens >= 768px) */}
      <div className="admin-desktop-table-view admin-table-wrap">
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Dish Name & Details</th>
                <th>Category</th>
                <th>Price</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--adm-text-secondary)' }}>
                    <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--adm-text)', marginBottom: '6px' }}>
                      No dishes found
                    </div>
                    <div style={{ fontSize: '13px', marginBottom: isFiltered ? '14px' : '0' }}>
                      {searchQuery ? `No results matching "${searchQuery}".` : 'No dishes found in this category.'}
                    </div>
                    {isFiltered && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="admin-btn-secondary"
                        style={{ display: 'inline-flex', padding: '6px 14px', fontSize: '12.5px' }}
                      >
                        <RotateCcw size={12} /> Clear Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '8px',
                              objectFit: 'cover',
                              flexShrink: 0,
                              border: '1px solid var(--adm-border)'
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : null}
                        <div>
                          <div style={{ fontWeight: '600', color: 'var(--adm-text)' }}>{item.name}</div>
                          {item.description && (
                            <div style={{ fontSize: '12px', color: 'var(--adm-text-secondary)', marginTop: '2px', maxWidth: '340px' }}>
                              {item.description}
                            </div>
                          )}
                          {item.variants?.length > 0 && (
                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                              {item.variants.map((v, i) => (
                                <span
                                  key={i}
                                  style={{
                                    fontSize: '11px',
                                    background: 'var(--adm-primary-light)',
                                    color: 'var(--adm-primary)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontWeight: '500'
                                  }}
                                >
                                  {v.name}: {v.price}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--adm-text-secondary)', fontSize: '13px' }}>
                      {item.categoryName || item.categoryId}
                    </td>
                    <td style={{ fontWeight: '600', color: 'var(--adm-primary)' }}>
                      {item.price}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => toggleAvailability(item)}
                        style={{
                          background: item.is_available !== false ? 'var(--adm-success-bg)' : 'var(--adm-danger-bg)',
                          color: item.is_available !== false ? 'var(--adm-success)' : 'var(--adm-danger)',
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {item.is_available !== false ? (
                          <>
                            <Eye size={12} /> Available
                          </>
                        ) : (
                          <>
                            <EyeOff size={12} /> Sold Out
                          </>
                        )}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => openEditModal(item)}
                          style={{
                            padding: '6px',
                            background: 'var(--adm-bg)',
                            border: '1px solid var(--adm-border)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: 'var(--adm-primary)'
                          }}
                          aria-label="Edit dish"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.name)}
                          style={{
                            padding: '6px',
                            background: 'var(--adm-danger-bg)',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: 'var(--adm-danger)'
                          }}
                          aria-label="Delete dish"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Mobile Responsive Card List (screens < 768px) */}
      <div className="admin-mobile-cards-view">
        {filteredItems.length === 0 ? (
          <div className="admin-card" style={{ textAlign: 'center', color: 'var(--adm-text-secondary)', padding: '36px 20px', width: '100%' }}>
            <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--adm-text)', marginBottom: '6px' }}>
              No dishes found
            </div>
            <div style={{ fontSize: '13px', marginBottom: isFiltered ? '14px' : '0' }}>
              {searchQuery ? `No results matching "${searchQuery}".` : 'No dishes found in this category.'}
            </div>
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="admin-btn-secondary"
                style={{ display: 'inline-flex', padding: '6px 14px', fontSize: '12.5px' }}
              >
                <RotateCcw size={12} /> Clear Filters
              </button>
            )}
          </div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="admin-dish-mobile-card">
              <div className="admin-dish-card-main">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="admin-dish-card-img"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="admin-dish-card-img-placeholder">
                    <ImageIcon size={22} />
                  </div>
                )}

                <div className="admin-dish-card-info">
                  <div className="admin-dish-card-header">
                    <span className="admin-dish-card-name">{item.name}</span>
                    <span className="admin-dish-card-price">{item.price}</span>
                  </div>

                  <div>
                    <span className="admin-dish-card-category">
                      {item.categoryName || item.categoryId}
                    </span>
                  </div>

                  {item.description && (
                    <p className="admin-dish-card-desc">{item.description}</p>
                  )}

                  {item.variants?.length > 0 && (
                    <div className="admin-dish-variants-row">
                      {item.variants.map((v, i) => (
                        <span key={i} className="admin-dish-variant-pill">
                          {v.name}: {v.price}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="admin-dish-card-footer">
                <button
                  type="button"
                  onClick={() => toggleAvailability(item)}
                  className={`admin-dish-avail-btn ${item.is_available !== false ? 'available' : 'sold-out'}`}
                >
                  {item.is_available !== false ? (
                    <>
                      <Eye size={13} /> Available
                    </>
                  ) : (
                    <>
                      <EyeOff size={13} /> Sold Out
                    </>
                  )}
                </button>

                <div className="admin-dish-actions">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="admin-dish-action-btn edit"
                    aria-label="Edit dish"
                  >
                    <Edit2 size={13} /> <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id, item.name)}
                    className="admin-dish-action-btn delete"
                    aria-label="Delete dish"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit / Add Modal */}
      {isModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--adm-primary)', fontWeight: '700' }}>
                {editingItem ? 'Edit Dish' : 'Add New Dish'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'var(--adm-bg)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--adm-text-secondary)'
                }}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleModalSave}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>
                  Dish Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Blue Bird Mocktail"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border)',
                    fontSize: '13.5px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    minHeight: '40px'
                  }}
                />
              </div>

              <div className="admin-form-grid-2">
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>
                    Category *
                  </label>
                  <CategorySelectDropdown
                    value={formData.categoryId}
                    onChange={(newCatId) => {
                      const cat = categories.find((c) => c.id === newCatId);
                      setFormData({
                        ...formData,
                        categoryId: newCatId,
                        categoryName: cat ? cat.name : ''
                      });
                    }}
                    categories={filteredCategories}
                    showAllOption={false}
                    placeholder="Select category"
                    variant="form"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>
                    Price (e.g. ₹270)
                  </label>
                  <input
                    type="text"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="₹270"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--adm-border)',
                      fontSize: '13.5px',
                      boxSizing: 'border-box',
                      outline: 'none',
                      minHeight: '40px'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>
                  Ingredients / Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Lychee crush, blue curacao, lemon, soda..."
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--adm-border)',
                    fontSize: '13.5px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Variants Section */}
              <div style={{ marginBottom: '16px', background: 'var(--adm-bg)', padding: '12px', borderRadius: '10px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px', color: 'var(--adm-primary)' }}>
                  Portion / Meat Variants (Optional)
                </label>

                {formData.variants?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                    {formData.variants.map((v, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#fff',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--adm-border)',
                          fontSize: '12.5px'
                        }}
                      >
                        <span>
                          <strong>{v.name}</strong>: {v.price}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeVariant(idx)}
                          style={{ background: 'none', border: 'none', color: 'var(--adm-danger)', cursor: 'pointer', padding: '4px' }}
                          aria-label="Remove variant"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="e.g. Chicken"
                    value={variantInput.name}
                    onChange={(e) => setVariantInput({ ...variantInput, name: e.target.value })}
                    style={{ flex: '2 1 120px', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--adm-border)', fontSize: '12.5px', outline: 'none', minHeight: '36px', boxSizing: 'border-box' }}
                  />
                  <input
                    type="text"
                    placeholder="e.g. ₹320"
                    value={variantInput.price}
                    onChange={(e) => setVariantInput({ ...variantInput, price: e.target.value })}
                    style={{ flex: '1 1 70px', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--adm-border)', fontSize: '12.5px', outline: 'none', minHeight: '36px', boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={addVariant}
                    style={{
                      padding: '8px 14px',
                      background: 'var(--adm-primary)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                      minHeight: '36px'
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="admin-btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn-primary">
                  Save Dish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Bottom Save Bar */}
      <UnsavedChangesBar
        show={hasUnsavedChanges}
        onSave={handleSaveBatch}
        onDiscard={handleDiscard}
        isSaving={isSaving}
        message="Unsaved changes"
        saveLabel="Save"
        discardLabel="Discard"
      />
    </div>
  );
};

export default MenuEditor;
