import { useNavigate } from 'react-router-dom';
import './HeaderBar.css';

export default function HeaderBar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Phase 2 (Week 4): Clear auth token/session
    navigate('/');
  };

  return (
    <header className="header-bar">
      <div className="header-left">
        <span className="header-logo">ClubSync</span>
        <span className="header-divider">—</span>
        <span className="header-club">An Tochar GAA</span>
      </div>

      <div className="header-right">
        {/* Phase 2: notification bell goes here */}
        <div className="header-user">
          <span className="header-username">Admin</span>
          <button className="btn btn-sm btn-outline-light" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
