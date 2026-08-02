import { useState, useEffect, useRef } from 'react';

/**
 * Search and filter bar for the menu.
 *
 * Migrated from search-filters.css. That file also held the wishlist button,
 * dietary tags and rating row for the menu cards, which had nothing to do with
 * filtering; those moved to styles/shop.js with the rest of the card pattern.
 */

// Width lives on the two callers rather than here, because utilities touching
// the same property are resolved by stylesheet order, not by the order they
// appear in a class string — appending `w-20` to a base holding `w-full` is
// not a reliable override.
const controlBase =
  'rounded-[5px] border border-solid border-[#3a3a3a] bg-[#1a1a1a] p-2 text-white';

const selectClass = `${controlBase} w-full`;
const priceInputClass = `${controlBase} w-20`;

const groupLabel = 'mb-2 block text-s font-bold text-secondary';

const DIETARY = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free'];

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
      ? dietary.filter((d) => d !== value)
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
    <div className="mx-auto my-[30px] max-w-[1200px] px-5">
      <div className="relative mb-5">
        <i
          className="fas fa-search absolute left-[15px] top-1/2 -translate-y-1/2 text-secondary"
          aria-hidden="true"
        ></i>
        <input
          type="text"
          placeholder="Search menu items..."
          value={search}
          onChange={handleSearchChange}
          className="w-full rounded-s border-2 border-solid border-[#3a3a3a] bg-[#2a2a2a] py-3 pl-[45px] pr-3 text-n text-white focus:border-secondary focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[15px] rounded-s bg-[#2a2a2a] p-5 max-[768px]:grid-cols-1">
        <div>
          <label className={groupLabel}>Category</label>
          <select value={category} onChange={handleCategoryChange} className={selectClass}>
            <option value="">All Categories</option>
            <option value="coffee">Coffee</option>
            <option value="tea">Tea</option>
            <option value="snacks">Snacks</option>
            <option value="pastries">Pastries</option>
          </select>
        </div>

        <div>
          <label className={groupLabel}>Dietary</label>
          <div className="flex flex-col gap-2">
            {DIETARY.map((option) => (
              // `text-s mb-2` are inherited by accident in the old CSS: the
              // group-label rule matched these checkbox labels too, handing
              // them a 0.9rem size and an 8px bottom margin that the
              // checkbox-group rule never overrode. Both are load-bearing —
              // the size alone leaves each row 8px short.
              <label
                key={option}
                className="mb-2 flex items-center gap-2 text-s font-normal text-white"
              >
                <input
                  type="checkbox"
                  value={option}
                  checked={dietary.includes(option)}
                  onChange={handleDietaryChange}
                  className="h-4 w-4"
                />
                {option}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className={groupLabel}>Price Range</label>
          <div className="flex items-center gap-2.5">
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => handlePriceChange(e.target.value, maxPrice)}
              className={priceInputClass}
            />
            <span>-</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => handlePriceChange(minPrice, e.target.value)}
              className={priceInputClass}
            />
          </div>
        </div>

        <div>
          <label className={groupLabel}>Sort By</label>
          <select value={sortBy} onChange={handleSortChange} className={selectClass}>
            <option value="">Default</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
            <option value="popular">Most Popular</option>
          </select>
        </div>

        <button
          className="cursor-pointer self-end rounded-[5px] border-none bg-[#f44336] px-5 py-2.5 text-white transition-all duration-300 hover:bg-[#d32f2f]"
          onClick={clearFilters}
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
};

export default SearchFilters;
