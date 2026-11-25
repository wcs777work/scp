const $ = (selector) => document.querySelector(selector);
const fmtBytes = (n) =>
  n < 1024
    ? `${n} B`
    : n < 1048576
      ? `${(n / 1024).toFixed(1)} KB`
      : n < 1073741824
        ? `${(n / 1048576).toFixed(1)} MB`
        : `${(n / 1073741824).toFixed(2)} GB`;
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
let files = [],
  current = "",
  allReleasesUrl = "";

function render() {
  const query = $("#search").value.trim().toLowerCase();
  const prefix = current ? `${current}/` : "";
  const dirs = new Set();
  const visibleFiles = [];
  for (const file of files) {
    if (!file.path.startsWith(prefix)) continue;
    const rest = file.path.slice(prefix.length);
    if (!rest) continue;
    const parts = rest.split("/");
    if (parts.length > 1) {
      if (!query || parts[0].toLowerCase().includes(query)) dirs.add(parts[0]);
    } else if (!query || file.path.toLowerCase().includes(query))
      visibleFiles.push(file);
  }
  let html = [...dirs]
    .sort((a, b) => a.localeCompare(b))
    .map(
      (dir) =>
        `<div class="entry"><span class="kind">📁</span><span class="name"><a href="#" data-dir="${encodeURIComponent(current ? `${current}/${dir}` : dir)}">${esc(dir)}</a></span><span class="meta">Pasta</span></div>`,
    )
    .join("");
  html += visibleFiles
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (file) =>
        `<div class="entry"><span class="kind">📦</span><span class="name"><a href="${esc(file.url)}" rel="noopener">${esc(file.name)}</a></span><span class="meta">${fmtBytes(file.size)}</span></div>`,
    )
    .join("");
  $("#list").innerHTML =
    html || '<div class="empty">Nenhum arquivo ou pasta aqui.</div>';
  $("#crumb").innerHTML = current
    ? `<a href="#" data-dir="">Home</a> / ${current.split("/").map(esc).join(" / ")}`
    : "<span>Todos arquivos</span>";
  $("#up").disabled = !current;
  $("#foot").textContent =
    `${files.length} arquivos para downlaod · hosted como GitHub Release assets`;
}

function navigate(path) {
  current = path;
  $("#search").value = "";
  render();
}
$("#list").addEventListener("click", (event) => {
  const link = event.target.closest("[data-dir]");
  if (!link) return;
  event.preventDefault();
  navigate(decodeURIComponent(link.dataset.dir));
});
$("#crumb").addEventListener("click", (event) => {
  const link = event.target.closest("[data-dir]");
  if (!link) return;
  event.preventDefault();
  navigate(decodeURIComponent(link.dataset.dir));
});
$("#up").addEventListener("click", () =>
  navigate(current.split("/").slice(0, -1).join("/")),
);
$("#search").addEventListener("input", render);

async function loadFiles() {
  $("#list").innerHTML = '<div class="empty">Loading release files…</div>';
  try {
    const configResponse = await fetch("config.json", { cache: "no-store" });
    if (!configResponse.ok)
      throw new Error("Could not load site configuration.");
    const config = await configResponse.json();
    const owner = config.repository.split("/")[0];
    const repo = config.repository.split("/")[1];
    const api = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=100`;
    const response = await fetch(api, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok)
      throw new Error(
        response.status === 403
          ? "GitHub API rate limit reached. Please try again later."
          : `GitHub Releases API returned ${response.status}.`,
      );
    const releases = await response.json();
    const release = releases.find(
      (item) => item.tag_name === config.releaseTag,
    );
    if (!release)
      throw new Error(
        `Release "${config.releaseTag}" was not found. Upload archives using the publish script.`,
      );
    files = release.assets
      .map((asset) => {
        const encoded = asset.name.replace(/\.[^.]+$/, "");
        const parts = encoded.split("__").map((part) => {
          try {
            return decodeURIComponent(part);
          } catch {
            return part;
          }
        });
        const path = parts.join("/");
        return {
          path,
          name: parts[parts.length - 1],
          size: asset.size,
          url: asset.browser_download_url,
        };
      })
      .filter((file) => file.path && file.name)
      .sort((a, b) => a.path.localeCompare(b.path));
    if (!files.length)
      throw new Error(
        "No downloadable assets found in the configured release.",
      );
    render();
  } catch (error) {
    $("#list").innerHTML = `<div class="empty">${esc(error.message)}</div>`;
    $("#foot").textContent = "Não foi possível carregar downloads";
  }
}
loadFiles();
