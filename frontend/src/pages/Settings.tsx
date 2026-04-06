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
  base_url: string;
}

const API = (import.meta.env.VITE_API_GATEWAY_URL ||
  (window.location.protocol === 'https:'
    ? window.location.origin
    : `http://${window.location.hostname}:8080`)) + '/api';

const ICONS = ['🔧','📦','🗂️','📊','📋','🔗','⚙️','🛠️','🚀','📡','🔒','🧩'];

const EMPTY_FORM = {
  display_name: '',
  description: '',
  icon: '🔧',
  repo_url: '',
  branch: 'main',
  env_vars: '',
};

export default function Settings() {
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [nextId, setNextId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState<Service | null>(null);
  const [editingBaseUrl, setEditingBaseUrl] = useState<number | null>(null);
  const [baseUrlDraft, setBaseUrlDraft] = useState('');

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
    try {
      const res = await fetch(`${API}/registry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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

  async function handleBaseUrlSave(id: number) {
    await fetch(`${API}/registry/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base_url: baseUrlDraft }),
    });
    setEditingBaseUrl(null);
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
          <p>Register and manage microservices on the {import.meta.env.VITE_APP_NAME}.</p>
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
            <p className="assigned-id-title">Service registered — configure your CI before pushing.</p>

            <div className="assigned-id-fields">
              <span><strong>Service ID</strong> <code>{registered.name}</code></span>
              <span><strong>Path Prefix</strong> <code>{registered.path_prefix}</code></span>
              <span><strong>Container Name</strong> <code>{registered.container_name}</code></span>
              <span><strong>Schema Name</strong> <code>{registered.schema_name}</code></span>
            </div>

            <p className="assigned-id-hint" style={{ marginTop: '0.75rem' }}><strong>GitHub Actions</strong> — add to repo <code>production</code> environment:</p>
            <div className="assigned-id-fields">
              <span><strong>Variable</strong> <code>SERVICE_NAME = {registered.name}</code></span>
              <span><strong>Variable</strong> <code>VITE_BASE_PATH = {registered.path_prefix}</code></span>
              <span><strong>Variable</strong> <code>DASHBOARD_REPO = rmsb-dashboard</code></span>
              <span><strong>Secret</strong> <code>DEPLOY_TOKEN = &lt;PAT with Contents read+write on rmsb-dashboard&gt;</code></span>
            </div>

            <p className="assigned-id-hint" style={{ marginTop: '0.75rem' }}><strong>Jenkins</strong> — set in Jenkins job → Build Environment:</p>
            <div className="assigned-id-fields">
              <span><strong>Env var</strong> <code>SERVICE_NAME = {registered.name}</code></span>
              <span><strong>Env var</strong> <code>VITE_BASE_PATH = {registered.path_prefix}</code></span>
              <span><strong>Credentials required</strong> <code>github-token</code>, <code>jenkins-admin</code></span>
            </div>
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
                <div className="icon-selector">
                  {ICONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`icon-option${form.icon === emoji ? ' selected' : ''}`}
                      onClick={() => setForm((f) => ({ ...f, icon: emoji }))}
                    >
                      {emoji}
                    </button>
                  ))}
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
                  placeholder="https://github.com/your-org/your-service"
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

            <p className="form-section-title">Environment Variables</p>
            <div className="form-grid">
              <div className="field field-full">
                <label>Env Vars <span className="field-hint">(one KEY=VALUE per line)</span></label>
                <textarea
                  name="env_vars"
                  value={form.env_vars}
                  onChange={handleChange}
                  placeholder={"DB_HOST=postgres\nDB_PORT=5432\nDB_NAME=rmsb"}
                  rows={5}
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
                <th>Base URL</th>
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
                  <td className="base-url-cell">
                    {editingBaseUrl === svc.id ? (
                      <span className="base-url-edit">
                        <input
                          value={baseUrlDraft}
                          onChange={(e) => setBaseUrlDraft(e.target.value)}
                          className="base-url-input"
                        />
                        <button className="action-btn activate" onClick={() => handleBaseUrlSave(svc.id)}>Save</button>
                        <button className="action-btn" onClick={() => setEditingBaseUrl(null)}>Cancel</button>
                      </span>
                    ) : (
                      <span className="base-url-display">
                        <code>{svc.base_url}</code>
                        <button
                          className="action-btn"
                          onClick={() => { setEditingBaseUrl(svc.id); setBaseUrlDraft(svc.base_url); }}
                        >Edit</button>
                      </span>
                    )}
                  </td>
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
                      className="action-btn"
                      onClick={() => setRegistered(svc)}
                    >
                      Setup Info
                    </button>
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
