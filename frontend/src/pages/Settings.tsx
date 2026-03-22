import { useEffect, useState } from 'react';

interface Service {
  id: number;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  path_prefix: string;
  port: number;
  container_name: string;
  schema_name: string;
  status: string;
  repo_url: string;
  branch: string;
  ghcr_image: string;
  image_tag: string;
}

const API = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8080';

const EMPTY_FORM = {
  name: '',
  display_name: '',
  description: '',
  icon: '🔧',
  path_prefix: '',
  port: '',
  container_name: '',
  schema_name: '',
  repo_url: '',
  branch: 'main',
  ghcr_image: '',
  image_tag: 'latest',
};

export default function Settings() {
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  function loadServices() {
    fetch(`${API}/registry`)
      .then((r) => r.json())
      .then((data) => setServices(Array.isArray(data) ? data : []));
  }

  useEffect(() => {
    loadServices();
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    if (name === 'name') {
      // Auto-derive related fields from the service ID
      setForm((f) => ({
        ...f,
        name: value,
        path_prefix: `/${value}`,
        container_name: `rmsb-${value}`,
        schema_name: `schema_${value}`,
        ghcr_image: `ghcr.io/sairanawaz/rmsb-${value}-api`,
      }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API}/registry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, port: parseInt(form.port) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Registration failed');
      }
      setForm(EMPTY_FORM);
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

  async function handleComposeSync() {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await fetch(`${API}/registry/compose-sync`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setSyncMsg(`docker-compose.yml updated with ${data.services} service(s). Ready to deploy.`);
    } catch {
      setSyncMsg('Sync failed — check gateway connection.');
    } finally {
      setSyncing(false);
    }
  }

  function cancelForm() {
    setShowForm(false);
    setError('');
    setForm(EMPTY_FORM);
  }

  return (
    <div className="settings-page">

      {/* Page header */}
      <div className="settings-header">
        <div>
          <h1>Services</h1>
          <p>Register and manage microservices on the RMSB platform.</p>
        </div>
        <div className="settings-actions">
          <button className="btn-secondary" onClick={handleComposeSync} disabled={syncing}>
            {syncing ? 'Generating…' : '↓ Sync Compose'}
          </button>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            + Register Service
          </button>
        </div>
      </div>

      {syncMsg && <p className="sync-msg">{syncMsg}</p>}

      {/* Registration form */}
      {showForm && (
        <div className="register-form-card">
          <h2>Register New Service</h2>
          {error && <p className="form-error">{error}</p>}

          <form onSubmit={handleSubmit}>
            <p className="form-section-title">Service Details</p>
            <div className="form-grid">
              <div className="field">
                <label>Service ID <span className="required">*</span></label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="s3"
                  required
                />
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
              <div className="field">
                <label>Port <span className="required">*</span></label>
                <input
                  name="port"
                  type="number"
                  value={form.port}
                  onChange={handleChange}
                  placeholder="3003"
                  required
                />
              </div>
              <div className="field">
                <label>Path Prefix <span className="required">*</span></label>
                <input
                  name="path_prefix"
                  value={form.path_prefix}
                  onChange={handleChange}
                  placeholder="/s3"
                  required
                />
              </div>
              <div className="field">
                <label>Container Name <span className="required">*</span></label>
                <input
                  name="container_name"
                  value={form.container_name}
                  onChange={handleChange}
                  placeholder="rmsb-s3"
                  required
                />
              </div>
              <div className="field">
                <label>Schema Name <span className="required">*</span></label>
                <input
                  name="schema_name"
                  value={form.schema_name}
                  onChange={handleChange}
                  placeholder="schema_s3"
                  required
                />
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
                  placeholder="https://github.com/sairanawaz/rmsb-s3-..."
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
              <div className="field">
                <label>GHCR Image</label>
                <input
                  name="ghcr_image"
                  value={form.ghcr_image}
                  onChange={handleChange}
                  placeholder="ghcr.io/sairanawaz/rmsb-s3-api"
                />
              </div>
              <div className="field">
                <label>Image Tag</label>
                <input
                  name="image_tag"
                  value={form.image_tag}
                  onChange={handleChange}
                  placeholder="latest"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={cancelForm}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
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
                <th>Port</th>
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
                  <td>{svc.port}</td>
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
