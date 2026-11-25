const PREFIX = { order: "ORD", purchase_order: "PO", challan: "CH" };
const TYPE_NAME = { order: "Order Form", work_order: "Work Order", purchase_order: "Purchase Order", challan: "Delivery Challan" };
const $d = (id) => document.getElementById(id);
let editingDocId = null;
let wantPdf = false;   // "Save & Download PDF" dabaya ya nahi

const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
const numVal = (id) => parseFloat($d(id).value) || 0;
const fmtDate = (s) => (s ? s.split("-").reverse().join("-") : "");
const todayLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

// Kya ye "Without Amount" (Work Order) format hai?
const isWO = () => $d("dType").value === "work_order";

// ---------- Type / Format ke hisaab se form badlo ----------
function applyType() {
  const type = $d("dType").value;
  const wo = isWO();
  $d("docForm").dataset.type = type;
  $d("docForm").dataset.format = wo ? "without" : "with";
  document.querySelectorAll("#docForm [data-for]").forEach((el) => {
    el.classList.toggle("hidden", !el.dataset.for.split(",").includes(type));
  });
  const supplier = type === "purchase_order";
  $d("partyTitle").textContent = wo ? "Kind Attn (Optional)" : supplier ? "Supplier Details" : type === "challan" ? "Receiver Details" : "Customer Details";
  $d("partyLabel").textContent = wo ? "Kind Attn (optional)" : supplier ? "Supplier Name *" : type === "challan" ? "Receiver Name *" : "Customer Name *";
  $d("dParty").required = !wo;                       // Work Order optional
    $d("partyCard").classList.toggle("hidden", wo);   // removed kindly attend frrom work order 
  $d("dNoLabel").textContent = wo ? "Work Order No" : "Document No";
  fillLists();
  recalc();
}

// Party aur item suggestions (datalist)
function fillLists() {
  const want = $d("dType").value === "purchase_order" ? "supplier" : "customer";
  const pl = $d("partyList");
  pl.innerHTML = "";
  partiesCache.filter((p) => p.type === want).forEach((p) => {
    const o = document.createElement("option");
    o.value = p.name;
    pl.appendChild(o);
  });
  const il = $d("itemList");
  il.innerHTML = "";
  itemsCache.forEach((i) => {
    const o = document.createElement("option");
    o.value = i.name;
    il.appendChild(o);
  });
}

// ---------- Items table ----------
// it = {section:"..."} to heading row, warna normal item row
function addItemRow(it = {}) {
  const tr = document.createElement("tr");
  if (it.section !== undefined) {
    tr.className = "sec-row";
    tr.innerHTML = `<td></td>
      <td colspan="9"><input class="sec-name" placeholder="Section heading (like INKING ROLLERS)" /></td>
      <td><button type="button" class="small danger rm">✕</button></td>`;
    tr.querySelector(".sec-name").value = it.section || "";
      if (it.rollerId) tr.dataset.rollerId = it.rollerId;
    $d("itemsBody").appendChild(tr);
    return;
  }
  tr.innerHTML = `
    <td class="sr"></td>
    <td><input class="it-name" list="itemList" autocomplete="off" /></td>
    <td class="col-hsn"><input class="it-hsn" /></td>
    <td class="col-desc"><input class="it-desc" placeholder="84MM X 1030MM X 1120.8MM" /></td>
    <td class="col-color"><input class="it-color" placeholder="Black" /></td>
    <td><input class="it-qty" type="number" min="0" step="any" /></td>
    <td><input class="it-unit" /></td>
    <td class="col-money"><input class="it-rate" type="number" min="0" step="0.01" /></td>
    <td class="col-money amt">0.00</td>
    <td class="col-remarks"><input class="it-remarks" /></td>
    <td><button type="button" class="small danger rm">✕</button></td>`;
  tr.querySelector(".it-name").value = it.name || "";
  tr.querySelector(".it-hsn").value = it.hsn || "";
  tr.querySelector(".it-desc").value = it.desc || "";
  tr.querySelector(".it-color").value = it.color || "";
  tr.querySelector(".it-qty").value = it.qty ?? "";
  tr.querySelector(".it-unit").value = it.unit || "";
  tr.querySelector(".it-rate").value = it.rate ?? "";
  tr.querySelector(".it-remarks").value = it.remarks || "";
  $d("itemsBody").appendChild(tr);
}

// ---------- Calculation ----------
function recalc() {
  const type = $d("dType").value;
  const wo = isWO();
  let sub = 0, qtyTotal = 0, n = 0;
  document.querySelectorAll("#itemsBody tr:not(.sec-row)").forEach((tr) => {
    tr.querySelector(".sr").textContent = ++n;
    const q = parseFloat(tr.querySelector(".it-qty").value) || 0;
    const r = parseFloat(tr.querySelector(".it-rate").value) || 0;
    const a = r2(q * r);
    tr.querySelector(".amt").textContent = a.toFixed(2);
    sub += a;
    qtyTotal += q;
  });
  $d("sQty").textContent = r2(qtyTotal);
  if (wo || type === "challan" && false) {
    // Work order me amount nahi hota
    return { sub: 0, disc: 0, adv: 0, fr: 0, gst: 0, gstAmt: 0, total: 0, balance: 0, qty: r2(qtyTotal) };
  }
  const disc = type === "order" ? numVal("dDiscount") : 0;
  const adv = type === "order" ? numVal("dAdvance") : 0;
  const fr = type === "purchase_order" ? numVal("dFreight") : 0;
  const gst = type === "challan" ? 0 : numVal("dGst");
  const taxable = Math.max(sub - disc, 0);
  const gstAmt = r2((taxable * gst) / 100);
  const total = r2(taxable + gstAmt + fr);
  const balance = type === "order" ? r2(total - adv) : type === "purchase_order" ? total : 0;
  $d("sSub").textContent = r2(sub).toFixed(2);
  $d("sGst").textContent = gstAmt.toFixed(2);
  $d("sTotal").textContent = total.toFixed(2);
  $d("sBal").textContent = balance.toFixed(2);
  return { sub: r2(sub), disc, adv, fr, gst, gstAmt, total, balance, qty: r2(qtyTotal) };
}

// ---------- Form ka data nikalo ----------
function collectItems() {
  const wo = isWO();
  const items = [];
  document.querySelectorAll("#itemsBody tr").forEach((tr) => {
    if (tr.classList.contains("sec-row")) {
      const s = tr.querySelector(".sec-name").value.trim();
      if (s) items.push({ section: s });
      return;
    }
    const name = tr.querySelector(".it-name").value.trim();
    if (!name) return;
    const qty = parseFloat(tr.querySelector(".it-qty").value) || 0;
    const rate = wo ? 0 : parseFloat(tr.querySelector(".it-rate").value) || 0;
    items.push({
      name, qty, rate, amount: r2(qty * rate),
      rollerId: tr.dataset.rollerId || "",
      hsn: tr.querySelector(".it-hsn").value.trim(),
      desc: tr.querySelector(".it-desc").value.trim(),
      color: tr.querySelector(".it-color").value.trim(),
      unit: tr.querySelector(".it-unit").value.trim(),
      remarks: tr.querySelector(".it-remarks").value.trim(),
    });
  });
  return items;
}

// ---------- Naya / Edit form ----------
function startNew(type = "order", format = "with") {
  editingDocId = null;
  $d("docForm").reset();
  $d("dType").disabled = false; 
  $d("dType").value = type;
  $d("dDate").value = todayLocal();
  $d("dNo").value = "Generated automatically";
  $d("itemsBody").innerHTML = "";
  addItemRow();
  $d("formTitle").textContent = "New " + TYPE_NAME[type];
  $d("docSaveBtn").textContent = "Save Document";
    setDrawings([]);   // naye document me purani drawings hatao
  applyType();
}

async function editDoc(id) {
  const { data: doc, error } = await documentsApi.get(id);
  if (error) return toast("Document load error: " + error.message, true);
   const d = (await liveRollers(doc)).data || {};   // machine se latest roller details
  const p = d.party || {};
    startNew(doc.doc_type);
  editingDocId = id;
  $d("dType").disabled = true;           // edit me type/format nahi badalna
  $d("dNo").value = doc.doc_no;
  $d("dDate").value = doc.doc_date || "";
   $d("dParty").value = p.name || "";
  $d("dMobile").value = p.mobile || "";
  $d("dAddress").value = p.address || "";
  $d("dGstin").value = p.gstin || "";
  $d("dDelivery").value = d.delivery || "";
  $d("dPayTerms").value = d.payTerms || "";
  $d("dShipTo").value = d.shipTo || "";
  $d("dVehicle").value = d.vehicle || "";
  $d("dDriver").value = d.driver || "";
  $d("dDriverPhone").value = d.driverPhone || "";
  $d("dRef").value = d.ref || "";
  $d("dDiscount").value = d.discount ?? 0;
  $d("dGst").value = d.gst ?? 0;
  $d("dFreight").value = d.freight ?? 0;
  $d("dAdvance").value = d.advance ?? 0;
  $d("dNotes").value = d.notes || "";
  // Work order fields
  const w = d.wo || {};
  $d("dPrepared").value = w.preparedBy || "";
    $d("dMachine").value = w.machine || "";
  $d("dApproved").value = w.approvedBy || "";
  $d("dImportant").value = w.important || "";
    setDrawings(w.drawings || []);
  $d("itemsBody").innerHTML = "";
  (d.items && d.items.length ? d.items : [{}]).forEach(addItemRow);
  $d("formTitle").textContent = "Edit " + doc.doc_no;
  $d("docSaveBtn").textContent = "Update Document";
  recalc();
  showView("form");
}

// ---------- Events ----------
$d("dType").addEventListener("change", applyType);
$d("addItemBtn").addEventListener("click", () => addItemRow());
$d("addSectionBtn").addEventListener("click", () => addItemRow({ section: "" }));
$d("docForm").addEventListener("input", recalc);

// Item ka naam chunte hi HSN/unit/rate bhar do
$d("itemsBody").addEventListener("change", (e) => {
  if (!e.target.classList.contains("it-name")) return;
  const m = itemsCache.find((i) => i.name.toLowerCase() === e.target.value.trim().toLowerCase());
  if (!m) return;
  const tr = e.target.closest("tr");
  if (!tr.querySelector(".it-hsn").value) tr.querySelector(".it-hsn").value = m.hsn || "";
  if (!tr.querySelector(".it-unit").value) tr.querySelector(".it-unit").value = m.unit || "";
  if (!tr.querySelector(".it-rate").value) tr.querySelector(".it-rate").value = m.rate || "";
  recalc();
});

// Row delete
$d("itemsBody").addEventListener("click", (e) => {
  if (!e.target.classList.contains("rm")) return;
  e.target.closest("tr").remove();
  if (!$d("itemsBody").children.length) addItemRow();
  recalc();
});

// Party ka naam chunte hi mobile/address bhar do
$d("dParty").addEventListener("change", () => {
  const m = partiesCache.find((p) => p.name.toLowerCase() === $d("dParty").value.trim().toLowerCase());
  if (!m) return;
  $d("dMobile").value = m.mobile || "";
  $d("dAddress").value = m.address || "";
  $d("dGstin").value = m.gstin || "";
});

$d("newDocBtn").addEventListener("click", () => startNew("order"));
$d("docCancelBtn").addEventListener("click", () => showView("docs"));
$d("docSavePdfBtn").addEventListener("click", () => { wantPdf = true; });
$d("docSaveBtn").addEventListener("click", () => { wantPdf = false; });

// ---------- SAVE ----------
$d("docForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const type = $d("dType").value;
  const wo = isWO();
  const name = $d("dParty").value.trim();
  const mobile = $d("dMobile").value.trim();
  const gstin = $d("dGstin").value.trim().toUpperCase();
  const items = collectItems();
  const real = items.filter((i) => !i.section);

  // Validation
    if (!name && !wo) return toast("Party name is required.", true);
  if (mobile && !/^\d{10}$/.test(mobile)) return toast("Mobile number must be 10 digits.", true);
  if (gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(gstin)) return toast("Invalid GSTIN format.", true);
  if (!real.length) return toast("At least one item is required.", true);
  if (real.some((i) => i.qty <= 0)) return toast("Quantity for each item must be greater than 0.", true);

  const t = recalc();
  const row = {
    doc_type: type,
    party_name: name,
    party_mobile: mobile,
    doc_date: $d("dDate").value,
    total: type === "challan" || wo ? 0 : t.total,
    balance: t.balance,
    data: {
      party: { name, mobile, address: $d("dAddress").value.trim(), gstin },
      delivery: $d("dDelivery").value,
      payTerms: $d("dPayTerms").value.trim(),
      shipTo: $d("dShipTo").value.trim(),
      vehicle: $d("dVehicle").value.trim(),
      driver: $d("dDriver").value.trim(),
      driverPhone: $d("dDriverPhone").value.trim(),
      ref: $d("dRef").value.trim(),
      items,
      subtotal: t.sub, discount: t.disc, gst: t.gst, gstAmt: t.gstAmt,
      freight: t.fr, advance: t.adv, total: t.total, balance: t.balance,
      totalQty: t.qty,
      notes: $d("dNotes").value.trim(),
            wo: wo ? {
        woNo: editingDocId ? $d("dNo").value : "",    // naye doc me save par #STK01 banega
        badge: editingDocId ? $d("dNo").value : "",   // bada badge = Work Order No
        machine: $d("dMachine").value.trim(),
        preparedBy: $d("dPrepared").value.trim(),
        approvedBy: $d("dApproved").value.trim(),
        drawingAttached: $d("dDrawing").checked,
        important: $d("dImportant").value.trim(),
        drawings: getDrawings(),
      } : null,
    },
  };

  const btn = $d("docSaveBtn");
  btn.disabled = true;
  let error, savedNo;
  if (editingDocId) {
    ({ error } = await documentsApi.update(editingDocId, row));
    savedNo = $d("dNo").value;
    } else {
    // Work Order ka alag counter ("wo") => #STK01, #STK02...
    const r = await documentsApi.nextNo(wo ? "wo" : type);
    if (r.error) { btn.disabled = false; return toast("Number error: " + r.error.message, true); }
    if (wo) {
      row.doc_no = "#ZD" + String(r.data).padStart(2, "0");
      row.data.wo.woNo = row.doc_no;     // Work Order No
      row.data.wo.badge = row.doc_no;    // bada badge text (same)
    } else {
      row.doc_no = PREFIX[type] + "-" + String(r.data).padStart(4, "0");
    }
    savedNo = row.doc_no;
    ({ error } = await documentsApi.add(row));
  }
  btn.disabled = false;
  if (error) return toast("Save error: " + error.message, true);

  toast(savedNo + " saved successfully.");
    if (wantPdf) { wantPdf = false; downloadPdf({ ...row, doc_no: savedNo }); }
  await loadDocs();
  showView("docs");
});

// ---------- LIST ----------
// ---------- LIST (search + filter + pagination) ----------
let allDocs = [];
let docPage = 1;
const PAGE_SIZE = 15;

async function loadDocs() {
  const { data, error } = await documentsApi.list();
  if (error) return toast("Documents load error: " + error.message, true);
  allDocs = data;
  renderDocs();
}

// Filter lagakar list banao
function filteredDocs() {
  const q = $d("fSearch").value.trim().toLowerCase();
  const from = $d("fFrom").value, to = $d("fTo").value;
    const t = $d("fType").value;
  return allDocs.filter((d) =>
    (!q || (d.doc_no || "").toLowerCase().includes(q) ||
           (d.party_name || "").toLowerCase().includes(q) ||
           (d.party_mobile || "").includes(q)) &&
    (!t || d.doc_type === t) &&
    (!from || (d.doc_date || "") >= from) &&
    (!to || (d.doc_date || "") <= to)
  );
}

function renderDocs() {
  const list = filteredDocs();
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  if (docPage > pages) docPage = pages;
  const body = $d("docsBody");
  $d("pgInfo").textContent = `Page ${docPage} / ${pages}  (${list.length} documents)`;
  $d("pgPrev").disabled = docPage <= 1;
  $d("pgNext").disabled = docPage >= pages;

  if (!list.length) return emptyMsg(body, allDocs.length ? "No matching documents found." : "No documents available yet. Click + New to create one.");
  body.innerHTML = "";
  list.slice((docPage - 1) * PAGE_SIZE, docPage * PAGE_SIZE).forEach((d) =>
    addRow(
      body,
      [d.doc_no, TYPE_NAME[d.doc_type], d.party_name, fmtDate(d.doc_date),
       Number(d.total) > 0 ? "₹" + Number(d.total).toFixed(2) : "-"],
      () => editDoc(d.id),
      async () => {
        if (!confirm(d.doc_no + " delete karna hai?")) return;
        const r = await documentsApi.remove(d.id);
        if (r.error) return toast("Delete error: " + r.error.message, true);
        toast("Document deleted successfully.");
        loadDocs();
          // Mobile card view ke liye har cell par label
  const labels = ["Doc No", "Type", "Party", "Date", "Total", ""];
  body.querySelectorAll("tr").forEach((tr) => {
    [...tr.children].forEach((td, i) => td.setAttribute("data-label", labels[i] || ""));
  });
      },
      [
        { label: "👁 View", fn: () => viewDoc(d.id) },
        { label: "PDF", fn: async () => {
            const r = await documentsApi.get(d.id);
            if (r.error) return toast("Load error: " + r.error.message, true);
            downloadPdf(r.data);
        } },
        { label: "Print", fn: async () => {
            const r = await documentsApi.get(d.id);
            if (r.error) return toast("Load error: " + r.error.message, true);
            openPdf(r.data);
        } },
      ]
    )
  );
}

// Filter badalte hi page 1 par jao
["fSearch", "fType", "fFrom", "fTo"].forEach((id) =>
  $d(id).addEventListener("input", () => { docPage = 1; renderDocs(); })
);
$d("fClear").addEventListener("click", () => {
 ["fSearch", "fType", "fFrom", "fTo"].forEach((id) => ($d(id).value = ""));
  docPage = 1; renderDocs();
});
$d("pgPrev").addEventListener("click", () => { docPage--; renderDocs(); });
$d("pgNext").addEventListener("click", () => { docPage++; renderDocs(); });

// Page khulte hi form ready rakho
startNew("order");