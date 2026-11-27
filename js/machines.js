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
  renderBrands();
  fillBrandSelects();
}

function renderBrands() {
  const q = $m("bSearch").value.trim().toLowerCase();
  const list = brandsCache.filter((b) => !q || (b.name || "").toLowerCase().includes(q));
  const body = $m("brandBody");
  if (!list.length) return emptyMsg(body, brandsCache.length ? "Koi brand match nahi hua." : "Abhi koi brand nahi hai.");
  body.innerHTML = "";
  list.forEach((b) => addRow(body, [b.name], () => editBrand(b), () => deleteBrand(b)));
}
$m("bSearch").addEventListener("input", renderBrands);

// Machine form aur filter ke dropdown bharo
function fillBrandSelects() {
  const sel = $m("mBrand");
  const keep = sel.value;
  sel.innerHTML = '<option value="">-- Select Brand --</option>';
  brandsCache.forEach((b) => sel.add(new Option(b.name, b.id)));
  sel.value = keep;

  const f = $m("mFilter");
  const keepF = f.value;
  f.innerHTML = '<option value="">All Brands</option>';
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
  if (!confirm(b.name + " Are you sure you want to delete\n(The machines under this brand will be retained, but their brand association will be removed.)")) return;
  const { error } = await brandsApi.remove(b.id);
  if (error) return toast("Delete error: " + error.message, true);
  toast("Brand delete ho gaya");
  await loadBrands();
  loadMachines();
}

$m("brandForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $m("bName").value.trim();
  if (!name) return toast("Brand name is required.", true);
  const btn = $m("brandSaveBtn");
  btn.disabled = true;
  const { error } = editingBrandId
    ? await brandsApi.update(editingBrandId, { name })
    : await brandsApi.add({ name });
  btn.disabled = false;
  if (error) return toast(error.code === "23505" ? "This brand already exists." : "Save error: " + error.message, true);
  toast(editingBrandId ? "Brand updated successfully." : "Brand added successfully.");
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
  const q = $m("mSearch").value.trim().toLowerCase();
  const list = machinesCache.filter((m) =>
    (!f || m.brand_id === f) &&
    (!q || [m.name, m.model, m.notes, m.brands && m.brands.name]
      .some((v) => (v || "").toLowerCase().includes(q)))
  );
  const body = $m("machineBody");
  if (!list.length) return emptyMsg(body, "No machines available yet.");
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
$m("mSearch").addEventListener("input", renderMachines);
$m("mClear").addEventListener("click", () => {
  $m("mSearch").value = "";
  $m("mFilter").value = "";
  renderMachines();
});

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
  if (!confirm(m.name + " Are you sure you want to delete")) return;
  const { error } = await machinesApi.remove(m.id);
  if (error) return toast("Delete error: " + error.message, true);
  toast("Machine deleted successfully.");
  loadMachines();
}

$m("machineForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const brand_id = $m("mBrand").value;
  const name = $m("mName").value.trim();
  if (!brand_id) return toast("Please select a brand.", true);
  if (!name) return toast("Machine name is required.", true);
  const row = { brand_id, name, model: $m("mModel").value.trim(), notes: $m("mNotes").value.trim() };
  const btn = $m("machineSaveBtn");
  btn.disabled = true;
  const { error } = editingMachineId
    ? await machinesApi.update(editingMachineId, row)
    : await machinesApi.add(row);
  btn.disabled = false;
  if (error) return toast("Save error: " + error.message, true);
  toast(editingMachineId ? "Machine updated successfully." : "Machine added successfully.");
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

// Machines page ka "+ Add Machine" button
$m("addMachineBtn").addEventListener("click", () => {
  resetMachineForm();
  showView("machine-add");
});