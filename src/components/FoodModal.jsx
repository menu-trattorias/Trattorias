import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export const FoodModal = ({ item, onClose }) => {
  if (!item) return null;

  const variants = Array.isArray(item.variants) ? item.variants : [];
  const [selectedVariant, setSelectedVariant] = useState(variants[0] || null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="food-modal-overlay active"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="food-modal-title"
    >
      <div className="food-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Hero Image if available */}
        {item.image_url ? (
          <div className="food-modal-hero">
            <button
              className="food-modal-close-btn floating"
              onClick={onClose}
              aria-label="Close dish details"
              type="button"
            >
              <X size={18} />
            </button>
            <img
              src={item.image_url}
              alt={item.name}
              className="food-modal-hero-img"
              onError={(e) => {
                e.currentTarget.parentElement.style.display = 'none';
              }}
            />
            <div className="food-modal-hero-gradient" />
          </div>
        ) : null}

        {/* Modal Body */}
        <div className="food-modal-content">
          {/* Header Row: Title on Left, Price & Close Button on Right */}
          <div className="food-modal-header-row">
            <h2 id="food-modal-title" className="food-modal-heading">
              {item.name}
            </h2>
            <div className="food-modal-header-actions">
              {variants.length === 0 && item.price && (
                <span className="food-modal-single-price">{item.price}</span>
              )}
              {!item.image_url && (
                <button
                  className="food-modal-close-btn static"
                  onClick={onClose}
                  aria-label="Close dish details"
                  type="button"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {item.is_available === false && (
            <div style={{ marginBottom: '10px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#991b1b',
                  background: '#fee2e2',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em'
                }}
              >
                Currently Unavailable / Sold Out
              </span>
            </div>
          )}

          {/* Dish Description */}
          {item.description && (
            <p className="food-modal-description">{item.description}</p>
          )}

          {/* Variants / Options Section */}
          {variants.length > 0 && (
            <div className="food-modal-options-section">
              <div className="food-modal-options-header">
                <span className="options-title">Select Option</span>
              </div>

              <div className="food-modal-options-list">
                {variants.map((v, i) => {
                  const isSelected = selectedVariant?.name === v.name;

                  return (
                    <button
                      key={i}
                      type="button"
                      className={`food-option-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedVariant(v)}
                    >
                      <div className="food-option-left">
                        <span className="food-option-radio">
                          {isSelected && <span className="radio-inner" />}
                        </span>
                        <span className="food-option-name">{v.name}</span>
                      </div>
                      <span className="food-option-price">{v.price}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FoodModal;
