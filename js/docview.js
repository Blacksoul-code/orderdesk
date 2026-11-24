let viewingRow = null;
let viewingUrl = null;

async function viewDoc(id) {
  const { data: doc, error } = await documentsApi.get(id);
  if (error) return toast("Load error: " + error.message, true);
  viewingRow = doc;
    // Mobile par iframe me PDF nahi dikhta, nayi tab me kholo
  if (window.innerWidth < 700) { openPdf(doc); return; }
  try {
    toast("Generating preview......");
    const pdf = await buildPdf(doc);
    if (viewingUrl) URL.revokeObjectURL(viewingUrl);
    viewingUrl = URL.createObjectURL(pdf.output("blob"));
    document.getElementById("viewFrame").src = viewingUrl;
    document.getElementById("viewModal").classList.remove("hidden");
  } catch (err) {
    console.error(err);
    toast("Preview error: " + err.message, true);
  }
}

function closeView() {
  document.getElementById("viewModal").classList.add("hidden");
  document.getElementById("viewFrame").src = "about:blank";
  if (viewingUrl) { URL.revokeObjectURL(viewingUrl); viewingUrl = null; }
}

document.getElementById("viewCloseBtn").addEventListener("click", closeView);
document.getElementById("viewPdfBtn").addEventListener("click", () => viewingRow && downloadPdf(viewingRow));

// Print: iframe ka PDF print karo (na chale to nayi tab me kholo)
document.getElementById("viewPrintBtn").addEventListener("click", () => {
  const f = document.getElementById("viewFrame");
  try {
    f.contentWindow.focus();
    f.contentWindow.print();
  } catch (e) {
    if (viewingRow) openPdf(viewingRow);
  }
});