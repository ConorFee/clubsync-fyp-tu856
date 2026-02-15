import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Static placeholder — no backend auth yet
    // In Phase 2 (Week 4), this will call Django auth endpoint
    if (username && password) {
      navigate('/calendar');
    } else {
      setError('Please enter both username and password.');
    }
  };

  return (
    <div className="login-page">
      {/* Top bar with logo */}
      <nav className="login-topbar">
        <span className="login-logo">ClubSync</span>
      </nav>

      <div className="container-fluid login-content">
        <div className="row min-vh-100">
          {/* Left side — Login form */}
          <div className="col-md-6 d-flex align-items-center justify-content-center login-form-side">
            <div className="login-form-container">
              <h2 className="login-heading">Login</h2>

              {error && <div className="alert alert-danger">{error}</div>}

              <form onSubmit={handleLogin}>
                <div className="mb-3 input-icon-group">
                  <span className="input-icon">&#128100;</span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="mb-3 input-icon-group">
                  <span className="input-icon">&#128274;</span>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="d-grid">
                  <button type="submit" className="btn btn-primary btn-login">
                    Login
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right side — Branding */}
          <div className="col-md-6 d-flex align-items-center justify-content-center login-brand-side">
            <div className="login-brand-content text-center">
              <h1 className="brand-title">ClubSync</h1>
              <p className="brand-tagline">
                Eliminate scheduling conflicts in your GAA club.
              </p>
              <p className="brand-subtitle">
                Automated pitch booking, conflict-free scheduling,
                and seamless coordination for your club.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="login-footer">
        <span>ClubSync &copy; 2026 — TU Dublin Final Year Project</span>
      </footer>
    </div>
  );
}
