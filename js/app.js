const $ = (id) => document.getElementById(id);

// Chhota message popup
function toast(msg, isError = false) {
  const t = $("toast");
  t.textContent = msg;
  t.className = "toast" + (isError ? " err" : "");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add("hidden"), 3000);
}

// Page (Dashboard / Settings) badlo
function showView(name) {
  const popup = name === "machine-add";
   const popupOf = { "machine-add": "view-machines", "brand-add": "view-brands" };
  document.querySelectorAll(".view").forEach((v) => {
    const keep = popupOf[name] === v.id;
    v.classList.toggle("hidden", !keep);
  });
  $("view-" + name).classList.remove("hidden");
  document.querySelectorAll(".navbtn").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === name)
  );
  $("machineMenuBtn").classList.toggle("active", ["brands", "brand-add", "machine-add", "machines", "machine-detail", "categories"].includes(name));
  $("machineDropdown").classList.remove("open");
  if (name === "dashboard") loadDashboard();
}
// Upar ke tab buttons (Dashboard, Settings, Parties, Items, Documents, + New)
document.querySelectorAll(".navbtn").forEach((b) =>
  b.addEventListener("click", () => showView(b.dataset.view))
);

// Dropdown ke options
document.querySelectorAll(".ddbtn").forEach((b) =>
  b.addEventListener("click", () => showView(b.dataset.view))
);
// Mobile par tap se dropdown khule/band ho
$("machineMenuBtn").addEventListener("click", () => $("machineDropdown").classList.toggle("open"));

// Login ya app screen dikhao
let loadedFor = null;
function showScreen(session) {
  $("loginScreen").classList.toggle("hidden", !!session);
  $("appScreen").classList.toggle("hidden", !session);
  if (session && loadedFor !== session.user.id) {
    loadedFor = session.user.id;    
    loadSettings();
    loadMasters();
    loadDocs();
    loadMachineData();
    loadCategories();
    loadDashboard();
  }
  if (!session) loadedFor = null;
}

// Database check
async function testDatabase() {
  const { count, error } = await sb.from("documents").select("*", { count: "exact", head: true });
  const el = $("dbStatus");
  if (error) { el.textContent = " Database error: " + error.message; el.className = "error"; }
  else { el.textContent = " Database connected! Documents: " + count; el.className = "ok"; }
}

// Login
$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("loginMsg").textContent = "";
  $("loginBtn").disabled = true;
  const { error } = await authApi.login($("email").value.trim(), $("password").value);
  $("loginBtn").disabled = false;
  if (error) $("loginMsg").textContent = error.message;
});

$("logoutBtn").addEventListener("click", () => authApi.logout());
sb.auth.onAuthStateChange((_e, session) => showScreen(session));
authApi.getSession().then(showScreen);  