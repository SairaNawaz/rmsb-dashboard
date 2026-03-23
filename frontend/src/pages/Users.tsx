import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface PlatformUser {
  id: number;
  email: string;
  display_name: string;
  role: string;
  added_by: string | null;
  created_at: string;
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
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', display_name: '', role: 'Viewer' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function loadUsers() {
    fetch(`${API}/users`)
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, added_by: user?.email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add user');
      }
      setForm({ email: '', display_name: '', role: 'Viewer' });
      setShowForm(false);
      loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add user');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleChange(id: number, role: string) {
    await fetch(`${API}/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    loadUsers();
  }

  async function handleDelete(id: number) {
    if (!confirm('Remove this user? They will revert to Viewer on next login.')) return;
    await fetch(`${API}/users/${id}`, { method: 'DELETE' });
    loadUsers();
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <h1>Users</h1>
          <p>Manage platform access roles. Unregistered users default to Viewer on login.</p>
        </div>
        {isSuperAdmin && (
          <div className="settings-actions">
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              + Add User
            </button>
          </div>
        )}
      </div>

      {isSuperAdmin && showForm && (
        <div className="register-form-card">
          <h2>Add User</h2>
          {error && <p className="form-error">{error}</p>}
          <form onSubmit={handleAdd}>
            <div className="form-grid">
              <div className="field">
                <label>Email <span className="required">*</span></label>
                <input
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="user@kloudius.com"
                  type="email"
                  required
                />
              </div>
              <div className="field">
                <label>Display Name</label>
                <input
                  value={form.display_name}
                  onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                  placeholder="Jane Smith"
                />
              </div>
              <div className="field">
                <label>Role <span className="required">*</span></label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #334155' }}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setError(''); }}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Adding…' : 'Add User'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="services-table-wrap">
        {loading ? (
          <p className="table-empty">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="table-empty">No users in the platform yet.</p>
        ) : (
          <table className="services-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Added By</th>
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
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0' }}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span className={`status-badge ${u.role.toLowerCase()}`}>{u.role}</span>
                    )}
                  </td>
                  <td>{u.added_by ?? '—'}</td>
                  {isSuperAdmin && (
                    <td className="svc-actions">
                      <button className="action-btn delete" onClick={() => handleDelete(u.id)}>
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
