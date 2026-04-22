import { NavLink, Outlet } from 'react-router-dom';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard', emoji: '◎' },
  { to: '/moderation', label: 'Moderation Queue', emoji: '⚠' },
  { to: '/listings', label: 'Listings', emoji: '◻' },
  { to: '/events', label: 'Events', emoji: '◈' },
  { to: '/posts', label: 'Community Posts', emoji: '✎' },
  { to: '/users', label: 'Users', emoji: '◯' },
];

export function AdminLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0D0D0D', color: '#F5F5F5', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: 220, borderRight: '1px solid #2A2A2A', padding: '24px 0', flexShrink: 0 }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #2A2A2A' }}>
          <span style={{ color: '#D4A853', fontSize: 18, fontWeight: 600 }}>Muzgram Admin</span>
        </div>
        <nav style={{ marginTop: 16 }}>
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
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
