import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { textOnGlass, textOnGlassSoft, hoverOnGlass, borderOnGlass } from '../styles/glass';

/**
 * Shell for the admin console.
 *
 * Deliberately unlike the customer site: a compact top bar rather than the
 * floating bottom nav, so it is obvious at a glance which of the two you are
 * looking at. It also carries only the two staff links, which is what let the
 * customer navbar shed Dashboard and Analytics -- with those in it, seven
 * links wrapped onto a second line and pushed page headings underneath the
 * fixed header.
 */

const linkBase = `rounded-m px-4 py-2 text-n font-medium no-underline transition-colors duration-200 ${textOnGlass} ${hoverOnGlass}`;
const linkActive = 'bg-[rgba(243,150,28,0.18)] text-secondary';

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-dark">
      <header className="sticky top-0 z-20 border-x-0 border-b border-t-0 border-solid border-[rgba(255,255,255,0.12)] bg-primary">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            <img src="/img/logo.png" alt="" className="h-10 w-auto" />
            <span className="rounded-s bg-secondary px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
              Admin Console
            </span>
          </div>

          <nav className="flex items-center gap-1">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) => `${linkBase} ${isActive ? linkActive : ''}`}
            >
              <i className="fas fa-gauge mr-2" aria-hidden="true"></i>Dashboard
            </NavLink>
            <NavLink
              to="/admin/analytics"
              className={({ isActive }) => `${linkBase} ${isActive ? linkActive : ''}`}
            >
              <i className="fas fa-chart-line mr-2" aria-hidden="true"></i>Analytics
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className={`text-s ${textOnGlassSoft}`}>
              <i className="fa-solid fa-user-shield mr-2" aria-hidden="true"></i>
              {user?.name}
            </span>
            {/* Escape hatch: staff are customers too, and without this the
                only way back to the shop is editing the address bar. */}
            <button
              onClick={() => navigate('/home')}
              className={`cursor-pointer rounded-m border border-solid bg-transparent px-3 py-2 text-s text-white transition-colors duration-200 hover:bg-[rgba(255,255,255,0.1)] ${borderOnGlass}`}
            >
              View shop
            </button>
            <button
              onClick={handleLogout}
              className="cursor-pointer rounded-m border-none bg-secondary px-4 py-2 text-s font-bold text-primary transition-transform duration-200 hover:-translate-y-0.5"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main id="main-content">{children}</main>
    </div>
  );
};

export default AdminLayout;
