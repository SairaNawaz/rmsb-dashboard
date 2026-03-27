import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface PlatformUser {
  id: number;
  email: string;
  display_name: string;
  role: string;
}

const API = (import.meta.env.VITE_API_GATEWAY_URL ||
  (window.location.protocol === 'https:'
    ? window.location.origin
    : `http://${window.location.hostname}:8080`)) + '/api';

const ROLES = ['Viewer', 'Admin', 'SuperAdmin'];

export default function Users() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SuperAdmin';

  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/users`);
      if (!res.ok) throw new Error('Failed to load users');
      setUsers(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  async function handleRoleChange(u: PlatformUser, role: string) {
    await fetch(`${API}/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    loadUsers();
  }

  async function handleRemove(id: number) {
    if (!confirm('Remove this user?')) return;
    await fetch(`${API}/users/${id}`, { method: 'DELETE' });
    loadUsers();
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <h1>Users</h1>
          <p>Platform users and their assigned roles.</p>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="services-table-wrap">
        {loading ? (
          <p className="table-empty">Loading users...</p>
        ) : (
          <table className="services-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                {isSuperAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.display_name}</td>
                  <td>{u.email}</td>
                  <td>
                    {isSuperAdmin ? (
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u, e.target.value)}
                        style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0' }}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span className={`status-badge ${u.role.toLowerCase()}`}>{u.role}</span>
                    )}
                  </td>
                  {isSuperAdmin && (
                    <td>
                      <button className="action-btn delete" onClick={() => handleRemove(u.id)}>
                        Remove
                      </button>
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
