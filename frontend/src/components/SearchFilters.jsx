import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';

const SearchFilters = ({ onFilterChange }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [dietary, setDietary] = useState([]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('');
  const searchTimeoutRef = useRef(null);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for debouncing
    searchTimeoutRef.current = setTimeout(() => {
      applyFilters({ search: value, category, dietary, minPrice, maxPrice, sortBy });
    }, 500);
  };

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    applyFilters({ search, category: e.target.value, dietary, minPrice, maxPrice, sortBy });
  };

  const handleDietaryChange = (e) => {
    const value = e.target.value;
    const newDietary = dietary.includes(value)
      ? dietary.filter(d => d !== value)
      : [...dietary, value];
    setDietary(newDietary);
    
    // Use setTimeout to ensure state is updated
    setTimeout(() => {
      applyFilters({ search, category, dietary: newDietary, minPrice, maxPrice, sortBy });
    }, 0);
  };

  const handlePriceChange = (min, max) => {
    setMinPrice(min);
    setMaxPrice(max);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce price changes too
    searchTimeoutRef.current = setTimeout(() => {
      applyFilters({ search, category, dietary, minPrice: min, maxPrice: max, sortBy });
    }, 500);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    applyFilters({ search, category, dietary, minPrice, maxPrice, sortBy: e.target.value });
  };

  const applyFilters = (filters) => {
    onFilterChange(filters);
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setDietary([]);
    setMinPrice('');
    setMaxPrice('');
    setSortBy('');
    onFilterChange({});
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="search-filters">
      <div className="search-bar">
        <i className="fas fa-search"></i>
        <input
          type="text"
          placeholder="Search menu items..."
          value={search}
          onChange={handleSearchChange}
        />
      </div>

      <div className="filters-container">
        <div className="filter-group">
          <label>Category</label>
          <select value={category} onChange={handleCategoryChange}>
            <option value="">All Categories</option>
            <option value="coffee">Coffee</option>
            <option value="tea">Tea</option>
            <option value="snacks">Snacks</option>
            <option value="pastries">Pastries</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Dietary</label>
          <div className="checkbox-group">
            {['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free'].map(option => (
              <label key={option}>
                <input
                  type="checkbox"
                  value={option}
                  checked={dietary.includes(option)}
                  onChange={handleDietaryChange}
                />
                {option}
              </label>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>Price Range</label>
          <div className="price-inputs">
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => handlePriceChange(e.target.value, maxPrice)}
            />
            <span>-</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => handlePriceChange(minPrice, e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group">
          <label>Sort By</label>
          <select value={sortBy} onChange={handleSortChange}>
            <option value="">Default</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
            <option value="popular">Most Popular</option>
          </select>
        </div>

        <button className="btn-clear-filters" onClick={clearFilters}>
          Clear Filters
        </button>
      </div>
    </div>
  );
};

export default SearchFilters;
