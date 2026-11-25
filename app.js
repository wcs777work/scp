const $ = (s) => document.querySelector(s);
let manifest = [],
  current = "";
const fmtBytes = (n) =>
  n < 1024
    ? `${n} B`
    : n < 1048576
      ? `${(n / 1024).toFixed(1)} KB`
      : n < 1073741824
        ? `${(n / 1048576).toFixed(1)} MB`
        : `${(n / 1073741824).toFixed(2)} GB`;
const cleanPath = (p) => p.split("/").filter(Boolean).join("/");
function render() {
  const search = $("#search").value.toLowerCase();
  let dirs = new Set(),
    files = [];
  manifest.forEach((item) => {
    let p = item.path;
    if (!p.startsWith(current ? current + "/" : "")) return;
    let rest = p.slice(current ? current.length + 1 : 0);
    if (!rest) return;
    let parts = rest.split("/");
    if (parts.length > 1) {
      if (!search || parts[0].toLowerCase().includes(search))
        dirs.add(parts[0]);
    } else if (!search || p.toLowerCase().includes(search)) files.push(item);
  });
  let html = [...dirs]
    .sort((a, b) => a.localeCompare(b))
    .map(
      (d) =>
        `<div class="entry"><span class="kind">📁</span><span class="name"><a href="#" data-dir="${encodeURIComponent(cleanPath(current + "/" + d))}">${esc(d)}</a></span><span class="meta">pasta</span></div>`,
    )
    .join("");
  html += files
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (f) =>
        `<div class="entry"><span class="kind">📄</span><span class="name"><a href="${encodeURI(f.url)}" download>${esc(f.name)}</a></span><span class="meta">${fmtBytes(f.size)}</span></div>`,
    )
    .join("");
  $("#list").innerHTML =
    html || '<div class="empty">Nenhum arquivo ou pasta aqui.</div>';
  $("#crumb").innerHTML = current
    ? `<a href="#" data-dir="">Home</a> / ${current.split("/").map(esc).join(" / ")}`
    : "<span>Todos arquivos</span>";
  $("#up").disabled = !current;
  $("#foot").textContent = `${manifest.length} arquivos indexado`;
}
function esc(s) {
  return s.replace(
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
}
$("#list").addEventListener("click", (e) => {
  let a = e.target.closest("[data-dir]");
  if (a) {
    e.preventDefault();
    current = decodeURIComponent(a.dataset.dir);
    $("#search").value = "";
    render();
  }
});
$("#crumb").addEventListener("click", (e) => {
  let a = e.target.closest("[data-dir]");
  if (a) {
    e.preventDefault();
    current = decodeURIComponent(a.dataset.dir);
    render();
  }
});
$("#up").onclick = () => {
  current = current.split("/").slice(0, -1).join("/");
  render();
};
$("#search").oninput = render;
fetch("files.json")
  .then((r) => r.json())
  .then((data) => {
    manifest = data;
    render();
  })
  .catch(
    () =>
      ($("#list").innerHTML =
        '<div class="empty">Não foi possível carregar a lista de arquivos.</div>'),
  );
