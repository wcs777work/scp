# GitHub Pages password-gated file directory

A lightweight file listing website that reads files from `share/`, displays them grouped by subdirectories, and lets visitors download individual files. The page is encrypted with StatiCrypt in GitHub Actions.

## Important privacy/security note

StatiCrypt password-protects the **HTML page**, not the downloadable files. Because GitHub Pages is static hosting and `share/` is published as ordinary files, direct download URLs are public and anyone who knows/guesses the URL can download them without the page password. Do not put confidential files here unless you separately encrypt each file before committing it. GitHub Pages websites are public-facing.

## Create the free GitHub account
1. Go to https://github.com/signup and create an account; verify your email.
2. Choose a free account/plan (no paid subscription needed for public GitHub Pages).

## Create and publish repository
1. Create a **public** repository, e.g. `private-download-page` (public repo is required for GitHub Free Pages).
2. Upload these template files to the repository root, including `.github/workflows/pages.yml`.
3. Add the files you want to share under `share/`; create subdirectories as desired, e.g. `share/Photos/`, `share/Docs/`.
4. In repository **Settings → Secrets and variables → Actions → New repository secret**, add:
   - `SITE_PASSWORD`: strong password for StatiCrypt page.
   - `STATICRYPT_SALT`: 32-character random salt. Generate one locally with Python: `python -c "import secrets; print(secrets.token_hex(16))"`. This is not a password; keep it stable between builds.
5. Go to **Settings → Pages** and set **Build and deployment → Source: GitHub Actions**.
6. Push changes to the `main` branch or run the workflow manually from **Actions**.
7. When workflow completes, Pages URL is shown in the deployment output and under Settings → Pages.

## Updating files
Commit/push changes to `share/`. Workflow rebuilds the index and republishes.

## Local preview (without password gate)
Run `node build-manifest.mjs`, then serve the project folder with any local HTTP server (for example `python -m http.server 8000`). Open `http://localhost:8000`. StatiCrypt encrypted version is created only in the GitHub Actions deploy.
