// Work Order: brand -> machine -> rollers chuno aur items me jodo
const $p = (id) => document.getElementById(id);
let pmRollers = [];

// Size text: Face Length X Shell Dia X Finish Dia X Total(Spindle) Length
function rollerSize(r) {
  return [r.face_length, r.shell_dia, r.finish_dia, r.spindle_length]
    .filter((v) => v !== null && v !== undefined && v !== "")
    .map((v) => v + "MM").join(" X ");
}

function pmUpdateTotal() {
  let t = 0;
  $p("pmBody").querySelectorAll("tr.pmrow").forEach((tr) => {
    if (tr.querySelector(".pmchk").checked) t += parseFloat(tr.querySelector(".pmqty").value) || 0;
  });
  $p("pmTotal").textContent = t;
}

function openPicker() {
  const b = $p("pmBrand");
  b.innerHTML = '<option value="">-- Brand chuno --</option>';
  brandsCache.forEach((x) => b.add(new Option(x.name, x.id)));
  $p("pmMachine").innerHTML = '<option value="">-- Machine chuno --</option>';
  $p("pmBody").innerHTML = "";
  pmUpdateTotal();
  $p("rollerModal").classList.remove("hidden");
}
function closePicker() { $p("rollerModal").classList.add("hidden"); }

// Brand badalne par sirf usi brand ki machines
$p("pmBrand").addEventListener("change", () => {
  const m = $p("pmMachine");
  m.innerHTML = '<option value="">-- Machine chuno --</option>';
  machinesCache.filter((x) => x.brand_id === $p("pmBrand").value)
    .forEach((x) => m.add(new Option(x.name, x.id)));
  $p("pmBody").innerHTML = "";
  pmUpdateTotal();
});

// Machine chunte hi uske active rollers dikhao
$p("pmMachine").addEventListener("change", async () => {
  const id = $p("pmMachine").value;
  const body = $p("pmBody");
  body.innerHTML = "";
  pmRollers = [];
  pmUpdateTotal();
  if (!id) return;
  const { data, error } = await rollersApi.listByMachine(id);
  if (error) return toast("Rollers load error: " + error.message, true);
  pmRollers = data.filter((r) => r.is_active);
  if (!pmRollers.length) return emptyMsg(body, "Is machine me koi active roller nahi hai.");
  pmRollers.forEach((r, i) => {
    const tr = document.createElement("tr");
    tr.className = "pmrow";
    tr.dataset.i = i;
    tr.innerHTML = `<td><input type="checkbox" class="pmchk" /></td>
      <td class="pmdet"></td><td class="pmmq"></td>
      <td><input type="number" class="pmqty" min="1" step="1" /></td>`;
    tr.querySelector(".pmdet").textContent =
      `${r.roller_type} | ${r.category || ""} | ${r.color || ""} | ${rollerSize(r)}`;
    tr.querySelector(".pmmq").textContent = r.qty ?? "";
    tr.querySelector(".pmqty").value = r.qty || 1;
    body.appendChild(tr);
  });
});

$p("pmBody").addEventListener("input", pmUpdateTotal);
$p("pmBody").addEventListener("change", pmUpdateTotal);

// Save: chune hue rollers work order ke items me jodo
$p("pmSave").addEventListener("click", () => {
  const picked = [];
  $p("pmBody").querySelectorAll("tr.pmrow").forEach((tr) => {
    if (!tr.querySelector(".pmchk").checked) return;
    const qty = parseFloat(tr.querySelector(".pmqty").value) || 0;
    if (qty > 0) picked.push({ r: pmRollers[tr.dataset.i], qty });
  });
  if (!picked.length) return toast("Kam se kam ek roller chuno (qty 1+)", true);

  // Khali pehli row hata do
  document.querySelectorAll("#itemsBody tr:not(.sec-row)").forEach((tr) => {
    if (!tr.querySelector(".it-name").value.trim() && !tr.querySelector(".it-qty").value) tr.remove();
  });
      // Machine ka naam table ke upar wale box me (doosri machine ho to " / " se judega)
  const mName = $p("pmMachine").selectedOptions[0].textContent.trim();
  const cur = $d("dMachine").value.split(" / ").map((x) => x.trim()).filter(Boolean);
  if (!cur.some((x) => x.toLowerCase() === mName.toLowerCase())) cur.push(mName);
  $d("dMachine").value = cur.join(" / ");

  picked.forEach(({ r, qty }) =>
    addItemRow({ name: r.roller_type, desc: rollerSize(r), color: r.color || "", qty, unit: "PCS" })
  );
  recalc();
  closePicker();
  toast(picked.length + " Rollers added successfully.");
});

$p("pmClose").addEventListener("click", closePicker);
$p("addRollersBtn").addEventListener("click", openPicker);