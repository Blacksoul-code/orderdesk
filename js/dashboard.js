// Dashboard: counts, pending amount, recent documents
async function loadDashboard() {
  const { data, error } = await documentsApi.list();
  if (error) return toast("Dashboard load error: " + error.message, true);

  const count = (t) => data.filter((d) => d.doc_type === t).length;
  document.getElementById("stOrders").textContent = count("order");
  document.getElementById("stWO").textContent = count("work_order");
  document.getElementById("stPO").textContent = count("purchase_order");
  document.getElementById("stCH").textContent = count("challan");

  // Pending = Orders ka balance (Cancelled chhodkar)
  const pending = data
    .filter((d) => d.doc_type === "order")
    .reduce((s, d) => s + (Number(d.balance) || 0), 0);
  document.getElementById("stPending").textContent = "₹" + money(pending);

  // Last 8 documents (list pehle se newest-first aati hai)
  const body = document.getElementById("recentBody");
  body.innerHTML = "";
  if (!data.length) return emptyMsg(body, "Abhi koi document nahi hai.");
  data.slice(0, 8).forEach((d) => {
    const tr = document.createElement("tr");
    [d.doc_no, TYPE_NAME[d.doc_type], d.party_name || "-", fmtDate(d.doc_date),
     Number(d.total) > 0 ? "₹" + money(d.total) : "-"].forEach((v) => {
      const td = document.createElement("td");
      td.textContent = v ?? "";
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });
}

// Card par click = Documents list
document.querySelectorAll(".stat[data-go]").forEach((c) =>
  c.addEventListener("click", () => showView(c.dataset.go))
);