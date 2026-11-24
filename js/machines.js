// Brand aur Machine ka logic
const $m = (id) => document.getElementById(id);
let brandsCache = [];
let machinesCache = [];
let editingBrandId = null;
let editingMachineId = null;

// ================= BRANDS =================
async function loadBrands() {
  const { data, error } = await brandsApi.list();
  if (error) return toast("Brands load error: " + error.message, true);
  brandsCache = data;
  const body = $m("brandBody");
  if (!data.length) emptyMsg(body, "Abhi koi brand nahi hai.");
  else {
    body.innerHTML = "";
    data.forEach((b) => addRow(body, [b.name], () => editBrand(b), () => deleteBrand(b)));
  }
  fillBrandSelects();
}

// Machine form aur filter ke dropdown bharo
function fillBrandSelects() {
  const sel = $m("mBrand");
  const keep = sel.value;
  sel.innerHTML = '<option value="">-- Brand chuno --</option>';
  brandsCache.forEach((b) => sel.add(new Option(b.name, b.id)));
  sel.value = keep;

  const f = $m("mFilter");
  const keepF = f.value;
  f.innerHTML = '<option value="">Sab Brands</option>';
  brandsCache.forEach((b) => f.add(new Option(b.name, b.id)));
  f.value = keepF;
}

function resetBrandForm() {
  editingBrandId = null;
  $m("brandForm").reset();
  $m("brandSaveBtn").textContent = "Add Brand";
  $m("brandCancelBtn").classList.add("hidden");
}

function editBrand(b) {
  editingBrandId = b.id;
  $m("bName").value = b.name;
  $m("brandSaveBtn").textContent = "Update Brand";
  $m("brandCancelBtn").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteBrand(b) {
  if (!confirm(b.name + " delete karna hai?\n(Is brand ki machines rahengi, bas unka brand khali ho jayega)")) return;
  const { error } = await brandsApi.remove(b.id);
  if (error) return toast("Delete error: " + error.message, true);
  toast("Brand delete ho gaya");
  await loadBrands();
  loadMachines();
}

$m("brandForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $m("bName").value.trim();
  if (!name) return toast("Brand name zaroori hai", true);
  const btn = $m("brandSaveBtn");
  btn.disabled = true;
  const { error } = editingBrandId
    ? await brandsApi.update(editingBrandId, { name })
    : await brandsApi.add({ name });
  btn.disabled = false;
  if (error) return toast(error.code === "23505" ? "Ye brand pehle se hai" : "Save error: " + error.message, true);
  toast(editingBrandId ? "Brand update ho gaya ✅" : "Brand add ho gaya ✅");
  resetBrandForm();
  await loadBrands();
  loadMachines();
});
$m("brandCancelBtn").addEventListener("click", resetBrandForm);

// ================= MACHINES =================
async function loadMachines() {
  const { data, error } = await machinesApi.list();
  if (error) return toast("Machines load error: " + error.message, true);
  machinesCache = data;
  renderMachines();
}

// Filter ke hisaab se list dikhao
function renderMachines() {
  const f = $m("mFilter").value;
  const list = machinesCache.filter((m) => !f || m.brand_id === f);
  const body = $m("machineBody");
  if (!list.length) return emptyMsg(body, "Abhi koi machine nahi hai.");
  body.innerHTML = "";
        list.forEach((m) => {
    addRow(
      body,
      [m.brands ? m.brands.name : "-", m.name, m.model, m.notes],
      () => editMachine(m),
      () => deleteMachine(m),
      [{ label: "👁 View", fn: () => openMachine(m) }]   // sirf is button se machine khulegi
    );
  });
}
$m("mFilter").addEventListener("change", renderMachines);

function resetMachineForm() {
  editingMachineId = null;
  $m("machineForm").reset();
  $m("machineFormTitle").textContent = "Add Machine";
  $m("machineSaveBtn").textContent = "Add Machine";
  $m("machineCancelBtn").classList.add("hidden");
}

function editMachine(m) {
  editingMachineId = m.id;
  showView("machine-add");
  $m("mBrand").value = m.brand_id || "";
  $m("mName").value = m.name || "";
  $m("mModel").value = m.model || "";
  $m("mNotes").value = m.notes || "";
  $m("machineFormTitle").textContent = "Edit Machine";
  $m("machineSaveBtn").textContent = "Update Machine";
  $m("machineCancelBtn").classList.remove("hidden");
}

async function deleteMachine(m) {
  if (!confirm(m.name + " delete karni hai?")) return;
  const { error } = await machinesApi.remove(m.id);
  if (error) return toast("Delete error: " + error.message, true);
  toast("Machine delete ho gayi");
  loadMachines();
}

$m("machineForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const brand_id = $m("mBrand").value;
  const name = $m("mName").value.trim();
  if (!brand_id) return toast("Pehle brand chuno", true);
  if (!name) return toast("Machine name zaroori hai", true);
  const row = { brand_id, name, model: $m("mModel").value.trim(), notes: $m("mNotes").value.trim() };
  const btn = $m("machineSaveBtn");
  btn.disabled = true;
  const { error } = editingMachineId
    ? await machinesApi.update(editingMachineId, row)
    : await machinesApi.add(row);
  btn.disabled = false;
  if (error) return toast("Save error: " + error.message, true);
  toast(editingMachineId ? "Machine update ho gayi ✅" : "Machine add ho gayi ✅");
  resetMachineForm();
  await loadMachines();
  showView("machines");
});
$m("machineCancelBtn").addEventListener("click", () => { resetMachineForm(); showView("machines"); });

// Login ke baad dono load karo
async function loadMachineData() {
  await loadBrands();
  await loadMachines();
}