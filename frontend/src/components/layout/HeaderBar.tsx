import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './HeaderBar.css';

export default function HeaderBar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const displayName = user
    ? user.first_name || user.username
    : 'User';

  return (
    <header className="header-bar">
      <div className="header-left">
        <span className="header-logo">ClubSync</span>
        <span className="header-divider">—</span>
        <span className="header-club">An Tochar GAA</span>
      </div>

      <div className="header-right">
        <div className="header-user">
          <span className="header-username">{displayName}</span>
          <button className="btn btn-sm btn-outline-light" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
