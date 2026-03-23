import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface Service {
  id: number;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  port: number;
  path_prefix: string;
  status: 'pending' | 'active' | 'disabled';
}

const API = import.meta.env.VITE_API_GATEWAY_URL ||
  (window.location.protocol === 'https:'
    ? window.location.origin
    : `http://${window.location.hostname}:8080`);

export default function Dashboard() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/registry`)
      .then((r) => r.json())
      .then((data) => setServices(Array.isArray(data) ? data : []))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="dashboard">
      <div className="dashboard-hero">
        <h1>Welcome back, {user!.displayName.split(' ')[0]}</h1>
        <p>Select a service to launch it in a new window.</p>
      </div>

      {loading ? (
        <p className="dashboard-status">Loading services...</p>
      ) : services.length === 0 ? (
        <p className="dashboard-status">
          No services registered yet. An admin can register services under Settings.
        </p>
      ) : (
        <div className="service-grid">
          {services.map((svc) => (
            <div key={svc.id} className={`service-card ${svc.status}`}>
              <div className="service-card-icon">{svc.icon || '🔧'}</div>
              <div className="service-card-body">
                <div className="service-card-header">
                  <h3>{svc.display_name}</h3>
                  <span className={`status-badge ${svc.status}`}>
                    {svc.status === 'active'
                      ? 'Active'
                      : svc.status === 'pending'
                      ? 'Pending'
                      : 'Disabled'}
                  </span>
                </div>
                <p>{svc.description}</p>
              </div>
              <div className="service-card-footer">
                {svc.status === 'active' ? (
                  <a
                    href={svc.path_prefix}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="launch-btn"
                  >
                    Launch ↗
                  </a>
                ) : (
                  <button className="launch-btn disabled" disabled>
                    {svc.status === 'pending' ? 'Pending Deploy' : 'Disabled'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
