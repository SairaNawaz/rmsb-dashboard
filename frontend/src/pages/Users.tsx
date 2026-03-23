import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface GraphUser {
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
  jobTitle: string | null;
  department: string | null;
}

interface PlatformUser {
  id: number;
  email: string;
  role: string;
}

interface MergedUser {
  id: string;
  displayName: string;
  email: string;
  jobTitle: string | null;
  department: string | null;
  platformRole: string | null;
  platformId: number | null;
}

const API = (import.meta.env.VITE_API_GATEWAY_URL ||
  (window.location.protocol === 'https:'
    ? window.location.origin
    : `http://${window.location.hostname}:8080`)) + '/api';

const ROLES = ['Viewer', 'Admin', 'SuperAdmin'];

export default function Users() {
  const { user, refreshGraphToken } = useAuth();
  const isSuperAdmin = user?.role === 'SuperAdmin';

  const [users, setUsers] = useState<MergedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function getToken(): Promise<string | null> {
    const stored = localStorage.getItem('rmsb_graph_token');
    if (stored) return stored;
    return refreshGraphToken();
  }

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      if (!token) throw new Error('No Graph token — please sign out and sign in again');

      const [graphRes, platformRes] = await Promise.all([
        fetch(`${API}/graph/users`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/users`),
      ]);

      if (!graphRes.ok) {
        const err = await graphRes.json();
        throw new Error(err.error?.message || 'Failed to load org users');
      }

      const graphUsers: GraphUser[] = await graphRes.json();
      const platformUsers: PlatformUser[] = platformRes.ok ? await platformRes.json() : [];

      const platformMap = new Map(platformUsers.map((u) => [u.email.toLowerCase(), u]));

      const merged: MergedUser[] = graphUsers.map((g) => {
        const email = (g.mail || g.userPrincipalName).toLowerCase();
        const platform = platformMap.get(email);
        return {
          id: g.id,
          displayName: g.displayName,
          email: g.mail || g.userPrincipalName,
          jobTitle: g.jobTitle,
          department: g.department,
          platformRole: platform?.role ?? null,
          platformId: platform?.id ?? null,
        };
      });

      setUsers(merged);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  async function handleRoleChange(u: MergedUser, role: string) {
    if (u.platformId) {
      await fetch(`${API}/users/${u.platformId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
    } else {
      await fetch(`${API}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u.email, display_name: u.displayName, role, added_by: user?.email }),
      });
    }
    loadUsers();
  }

  async function handleRemove(platformId: number) {
    if (!confirm('Remove platform role? User reverts to Viewer on next login.')) return;
    await fetch(`${API}/users/${platformId}`, { method: 'DELETE' });
    loadUsers();
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <h1>Users</h1>
          <p>All users in your organisation. Assign platform roles as needed.</p>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="services-table-wrap">
        {loading ? (
          <p className="table-empty">Loading organisation users...</p>
        ) : (
          <table className="services-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Job Title</th>
                <th>Department</th>
                <th>Platform Role</th>
                {isSuperAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.displayName}</td>
                  <td>{u.email}</td>
                  <td>{u.jobTitle ?? '—'}</td>
                  <td>{u.department ?? '—'}</td>
                  <td>
                    {isSuperAdmin ? (
                      <select
                        value={u.platformRole ?? ''}
                        onChange={(e) => handleRoleChange(u, e.target.value)}
                        style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0' }}
                      >
                        <option value="">Viewer (default)</option>
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span className={`status-badge ${(u.platformRole ?? 'viewer').toLowerCase()}`}>
                        {u.platformRole ?? 'Viewer'}
                      </span>
                    )}
                  </td>
                  {isSuperAdmin && (
                    <td>
                      {u.platformId && (
                        <button className="action-btn delete" onClick={() => handleRemove(u.platformId!)}>
                          Reset
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
