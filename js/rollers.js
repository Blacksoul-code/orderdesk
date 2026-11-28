// Machine detail page + Rollers
const $r = (id) => document.getElementById(id);
let currentMachine = null;
let editingRollerId = null;

// Machine kholo
function openMachine(m) {
  currentMachine = m;
  $r("mdName").textContent = m.name || "";
  $r("mdModel").textContent = m.model || "";
  $r("mdBrand").textContent = m.brands ? m.brands.name : "";
  closeRollerForm();
  showView("machine-detail");
  loadRollers();
}

async function loadRollers() {
  const { data, error } = await rollersApi.listByMachine(currentMachine.id);
  if (error) return toast("Rollers load error: " + error.message, true);
  const body = $r("rollerBody");
  body.innerHTML = "";
  if (!data.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 12; td.className = "empty";
    td.textContent = 'No rollers available yet. Click "Add Roller" to add a roller.';
    tr.appendChild(td); body.appendChild(tr);
    return;
  }
  data.forEach((r, i) => {
    const tr = document.createElement("tr");
    // # + pencil
    const first = document.createElement("td");
    first.append(String(i + 1) + " ");
    const eb = document.createElement("button");
    eb.type = "button"; eb.className = "editbtn"; eb.title = "Edit";
    eb.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
    eb.onclick = () => editRoller(r);
    first.appendChild(eb);
    tr.appendChild(first);
    [r.roller_no, r.category, r.roller_type, r.qty, r.color,
     r.shell_dia, r.finish_dia, r.face_length, r.spindle_length, r.hardness].forEach((v) => {
      const td = document.createElement("td");
      td.textContent = v ?? "";
      tr.appendChild(td);
    });
        const act = document.createElement("td");
    act.style.textAlign = "center";
    const ic = document.createElement("span");
    ic.className = r.is_active ? "tick-yes" : "tick-no";
    ic.textContent = r.is_active ? "✔" : "✖";
    ic.title = r.is_active ? "Active" : "Inactive";
    act.appendChild(ic);
    tr.appendChild(act);
    body.appendChild(tr);
  });
}

// ---- Form ----
function openRollerForm() {
  $r("rollerForm").classList.remove("hidden");
  $r("rMachine").value = currentMachine.name;
  $r("rollerForm").scrollTop = 0;
}

function closeRollerForm() {
  editingRollerId = null;
  $r("rollerForm").reset();
  $r("rActive").checked = true;
  $r("rollerForm").classList.add("hidden");
  $r("rollerBar").classList.remove("hidden");
  $r("rollerTableCard").classList.remove("hidden");
  $r("rollerFormTitle").textContent = "Add Roller";
  $r("rollerSaveBtn").textContent = "💾 Save";
}

function editRoller(r) {
  editingRollerId = r.id;
  openRollerForm();
  const cs = $r("rCategory");
  if (r.category && ![...cs.options].some((o) => o.value === r.category)) cs.add(new Option(r.category, r.category));
  cs.value = r.category || "";
  $r("rType").value = r.roller_type || "";
  $r("rQty").value = r.qty ?? 1;
    const cc = $r("rColor");
  if (r.color && ![...cc.options].some((o) => o.value.toLowerCase() === r.color.toLowerCase()))
    cc.add(new Option(r.color, r.color));
  const match = [...cc.options].find((o) => o.value.toLowerCase() === (r.color || "").toLowerCase());
  if (match) r.color = match.value;
  $r("rColor").value = r.color || "";
  $r("rHardness").value = r.hardness || "";
  $r("rShell").value = r.shell_dia ?? "";
  $r("rFinish").value = r.finish_dia ?? "";
  $r("rFace").value = r.face_length ?? "";
  $r("rSpindle").value = r.spindle_length ?? "";
  $r("rActive").checked = !!r.is_active;
  $r("rollerFormTitle").textContent = "Edit Roller (ID " + r.roller_no + ")";
  $r("rollerSaveBtn").textContent = "Update";
}

const numOrNull = (id) => { const v = parseFloat($r(id).value); return isNaN(v) ? null : v; };

$r("addRollerBtn").addEventListener("click", openRollerForm);
$r("rollerCancelBtn").addEventListener("click", closeRollerForm);
$r("backToMachines").addEventListener("click", () => showView("machines"));

$r("rollerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const category = $r("rCategory").value.trim();
  const roller_type = $r("rType").value.trim();
  const qty = parseInt($r("rQty").value, 10);
  if (!category) return toast("Roller category is required.", true);
  if (!roller_type) return toast("Type of roller is required.", true);
  if (!qty || qty < 1) return toast("Quantity must be 1 or more.", true);

    const row = {
    category, roller_type, qty,
    color: $r("rColor").value.trim(),
    hardness: $r("rHardness").value.trim(),
    shell_dia: numOrNull("rShell"),
    finish_dia: numOrNull("rFinish"),
    face_length: numOrNull("rFace"),
    spindle_length: numOrNull("rSpindle"),
    is_active: $r("rActive").checked,
  };
  const btn = $r("rollerSaveBtn");
  btn.disabled = true;
  const { error } = editingRollerId
    ? await rollersApi.update(editingRollerId, row)
    : await rollersApi.add({ ...row, machine_id: currentMachine.id });
  btn.disabled = false;
  if (error) return toast("Save error: " + error.message, true);
  toast(editingRollerId ? "Roller updated successfully." : "Roller added successfully.");
  closeRollerForm();
  loadRollers();
});