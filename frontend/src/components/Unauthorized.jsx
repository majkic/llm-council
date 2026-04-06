import './Unauthorized.css';

export default function Unauthorized({ email, onLogout }) {
  return (
    <div className="unauthorized-container">
      <div className="unauthorized-card">
        <div className="lock-icon">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h1>Council Access Denied</h1>
        <p className="message">
          Your account <strong>{email}</strong> is not authorized to access the LLM Council.
        </p>
        <p className="subtext">
          Admission to the Council is strictly limited to authorized administrators.
        </p>
        <div className="actions">
          <button className="switch-account-btn" onClick={onLogout}>
            Sign in with a different account
          </button>
        </div>
      </div>
    </div>
  );
}
