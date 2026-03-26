import { useEffect, useState } from 'react';

interface Service {
  id: number;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  path_prefix: string;
  container_name: string;
  schema_name: string;
  status: string;
  repo_url: string;
  branch: string;
}

const API = (import.meta.env.VITE_API_GATEWAY_URL ||
  (window.location.protocol === 'https:'
    ? window.location.origin
    : `http://${window.location.hostname}:8080`)) + '/api';

const EMPTY_FORM = {
  display_name: '',
  description: '',
  icon: '🔧',
  path_suffix: '',
  repo_url: '',
  branch: 'main',
};

export default function Settings() {
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [nextId, setNextId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState<Service | null>(null);

  function loadServices() {
    fetch(`${API}/registry`)
      .then((r) => r.json())
      .then((data) => setServices(Array.isArray(data) ? data : []));
  }

  function openForm() {
    setRegistered(null);
    fetch(`${API}/registry/next-id`)
      .then((r) => r.json())
      .then((data) => setNextId(data.name || ''));
    setShowForm(true);
  }

  useEffect(() => {
    loadServices();
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const suffix = form.path_suffix.replace(/^\/+/, '');
    const path_prefix = suffix ? `/${nextId}/${suffix}` : `/${nextId}`;
    try {
      const res = await fetch(`${API}/registry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, path_prefix }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Registration failed');
      }
      const created = await res.json();
      setRegistered(created);
      setForm(EMPTY_FORM);
      setNextId('');
      setShowForm(false);
      loadServices();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id: number, status: string) {
    await fetch(`${API}/registry/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    loadServices();
  }

  async function handleDelete(id: number) {
    if (!confirm('Remove this service from the registry?')) return;
    await fetch(`${API}/registry/${id}`, { method: 'DELETE' });
    loadServices();
  }

  function cancelForm() {
    setShowForm(false);
    setError('');
    setForm(EMPTY_FORM);
    setNextId('');
  }

  return (
    <div className="settings-page">

      {/* Page header */}
      <div className="settings-header">
        <div>
          <h1>Services</h1>
          <p>Register and manage microservices on the Kloudius MultiService Process Dashboard.</p>
        </div>
        <div className="settings-actions">
          <button className="btn-primary" onClick={openForm}>
            + Register Service
          </button>
        </div>
      </div>

      {/* Assigned service callout — shown after successful registration */}
      {registered && (
        <div className="assigned-id-callout">
          <div className="assigned-id-details">
            <p className="assigned-id-title">Service registered — copy these values into your CI workflow before pushing.</p>
            <div className="assigned-id-fields">
              <span><strong>Service ID</strong> <code>{registered.name}</code></span>
              <span><strong>Container Name</strong> <code>{registered.container_name}</code></span>
              <span><strong>Schema Name</strong> <code>{registered.schema_name}</code></span>
            </div>
            <p className="assigned-id-hint">Set <code>SERVICE_NAME: {registered.name}</code> in your CI workflow, then click <strong>Activate</strong> when ready to deploy.</p>
          </div>
          <button className="btn-secondary" onClick={() => setRegistered(null)}>Dismiss</button>
        </div>
      )}

      {/* Registration form */}
      {showForm && (
        <div className="register-form-card">
          <h2>Register New Service</h2>
          {error && <p className="form-error">{error}</p>}

          <form onSubmit={handleSubmit}>
            <p className="form-section-title">Service Details</p>
            <div className="form-grid">
              <div className="field">
                <label>Service ID</label>
                <input value={nextId || 'Loading…'} readOnly className="input-readonly" />
              </div>
              <div className="field">
                <label>Display Name <span className="required">*</span></label>
                <input
                  name="display_name"
                  value={form.display_name}
                  onChange={handleChange}
                  placeholder="Asset Tracking"
                  required
                />
              </div>
              <div className="field">
                <label>Icon</label>
                <input
                  name="icon"
                  value={form.icon}
                  onChange={handleChange}
                  placeholder="📦"
                />
              </div>
              <div className="field field-full">
                <label>Path Prefix</label>
                <div className="path-prefix-input">
                  <span className="path-prefix-locked">/{nextId}/</span>
                  <input
                    name="path_suffix"
                    value={form.path_suffix}
                    onChange={handleChange}
                    placeholder="finance"
                  />
                </div>
              </div>
              <div className="field field-full">
                <label>Description</label>
                <input
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Short description of this service"
                />
              </div>
            </div>

            <p className="form-section-title">Repo / Image Details</p>
            <div className="form-grid">
              <div className="field field-full">
                <label>GitHub Repo URL</label>
                <input
                  name="repo_url"
                  value={form.repo_url}
                  onChange={handleChange}
                  placeholder="https://github.com/kloudius/s1-device-management"
                />
              </div>
              <div className="field">
                <label>Branch</label>
                <input
                  name="branch"
                  value={form.branch}
                  onChange={handleChange}
                  placeholder="main"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={cancelForm}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={submitting || !nextId}>
                {submitting ? 'Registering…' : 'Register Service'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Services table */}
      <div className="services-table-wrap">
        {services.length === 0 ? (
          <p className="table-empty">No services registered yet.</p>
        ) : (
          <table className="services-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Prefix</th>
                <th>Schema</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((svc) => (
                <tr key={svc.id}>
                  <td>
                    <span className="svc-icon">{svc.icon}</span>
                    <span className="svc-name">{svc.display_name}</span>
                    <span className="svc-id">{svc.name}</span>
                  </td>
                  <td><code>{svc.path_prefix}</code></td>
                  <td><code>{svc.schema_name}</code></td>
                  <td>
                    <span className={`status-badge ${svc.status}`}>{svc.status}</span>
                  </td>
                  <td className="svc-actions">
                    {svc.status === 'pending' && (
                      <button
                        className="action-btn activate"
                        onClick={() => handleStatusChange(svc.id, 'active')}
                      >
                        Activate
                      </button>
                    )}
                    {svc.status === 'active' && (
                      <button
                        className="action-btn disable"
                        onClick={() => handleStatusChange(svc.id, 'disabled')}
                      >
                        Disable
                      </button>
                    )}
                    {svc.status === 'disabled' && (
                      <button
                        className="action-btn activate"
                        onClick={() => handleStatusChange(svc.id, 'active')}
                      >
                        Re-enable
                      </button>
                    )}
                    <button
                      className="action-btn delete"
                      onClick={() => handleDelete(svc.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
