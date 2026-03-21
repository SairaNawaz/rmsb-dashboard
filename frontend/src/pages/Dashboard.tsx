import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Service {
  id: string;
  name: string;
  description: string;
  url: string | null;
  status: 'active' | 'coming-soon';
  icon: string;
}

const SERVICES: Service[] = [
  {
    id: 's1',
    name: 'Device Management',
    description: 'Register, assign, and track all devices across the organisation.',
    url: 'http://localhost:3001',
    status: 'active',
    icon: '💻',
  },
  {
    id: 's2',
    name: 'Capacity Planning',
    description: 'Submit leave requests and view team capacity at a glance.',
    url: 'http://localhost:3002',
    status: 'active',
    icon: '📅',
  },
  {
    id: 's3',
    name: 'Asset Tracking',
    description: 'Track physical assets across locations and departments.',
    url: null,
    status: 'coming-soon',
    icon: '📦',
  },
  {
    id: 's4',
    name: 'Incident Management',
    description: 'Log, triage, and resolve incidents across teams.',
    url: null,
    status: 'coming-soon',
    icon: '🚨',
  },
  {
    id: 's5',
    name: 'Procurement',
    description: 'Manage purchase requests and vendor approvals.',
    url: null,
    status: 'coming-soon',
    icon: '🛒',
  },
  {
    id: 's6',
    name: 'Reporting',
    description: 'Cross-service analytics and exportable reports.',
    url: null,
    status: 'coming-soon',
    icon: '📊',
  },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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

      <div className="dashboard">
        <div className="dashboard-hero">
          <h1>Welcome back, {user!.displayName.split(' ')[0]}</h1>
          <p>Select a service to launch it in a new window.</p>
        </div>

        <div className="service-grid">
          {SERVICES.map((svc) => (
            <div key={svc.id} className={`service-card ${svc.status}`}>
              <div className="service-card-icon">{svc.icon}</div>
              <div className="service-card-body">
                <div className="service-card-header">
                  <h3>{svc.name}</h3>
                  <span className={`status-badge ${svc.status}`}>
                    {svc.status === 'active' ? 'Active' : 'Coming Soon'}
                  </span>
                </div>
                <p>{svc.description}</p>
              </div>
              <div className="service-card-footer">
                {svc.status === 'active' ? (
                  <a
                    href={svc.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="launch-btn"
                  >
                    Launch ↗
                  </a>
                ) : (
                  <button className="launch-btn disabled" disabled>
                    Coming Soon
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
