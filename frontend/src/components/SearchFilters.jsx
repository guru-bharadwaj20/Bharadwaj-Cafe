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

  const activeCount =
    dietary.length + (category ? 1 : 0) + (sortBy ? 1 : 0) + (minPrice || maxPrice ? 1 : 0);

  return (
    <div className="mx-auto my-[30px] w-full max-w-[1200px] px-5">
      <div className="rounded-[20px] border border-solid border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 sm:p-5">
        {/* Search, as the one obviously primary control. */}
        <div className="relative">
          <i
            className="fas fa-search pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.4)]"
            aria-hidden="true"
          ></i>
          <input
            type="text"
            placeholder="Search menu items..."
            value={search}
            onChange={handleSearchChange}
            aria-label="Search menu items"
            className="w-full rounded-m border border-solid border-[rgba(255,255,255,0.1)] bg-[rgba(0,0,0,0.25)] py-3.5 pl-14 pr-4 text-n text-white placeholder:text-[rgba(255,255,255,0.35)] focus:border-secondary focus:outline-none"
          />
        </div>

        {/* Dietary as toggles rather than a column of checkboxes: five stacked
            rows were what made this panel taller than everything in it. */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-s text-[rgba(255,255,255,0.45)]">Dietary</span>
          {DIETARY.map((option) => {
            const on = dietary.includes(option);
            return (
              <button
                key={option}
                type="button"
                value={option}
                onClick={handleDietaryChange}
                aria-pressed={on}
                className={`cursor-pointer rounded-m border border-solid px-3.5 py-1.5 text-s transition-colors duration-200 ${
                  on
                    ? 'border-secondary bg-secondary font-semibold text-primary'
                    : 'border-[rgba(255,255,255,0.15)] bg-transparent text-[rgba(255,255,255,0.75)] hover:border-[rgba(255,255,255,0.35)] hover:text-white'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3 border-x-0 border-b-0 border-t border-solid border-[rgba(255,255,255,0.08)] pt-4">
          <div className="min-w-[150px] flex-1">
            <label htmlFor="filter-category" className={groupLabel}>
              Category
            </label>
            <select
              id="filter-category"
              value={category}
              onChange={handleCategoryChange}
              className={selectClass}
            >
              <option value="">All Categories</option>
              <option value="coffee">Coffee</option>
              <option value="tea">Tea</option>
              <option value="snacks">Snacks</option>
              <option value="pastries">Pastries</option>
            </select>
          </div>

          <div className="min-w-[150px] flex-1">
            <label htmlFor="filter-sort" className={groupLabel}>
              Sort by
            </label>
            <select
              id="filter-sort"
              value={sortBy}
              onChange={handleSortChange}
              className={selectClass}
            >
              <option value="">Default</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>

          <div>
            <span className={groupLabel}>Price</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                aria-label="Minimum price"
                value={minPrice}
                onChange={(e) => handlePriceChange(e.target.value, maxPrice)}
                className={priceInputClass}
              />
              <span className="text-[rgba(255,255,255,0.35)]">–</span>
              <input
                type="number"
                placeholder="Max"
                aria-label="Maximum price"
                value={maxPrice}
                onChange={(e) => handlePriceChange(minPrice, e.target.value)}
                className={priceInputClass}
              />
            </div>
          </div>

          {/* Only offered when there is something to clear, and quiet rather
              than a red block competing with the menu itself. */}
          {activeCount > 0 && (
            <button
              onClick={clearFilters}
              className="ml-auto flex cursor-pointer items-center gap-2 rounded-m border border-solid border-[rgba(255,255,255,0.15)] bg-transparent px-4 py-2.5 text-s text-[rgba(255,255,255,0.75)] transition-colors duration-200 hover:border-[#f44336] hover:text-white"
            >
              <i className="fas fa-xmark" aria-hidden="true"></i>
              Clear {activeCount} filter{activeCount === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchFilters;
