import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X, Layers, Filter } from 'lucide-react';

/**
 * Custom Mobile-Friendly Category Dropdown
 * Replaces clunky native OS <select> with a sleek, searchable, touch-optimized dropdown.
 */
export const CategorySelectDropdown = ({
  value = 'all',
  onChange,
  categories = [],
  itemCounts = {},
  showAllOption = true,
  allLabel = 'All Categories',
  placeholder = 'Select a Category',
  variant = 'filter', // 'filter' | 'form'
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Filtered categories for search inside dropdown
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase().trim();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, searchQuery]);

  // Selected item label
  const selectedLabel = useMemo(() => {
    if (showAllOption && (value === 'all' || !value)) {
      return allLabel;
    }
    const found = categories.find((c) => c.id === value);
    return found ? found.name : placeholder;
  }, [value, showAllOption, allLabel, categories, placeholder]);

  const selectedCount = useMemo(() => {
    if (showAllOption && (value === 'all' || !value)) {
      return itemCounts['all'] !== undefined ? itemCounts['all'] : categories.length;
    }
    return itemCounts[value];
  }, [value, showAllOption, itemCounts, categories.length]);

  const handleSelect = (categoryId) => {
    onChange(categoryId);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('all');
    setIsOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      className={`admin-cat-dropdown-root ${variant} ${className}`}
      style={{ position: 'relative' }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        className={`admin-cat-dropdown-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="admin-cat-trigger-left">
          {variant === 'filter' ? (
            <Filter size={15} className="admin-cat-trigger-icon" />
          ) : (
            <Layers size={15} className="admin-cat-trigger-icon" />
          )}
          <span className="admin-cat-trigger-text">{selectedLabel}</span>
          {selectedCount !== undefined && (
            <span className="admin-cat-trigger-count">{selectedCount}</span>
          )}
        </div>

        <div className="admin-cat-trigger-right">
          {variant === 'filter' && value !== 'all' && value && (
            <span
              role="button"
              tabIndex={0}
              className="admin-cat-clear-btn"
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleClear(e);
                }
              }}
              title="Reset to All Categories"
              aria-label="Reset to All Categories"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={16}
            className={`admin-cat-chevron ${isOpen ? 'open' : ''}`}
          />
        </div>
      </button>

      {/* Floating Options Menu */}
      {isOpen && (
        <div className="admin-cat-dropdown-menu" role="listbox">
          {/* Quick Search inside dropdown if categories count > 6 */}
          {categories.length > 6 && (
            <div className="admin-cat-search-box">
              <Search size={14} className="admin-cat-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={`Search ${categories.length} categories...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-cat-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="admin-cat-search-clear"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}

          {/* Options Scroll Area */}
          <div className="admin-cat-list-wrap">
            {showAllOption && !searchQuery.trim() && (
              <button
                type="button"
                className={`admin-cat-option-item ${value === 'all' || !value ? 'selected' : ''}`}
                onClick={() => handleSelect('all')}
                role="option"
                aria-selected={value === 'all' || !value}
              >
                <div className="admin-cat-option-left">
                  <span className="admin-cat-option-name">{allLabel}</span>
                  {itemCounts['all'] !== undefined && (
                    <span className="admin-cat-option-count">({itemCounts['all']})</span>
                  )}
                </div>
                {(value === 'all' || !value) && (
                  <Check size={15} className="admin-cat-check-icon" />
                )}
              </button>
            )}

            {filteredList.length === 0 ? (
              <div className="admin-cat-empty">
                No matching category found
              </div>
            ) : (
              filteredList.map((cat) => {
                const isSelected = value === cat.id;
                const count = itemCounts[cat.id];

                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`admin-cat-option-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(cat.id)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="admin-cat-option-left">
                      <span className="admin-cat-option-name">{cat.name}</span>
                      {count !== undefined && (
                        <span className="admin-cat-option-count">({count})</span>
                      )}
                    </div>
                    {isSelected && (
                      <Check size={15} className="admin-cat-check-icon" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySelectDropdown;
