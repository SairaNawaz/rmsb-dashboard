import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'Administrator';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="shell">
      <header className="shell-header">
        <span className="shell-brand">⬡ RMSB Platform</span>
        <div className="shell-user">
          <span className="shell-user-name">{user!.displayName}</span>
          <span className="shell-user-role">{user!.role}</span>
          <button className="shell-logout" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <div className="shell-body">
        <nav className="sidebar">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <span className="sidebar-icon">⊞</span> Dashboard
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/settings"
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <span className="sidebar-icon">⚙</span> Settings
            </NavLink>
          )}
        </nav>

        <main className="shell-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
