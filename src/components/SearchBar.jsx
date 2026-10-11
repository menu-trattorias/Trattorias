import React from 'react';
import { Search, X } from 'lucide-react';

export const SearchBar = ({ searchQuery, onSearchChange, onClearSearch }) => {
  return (
    <div className="search-bar">
      <Search size={18} className="search-icon" />
      <input
        type="text"
        placeholder="Search by name, price (e.g. 270), category..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        autoComplete="off"
      />
      {searchQuery && (
        <button
          type="button"
          className="search-clear-btn"
          onClick={onClearSearch}
          aria-label="Clear search"
          style={{ display: 'flex' }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
