# Password-gated GitHub Pages download directory (GitHub Releases storage)

This light-theme website uses StatiCrypt to password-gate its interface and reads downloadable assets from one GitHub Release. Large `.7z` files are **not committed to the Git repository**; publish them directly from your computer with `publish-release.sh`.

## Important security notes

- StatiCrypt protects the website interface only. GitHub Release asset URLs are public to anyone who has them.
- Put only already-encrypted archives (for example, 7z files using AES-256 and encrypted filenames) in the release if the contents must remain private. Use a strong archive password, preferably different from the website password.
- GitHub Releases are distribution hosting, not private authenticated storage. Anyone who obtains an asset URL can download the encrypted archive.
- The website receives its repository and release configuration as an inline JavaScript configuration file generated during deployment. It discovers assets through the public GitHub Releases API. GitHub's unauthenticated API rate limit can occasionally affect loading.

## 1. Create the GitHub repository and Pages site

1. Create a GitHub account at https://github.com/signup.
2. Create a **public** repository (GitHub Free supports Pages for public repositories).
3. Upload the template files, including `.github/workflows/pages.yml` and `publish-release.sh`.
4. Add repository Actions secrets under **Settings → Secrets and variables → Actions**:
   - `SITE_PASSWORD`: password for the StatiCrypt website.
   - `STATICRYPT_SALT`: stable random 32-character hexadecimal salt. Generate with `python -c "import secrets; print(secrets.token_hex(16))"`.
5. Under **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**.
6. Push to `main` or run **Build and deploy GitHub Pages** from the Actions tab.

The Pages workflow publishes only the website files. It deliberately does not copy `share/` into the Pages artifact.

## 2. Publish large files to GitHub Releases (from your computer)

Install:
- GitHub CLI: https://cli.github.com/
- Git: https://git-scm.com/downloads
- Python 3 (used to encode folder names in asset filenames)

Authenticate once:

```bash
gh auth login
```

Put downloadable archives in `share/`, retaining the directory structure:

```text
share/
├── program-server/
│   └── my-program.7z
└── program-client/
    └── my-program-1.39.0.7z
```

Run from the repository root:

```bash
./publish-release.sh
```

The script creates or updates the release tagged `shared-files` and uploads each file as a release asset. Folder separators are encoded as `__`, so the example becomes `program-server__my-program.7z` and `program-client__my-program-1.39.0.7z`. The website reconstructs the folder hierarchy from these names.

On Windows, run the script from Git Bash or WSL. You can change the release tag/title with environment variables, e.g. `RELEASE_TAG=shared-files RELEASE_TITLE="Shared downloads" ./publish-release.sh`.

**Updating/removing assets:** `--clobber` replaces an asset when its encoded name is unchanged. The script does not automatically delete release assets whose local files were removed; delete those obsolete assets from the release's GitHub page.

## 3. Stop tracking the old large files in Git

If you previously committed files under `share/`, first publish them with the script above. Then remove them from Git tracking while keeping your local copies:

```bash
git rm -r --cached share
echo "/share/" >> .gitignore
git add .gitignore
git commit -m "Store downloadable archives in GitHub Releases"
git push
```

This stops future commits from adding the files, but **does not erase the large blobs from existing Git history**. If you need to reduce repository size, history must be rewritten (for example with `git filter-repo`), which affects every clone and should be done carefully. If you want to keep using `share/` as a local publishing folder, leave it on disk; `.gitignore` prevents accidental commits.

## 4. Updating the website

Push changes to the website files as usual. The Pages workflow deploys the light-theme website. To update downloads, add/replace files under local `share/` and run `./publish-release.sh` again. The site reads the release assets automatically; no website rebuild is needed after a release upload.

## Local preview

The website fetches the public release API, so it needs to be served over HTTP and configured with a `config.json` file. For a quick preview, create `config.json` containing your repository and release tag, then run `python -m http.server 8000`.
