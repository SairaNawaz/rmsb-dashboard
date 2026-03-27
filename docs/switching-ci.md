# Switching Between GitHub Actions and Jenkins

Both CI/CD systems are configured in this repo and can be toggled independently.

| System | Config location |
|--------|----------------|
| GitHub Actions | `.github/workflows/ci.yml` + `deploy.yml` |
| Jenkins | `Jenkinsfile` (root of repo) |

---

## Enable GitHub Actions, Disable Jenkins

1. Go to repo **Settings → Actions → General**
2. Set to **Allow all actions** (or your preferred setting)
3. In Jenkins, pause or disable the pipeline for this repo
4. Remove or disable the GitHub webhook pointing to Jenkins (repo **Settings → Webhooks**)

---

## Enable Jenkins, Disable GitHub Actions

1. Go to repo **Settings → Actions → General**
2. Set to **Disable actions**
3. Ensure the Jenkins webhook is active (repo **Settings → Webhooks** → add Jenkins URL)
4. Jenkins will trigger on every push to `main`

---

## Running both simultaneously

Not recommended — both systems would deploy on every push, causing race conditions on the VM.

---

## What each system deploys to

| System | Deploy path on VM |
|--------|------------------|
| GitHub Actions | `~/github-actions/rmsb-dashboard` |
| Jenkins | `~/jenkins/rmsb-dashboard` |

These are separate running instances — useful for side-by-side comparison.
