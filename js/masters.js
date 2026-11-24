let partiesCache = [];   // form autocomplete me kaam aata hai
let itemsCache = [];
let editingPartyId = null;
let editingItemId = null;

// Table ki ek row banata hai (textContent use, taaki data safe rahe)
// extra = [{label, fn}] se PDF/Print jaise extra buttons aate hain
function addRow(tbody, cells, onEdit, onDelete, extra = []) {
  const tr = document.createElement("tr");
  cells.forEach((c) => {
    const td = document.createElement("td");
    td.textContent = c ?? "";
    tr.appendChild(td);
  });
  const act = document.createElement("td");
  const e = document.createElement("button");
  e.textContent = "Edit";
  e.onclick = onEdit;
  const d = document.createElement("button");
  d.textContent = "Delete";
  d.className = "danger";
  d.onclick = onDelete;
  extra.forEach((x) => {
    const b = document.createElement("button");
    b.textContent = x.label;
    b.className = "gray";
    b.onclick = x.fn;
    act.appendChild(b);
  });
  act.append(e, d);
  tr.appendChild(act);
  tbody.appendChild(tr);
}

function emptyMsg(tbody, text) {
  tbody.innerHTML = "";
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = 7;
  td.className = "empty";
  td.textContent = text;
  tr.appendChild(td);
  tbody.appendChild(tr);
}

// ================= PARTIES =================
async function loadParties() {
  const { data, error } = await partiesApi.list();
  if (error) return toast("Parties load error: " + error.message, true);
  partiesCache = data;
  const body = document.getElementById("partyBody");
  if (!data.length) return emptyMsg(body, "There are no parties available.");
  body.innerHTML = "";
  data.forEach((p) =>
    addRow(body, [p.type === "supplier" ? "Supplier" : "Customer", p.name, p.mobile, p.gstin],
      () => editParty(p), () => deleteParty(p))
  );
}

function resetPartyForm() {
  editingPartyId = null;
  document.getElementById("partyForm").reset();
  document.getElementById("partySaveBtn").textContent = "Add Party";
  document.getElementById("partyCancelBtn").classList.add("hidden");
}

function editParty(p) {
  editingPartyId = p.id;
  pType.value = p.type || "customer";
  pName.value = p.name || "";
  pMobile.value = p.mobile || "";
  pAddress.value = p.address || "";
  pGstin.value = p.gstin || "";
  document.getElementById("partySaveBtn").textContent = "Update Party";
  document.getElementById("partyCancelBtn").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteParty(p) {
  if (!confirm(p.name + " ko delete karna hai?")) return;
  const { error } = await partiesApi.remove(p.id);
  if (error) return toast("Delete error: " + error.message, true);
  toast("Party delete ho gayi");
  loadParties();
}

document.getElementById("partyForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = pName.value.trim();
  const mobile = pMobile.value.trim();
  const gstin = pGstin.value.trim().toUpperCase();
  // Validation
  if (!name) return toast("Name is required.", true);
  if (mobile && !/^\d{10}$/.test(mobile)) return toast("Mobile number must be 10 digits.", true);
  if (gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(gstin)) return toast("Invalid GSTIN format.", true);

  const row = { type: pType.value, name, mobile, address: pAddress.value.trim(), gstin };
  const btn = document.getElementById("partySaveBtn");
  btn.disabled = true;
  const { error } = editingPartyId ? await partiesApi.update(editingPartyId, row) : await partiesApi.add(row);
  btn.disabled = false;
  if (error) return toast("Save error: " + error.message, true);
  toast(editingPartyId ? "Party updated successfully." : "Party added successfully.");
  resetPartyForm();
  loadParties();
});
document.getElementById("partyCancelBtn").addEventListener("click", resetPartyForm);

// ================= ITEMS =================
async function loadItems() {
  const { data, error } = await itemsApi.list();
  if (error) return toast("Items load error: " + error.message, true);
  itemsCache = data;
  const body = document.getElementById("itemBody");
  if (!data.length) return emptyMsg(body, "There are no items available.");
  body.innerHTML = "";
  data.forEach((i) =>
    addRow(body, [i.name, i.hsn, i.unit, "₹" + Number(i.rate || 0).toFixed(2)],
      () => editItem(i), () => deleteItem(i))
  );
}

function resetItemForm() {
  editingItemId = null;
  document.getElementById("itemForm").reset();
  document.getElementById("itemSaveBtn").textContent = "Add Item";
  document.getElementById("itemCancelBtn").classList.add("hidden");
}

function editItem(i) {
  editingItemId = i.id;
  iName.value = i.name || "";
  iHsn.value = i.hsn || "";
  iUnit.value = i.unit || "";
  iRate.value = i.rate ?? "";
  document.getElementById("itemSaveBtn").textContent = "Update Item";
  document.getElementById("itemCancelBtn").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteItem(i) {
  if (!confirm(i.name + " Are you sure you want to delete")) return;
  const { error } = await itemsApi.remove(i.id);
  if (error) return toast("Delete error: " + error.message, true);
  toast("Item delete ho gaya");
  loadItems();
}

document.getElementById("itemForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = iName.value.trim();
  if (!name) return toast("Item name is required.", true);
  const rate = parseFloat(iRate.value) || 0;
  if (rate < 0) return toast("Rate must be a positive number.", true);

  const row = { name, hsn: iHsn.value.trim(), unit: iUnit.value.trim(), rate };
  const btn = document.getElementById("itemSaveBtn");
  btn.disabled = true;
  const { error } = editingItemId ? await itemsApi.update(editingItemId, row) : await itemsApi.add(row);
  btn.disabled = false;
  if (error) return toast("Save error: " + error.message, true);
  toast(editingItemId ? "Item updated successfully." : "Item added successfully.");
  resetItemForm();
  loadItems();
});
document.getElementById("itemCancelBtn").addEventListener("click", resetItemForm);

// Login ke baad dono load karo
function loadMasters() { loadParties(); loadItems(); }