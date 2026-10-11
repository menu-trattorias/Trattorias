import React from 'react';
import MenuItem from './MenuItem';

export const MenuSection = ({ sectionId, title, subtitle, items, onOpenModal }) => {
  if (!items || items.length === 0) return null;

  const cleanSubtitle = subtitle ? subtitle.replace(/^\(|\)$/g, '').trim() : '';

  return (
    <section id={sectionId} className="menu-section" style={{ scrollMarginTop: '130px' }}>
      <h2 className="section-title">
        <span className="section-title-text">{title}</span>
        {cleanSubtitle && (
          <span className="section-badge">
            {cleanSubtitle}
          </span>
        )}
        <span className="line"></span>
      </h2>
      <div className="menu-card">
        <div className="menu-card-list">
          {items.map((item) => (
            <MenuItem key={item.id} item={item} onOpenModal={onOpenModal} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default MenuSection;
