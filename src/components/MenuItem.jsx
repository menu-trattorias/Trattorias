import React from 'react';

export const MenuItem = ({ item, onOpenModal }) => {
  const hasVariants = Array.isArray(item.variants) && item.variants.length > 0;
  const isAvailable = item.is_available !== false;

  return (
    <article
      className={`menu-card-item ${!isAvailable ? 'is-sold-out' : ''}`}
      itemScope
      itemType="https://schema.org/MenuItem"
      onClick={() => onOpenModal && onOpenModal(item)}
      style={{ cursor: 'pointer', opacity: isAvailable ? 1 : 0.68 }}
    >
      <div className="menu-item-header">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            itemProp="image"
            className="menu-item-thumb"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}
        <div className="menu-item-info">
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            <h3 className="menu-item-name" itemProp="name">{item.name}</h3>
            {!isAvailable && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: '600',
                  color: '#991b1b',
                  background: '#fee2e2',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em'
                }}
              >
                Sold Out
              </span>
            )}
          </div>
          {item.description && <span className="inline-desc" itemProp="description">{item.description}</span>}
        </div>
        <div className="menu-item-dots"></div>
        {hasVariants ? (
          <div className="variant-prices-wrap">
            {item.variants.map((v, idx) => (
              <span
                key={idx}
                className="menu-item-price"
                itemProp="offers"
                itemScope
                itemType="https://schema.org/Offer"
              >
                <meta itemProp="priceCurrency" content="INR" />
                <span itemProp="price">{v.name ? `${v.name} ${v.price}` : v.price}</span>
              </span>
            ))}
          </div>
        ) : (
          <span
            className="menu-item-price"
            itemProp="offers"
            itemScope
            itemType="https://schema.org/Offer"
          >
            <meta itemProp="priceCurrency" content="INR" />
            <span itemProp="price">{item.price}</span>
          </span>
        )}
      </div>
      {item.description && (
        <div className="menu-item-desc" style={{ display: 'none' }} itemProp="description">
          {item.description}
        </div>
      )}
    </article>
  );
};

export default MenuItem;
