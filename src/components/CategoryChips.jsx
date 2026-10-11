import React, { useRef, useEffect } from 'react';
import DynamicIcon from './DynamicIcon';

export const CategoryChips = ({ categories, activeCategory, onSelectCategory }) => {
  const chipsContainerRef = useRef(null);

  useEffect(() => {
    if (chipsContainerRef.current) {
      const activeChip = chipsContainerRef.current.querySelector('.chip-item.active');
      if (activeChip) {
        const container = chipsContainerRef.current;
        const chipLeft = activeChip.offsetLeft;
        const chipWidth = activeChip.offsetWidth;
        const containerWidth = container.clientWidth;
        
        container.scrollTo({
          left: Math.max(0, chipLeft - containerWidth / 2 + chipWidth / 2),
          behavior: 'smooth'
        });
      }
    }
  }, [activeCategory]);

  return (
    <div className="category-chips" id="category-chips" ref={chipsContainerRef}>
      {categories.map((cat) => {
        const isActive = activeCategory === cat.id;
        return (
          <div
            key={cat.id}
            className={`chip-item ${isActive ? 'active' : ''}`}
            onClick={() => onSelectCategory(cat.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectCategory(cat.id);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="chip-circle">
              <DynamicIcon name={cat.icon || 'utensils'} size={18} />
            </div>
            <span className="chip-label">{cat.name}</span>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryChips;
