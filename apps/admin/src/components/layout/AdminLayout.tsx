import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearAdminToken } from '../../lib/api';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard', emoji: '◎' },
  { to: '/moderation', label: 'Moderation', emoji: '⚠' },
  { to: '/verifications', label: 'Verifications', emoji: '✓' },
  { to: '/listings', label: 'Listings', emoji: '◻' },
  { to: '/events', label: 'Events', emoji: '◈' },
  { to: '/posts', label: 'Community Posts', emoji: '✎' },
  { to: '/users', label: 'Users', emoji: '◯' },
  { to: '/leads', label: 'Leads', emoji: '→' },
  { to: '/revenue', label: 'Revenue', emoji: '$' },
  { to: '/cities', label: 'Cities', emoji: '⊕' },
  { to: '/notifications-log', label: 'Push Notifications', emoji: '🔔' },
  { to: '/audit-logs', label: 'Audit Logs', emoji: '☰' },
  { to: '/support', label: 'Support', emoji: '?' },
  { to: '/settings', label: 'Settings', emoji: '⚙' },
];

export function AdminLayout() {
  const navigate = useNavigate();

  const handleSignOut = () => {
    clearAdminToken();
    navigate('/login', { replace: true });
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0D0D0D', color: '#F5F5F5', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <aside style={{ width: 220, borderRight: '1px solid #2A2A2A', padding: '24px 0', flexShrink: 0, overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #2A2A2A' }}>
          <span style={{ color: '#D4A853', fontSize: 18, fontWeight: 600 }}>Muzgram Admin</span>
        </div>
        <nav style={{ marginTop: 16, flex: 1 }}>
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 20px',
                color: isActive ? '#D4A853' : '#A0A0A0',
                backgroundColor: isActive ? '#D4A85315' : 'transparent',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                borderLeft: isActive ? '2px solid #D4A853' : '2px solid transparent',
              })}
            >
              <span>{link.emoji}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '16px 20px', borderTop: '1px solid #2A2A2A' }}>
          <button
            onClick={handleSignOut}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: 'transparent',
              border: '1px solid #2A2A2A',
              borderRadius: 6,
              color: '#606060',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
