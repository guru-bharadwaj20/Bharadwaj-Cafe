import { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  glassPanel,
  glassMenu,
  textOnGlass,
  textOnGlassFaint,
  hoverOnGlass,
  activeOnGlass,
} from '../styles/glass';

/**
 * The customer navigation, floating at the bottom of the viewport.
 *
 * Replaces the fixed top header. Two things drove the move:
 *
 * - The old bar carried up to seven links and wrapped onto a second line for
 *   staff, which made it taller than the 100px of top padding every page
 *   allows for, so headings on Order, Merchandise, Contact and Analytics were
 *   painted underneath it. Docking the nav at the bottom means page content no
 *   longer competes with it for the top of the screen, and the staff links now
 *   live in the admin console instead.
 *
 * - The cart button lived in `.mobile-icons`, which style.css sets to
 *   `display: none` above 768px. On a desktop there was no way to reach the
 *   cart at all short of typing the URL. It is now a permanent item with a
 *   count badge.
 *
 * The bar is translucent over a blur rather than a solid colour, so it picks
 * up whatever is behind it -- the maroon tint keeps it legible on the light
 * About and Contact pages as well as the dark shop pages.
 */

const item = [
  'relative flex flex-col items-center gap-1 rounded-m px-3 py-2 sm:px-4',
  'text-[11px] font-medium no-underline transition-colors duration-200',
  textOnGlass,
  hoverOnGlass,
].join(' ');

const itemActive = activeOnGlass;

const icon = 'text-[18px]';

const menuLink = [
  'flex items-center gap-3 rounded-s px-4 py-2.5 text-s no-underline',
  'transition-colors duration-200',
  textOnGlass,
  hoverOnGlass,
].join(' ');

const FloatingNav = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { getTotalItems, dismissLastAdded } = useCart();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Escape closes the account menu, matching the dropdown it replaces.
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && setShowMenu(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const handleLogout = () => {
    logout();
    setShowMenu(false);
    navigate('/');
  };

  const count = getTotalItems();
  const link = ({ isActive }) => `${item} ${isActive ? itemActive : ''}`;

  return (
    <nav
      aria-label="Main"
      className={[
        'fixed bottom-4 left-1/2 z-30 -translate-x-1/2',
        'flex items-center gap-1 rounded-m px-2 py-1.5',
        glassPanel,
        'max-[420px]:gap-0 max-[420px]:px-1',
      ].join(' ')}
    >
      <NavLink to="/home" className={link}>
        <i className={`fas fa-house ${icon}`} aria-hidden="true"></i>
        Home
      </NavLink>
      <NavLink to="/order" className={link}>
        <i className={`fas fa-mug-hot ${icon}`} aria-hidden="true"></i>
        Order
      </NavLink>
      <NavLink to="/merchandise" className={link}>
        <i className={`fas fa-shirt ${icon}`} aria-hidden="true"></i>
        Shop
      </NavLink>

      <NavLink
        to="/cart"
        className={link}
        aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
      >
        <span className="relative">
          <i className={`fas fa-shopping-cart ${icon}`} aria-hidden="true"></i>
          {count > 0 && (
            <span className="absolute -right-2.5 -top-1.5 min-w-[18px] rounded-circle bg-secondary px-1 text-[10px] font-bold leading-[18px] text-primary">
              {count}
            </span>
          )}
        </span>
        Cart
      </NavLink>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          className={`${item} cursor-pointer border-none bg-transparent ${showMenu ? itemActive : ''}`}
          // The toast sits directly above this bar, which is where the menu
          // opens into. Retire it rather than let the two stack.
          onClick={() => {
            dismissLastAdded();
            setShowMenu((open) => !open);
          }}
          aria-expanded={showMenu}
          aria-haspopup="true"
        >
          <i className={`fa-solid fa-user ${icon}`} aria-hidden="true"></i>
          Account
        </button>

        {showMenu && (
          // Opens upward: there is nothing below a bar docked to the bottom.
          <div
            className={`absolute bottom-[calc(100%+12px)] right-0 w-[220px] overflow-hidden rounded-[14px] p-2 ${glassMenu}`}
          >
            <p
              className={`truncate px-4 py-2 text-[11px] uppercase tracking-wide ${textOnGlassFaint}`}
            >
              {user?.name}
            </p>
            <Link to="/profile" className={menuLink} onClick={() => setShowMenu(false)}>
              <i className="fa-solid fa-user-circle w-4" aria-hidden="true"></i>My Profile
            </Link>
            <Link to="/order-history" className={menuLink} onClick={() => setShowMenu(false)}>
              <i className="fa-solid fa-receipt w-4" aria-hidden="true"></i>My Orders
            </Link>
            <Link to="/wishlist" className={menuLink} onClick={() => setShowMenu(false)}>
              <i className="fa-solid fa-heart w-4" aria-hidden="true"></i>Wishlist
            </Link>
            <Link to="/addresses" className={menuLink} onClick={() => setShowMenu(false)}>
              <i className="fa-solid fa-location-dot w-4" aria-hidden="true"></i>Addresses
            </Link>
            <Link to="/loyalty" className={menuLink} onClick={() => setShowMenu(false)}>
              <i className="fa-solid fa-medal w-4" aria-hidden="true"></i>Loyalty
            </Link>
            <Link to="/about" className={menuLink} onClick={() => setShowMenu(false)}>
              <i className="fa-solid fa-circle-info w-4" aria-hidden="true"></i>About Us
            </Link>
            <Link to="/contact" className={menuLink} onClick={() => setShowMenu(false)}>
              <i className="fa-solid fa-envelope w-4" aria-hidden="true"></i>Contact Us
            </Link>

            {user?.role === 'admin' && (
              <Link to="/admin" className={menuLink} onClick={() => setShowMenu(false)}>
                <i className="fa-solid fa-user-shield w-4" aria-hidden="true"></i>Admin Console
              </Link>
            )}

            <button
              className={`${menuLink} w-full cursor-pointer border-none bg-transparent text-left`}
              onClick={handleLogout}
            >
              <i className="fa-solid fa-right-from-bracket w-4" aria-hidden="true"></i>Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default FloatingNav;
