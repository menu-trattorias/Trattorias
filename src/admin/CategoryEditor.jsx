import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, X, Search, RotateCcw } from 'lucide-react';
import DynamicIcon from '../components/DynamicIcon';
import { DataService } from '../lib/supabase';
import UnsavedChangesBar from './UnsavedChangesBar';

const POPULAR_ICONS = [
  'glass-water', 'citrus', 'coffee', 'cup-soda', 'flame', 'milk',
  'soup', 'wheat', 'apple', 'sandwich', 'egg', 'cookie', 'utensils',
  'sun', 'utensils-crossed', 'sparkles', 'salad', 'mountain',
  'layers', 'pizza', 'drumstick', 'fish', 'star', 'cake', 'martini'
];

export const CategoryEditor = ({ categories = [], menuItems = [], itemCounts = {}, onRefresh }) => {
  const [localCategories, setLocalCategories] = useState([...categories]);
  const [baselineCategories, setBaselineCategories] = useState(() => JSON.stringify(categories));
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [formData, setFormData] = useState({ id: '', name: '', subtitle: '', icon: 'utensils' });
  const [statusMsg, setStatusMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when parent categories change
  useEffect(() => {
    setLocalCategories([...categories]);
    setBaselineCategories(JSON.stringify(categories));
  }, [categories]);

  // Track unsaved category changes
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(localCategories) !== baselineCategories;
  }, [localCategories, baselineCategories]);

  // Filtered categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return localCategories;
    const q = searchQuery.toLowerCase().trim();
    return localCategories.filter((cat) => {
      const nameMatch = cat.name && cat.name.toLowerCase().includes(q);
      const subMatch = cat.subtitle && cat.subtitle.toLowerCase().includes(q);
      const idMatch = cat.id && cat.id.toLowerCase().includes(q);
      return nameMatch || subMatch || idMatch;
    });
  }, [localCategories, searchQuery]);

  const countForCat = (catId) => {
    if (itemCounts && typeof itemCounts[catId] === 'number') {
      return itemCounts[catId];
    }
    return menuItems ? menuItems.filter((i) => i.categoryId === catId).length : 0;
  };

  const openNewCategoryModal = () => {
    setFormData({ id: '', name: '', subtitle: '', icon: 'utensils' });
    setEditingCat(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setFormData({ id: cat.id, name: cat.name, subtitle: cat.subtitle || '', icon: cat.icon || 'utensils' });
    setEditingCat(cat);
    setIsModalOpen(true);
  };

  const handleSaveBatch = async () => {
    setIsSaving(true);
    try {
      await DataService.saveCategoriesBatch(localCategories);
      setBaselineCategories(JSON.stringify(localCategories));
      setStatusMsg('Categories saved successfully!');
      setTimeout(() => setStatusMsg(''), 3000);
      onRefresh();
    } catch (err) {
      console.error('Failed to save categories:', err);
      alert(`Save failed: ${err.message || 'Please check your admin session and database permissions.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    try {
      setLocalCategories(JSON.parse(baselineCategories));
    } catch {
      setLocalCategories([...categories]);
    }
  };

  const handleModalSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const id = formData.id.trim() || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const catToSave = {
      id,
      name: formData.name.trim(),
      subtitle: formData.subtitle.trim(),
      icon: formData.icon
    };

    try {
      await DataService.saveCategory(catToSave);
      setIsModalOpen(false);
      setStatusMsg(`Category "${catToSave.name}" saved successfully!`);
      setTimeout(() => setStatusMsg(''), 3000);
      onRefresh();
    } catch (err) {
      console.error('Failed to save category:', err);
      alert(`Save failed: ${err.message || 'Please check your admin session and database permissions.'}`);
    }
  };

  const handleDelete = async (cat) => {
    if (cat.id === 'main-view') {
      alert('The "All" category cannot be deleted.');
      return;
    }

    const count = countForCat(cat.id);
    if (
      window.confirm(
        `Are you sure you want to delete category "${cat.name}"? It currently has ${count} dishes.`
      )
    ) {
      try {
        await DataService.deleteCategory(cat.id);
        setStatusMsg(`Category "${cat.name}" deleted.`);
        setTimeout(() => setStatusMsg(''), 3000);
        onRefresh();
      } catch (err) {
        console.error('Failed to delete category:', err);
        alert(`Delete failed: ${err.message || 'Please check your admin session and database permissions.'}`);
      }
    }
  };

  return (
    <div>
      <div className="admin-header-row">
        <h1 className="admin-page-title">Categories</h1>
        <button onClick={openNewCategoryModal} className="admin-btn-primary">
          <Plus size={16} /> Add Category
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

      {/* Filter / Search Bar */}
      <div className="admin-filter-bar-card" style={{ marginBottom: '20px' }}>
        <div className="admin-filter-controls-row">
          <div className="admin-search-input-wrap">
            <Search size={16} className="admin-search-icon" />
            <input
              type="text"
              placeholder="Search category by name or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
            />
            {searchQuery && (
              <button
                type="button"
                className="admin-search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="admin-filter-reset-btn"
              title="Reset search"
              aria-label="Reset search"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {searchQuery && (
          <div className="admin-filter-meta-bar">
            <span className="admin-filter-count-text">
              Showing <strong>{filteredCategories.length}</strong> of <strong>{localCategories.length}</strong> categories
            </span>
          </div>
        )}
      </div>

      {/* Grid of Categories or Empty State */}
      {filteredCategories.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 20px',
            background: '#fff',
            borderRadius: '16px',
            border: '1px dashed var(--adm-border)',
            color: 'var(--adm-text-secondary)',
            marginTop: '8px'
          }}
        >
          <Search size={36} style={{ opacity: 0.3, marginBottom: '12px', marginInline: 'auto', display: 'block' }} />
          <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--adm-text)', marginBottom: '4px' }}>
            No categories found
          </div>
          <div style={{ fontSize: '13px', marginBottom: '16px' }}>
            No categories match &quot;{searchQuery}&quot;.
          </div>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="admin-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginInline: 'auto' }}
          >
            <RotateCcw size={14} /> Clear Search
          </button>
        </div>
      ) : (
        <div className="admin-category-grid">
          {filteredCategories.map((cat) => {
            const count = countForCat(cat.id);
            const isSpecial = cat.id === 'main-view';

            return (
              <div key={cat.id} className="admin-category-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'var(--adm-primary-light)',
                    color: 'var(--adm-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <DynamicIcon name={cat.icon || 'utensils'} size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: '700', color: 'var(--adm-text)', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cat.name}
                  </div>
                  {cat.subtitle && (
                    <div style={{ fontSize: '11px', color: 'var(--adm-text-secondary)', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      ({cat.subtitle})
                    </div>
                  )}
                  <div style={{ fontSize: '11.5px', color: 'var(--adm-text-muted)', marginTop: '2px' }}>
                    {isSpecial ? 'Overview tab' : `${count} dishes`}
                  </div>
                </div>
              </div>

              {!isSpecial && (
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                  <button
                    onClick={() => openEditModal(cat)}
                    style={{
                      padding: '7px 8px',
                      background: 'var(--adm-bg)',
                      border: '1px solid var(--adm-border)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: 'var(--adm-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '34px',
                      minWidth: '34px'
                    }}
                    aria-label="Edit category"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    style={{
                      padding: '7px 8px',
                      background: 'var(--adm-danger-bg)',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: 'var(--adm-danger)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '34px',
                      minWidth: '34px'
                    }}
                    aria-label="Delete category"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}

      {/* Category Modal */}
      {isModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--adm-primary)', fontWeight: '700' }}>
                {editingCat ? 'Edit Category' : 'New Category'}
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
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Fresh Juices"
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

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>
                  Subtitle / Note (Optional)
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g. No Ice, No Sugar"
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

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Choose Icon
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(42px, 1fr))',
                    gap: '6px',
                    maxHeight: '150px',
                    overflowY: 'auto',
                    padding: '8px',
                    background: 'var(--adm-bg)',
                    borderRadius: '8px',
                    boxSizing: 'border-box'
                  }}
                >
                  {POPULAR_ICONS.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: iconName })}
                      style={{
                        padding: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: formData.icon === iconName ? 'var(--adm-primary)' : 'var(--adm-border)',
                        background: formData.icon === iconName ? 'var(--adm-primary)' : '#fff',
                        color: formData.icon === iconName ? '#fff' : 'var(--adm-text)',
                        cursor: 'pointer',
                        minHeight: '40px'
                      }}
                      title={iconName}
                    >
                      <DynamicIcon name={iconName} size={17} />
                    </button>
                  ))}
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
                  Save Category
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

export default CategoryEditor;
