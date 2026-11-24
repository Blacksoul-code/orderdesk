// Work Order drawings: upload, preview, remove
let woDrawings = [];   // storage paths

// Image ko max 1600px, JPEG banao
function drawingBlob(file, maxW = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const sc = Math.min(1, maxW / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * sc);
      c.height = Math.round(img.height * sc);
      const x = c.getContext("2d");
      x.fillStyle = "#fff";
      x.fillRect(0, 0, c.width, c.height);
      x.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("Image convert nahi hui"))), "image/jpeg", 0.85);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error("Image padh nahi payi"));
    img.src = URL.createObjectURL(file);
  });
}

// Preview list dikhao
async function renderDrawings() {
  const box = document.getElementById("drawList");
  box.innerHTML = "";
  for (let i = 0; i < woDrawings.length; i++) {
    const url = await storageApi.urlOf(woDrawings[i]);
    const d = document.createElement("div");
    d.className = "drawitem";
    const img = document.createElement("img");
    if (url) img.src = url;
    const rm = document.createElement("button");
    rm.type = "button"; rm.textContent = "✕"; rm.title = "Hatao";
    rm.onclick = () => { woDrawings.splice(i, 1); renderDrawings(); };
    const lb = document.createElement("span");
    lb.textContent = "Drawing " + (i + 1);
    d.append(img, rm, lb);
    box.appendChild(d);
  }
}

// Documents.js ke liye helpers
function setDrawings(paths) { woDrawings = Array.isArray(paths) ? [...paths] : []; renderDrawings(); }
function getDrawings() { return [...woDrawings]; }

// File chunte hi upload
document.getElementById("drawInput").addEventListener("change", async (e) => {
  const files = [...e.target.files];
  for (const f of files) {
    try {
      const blob = await drawingBlob(f);
      const { path, error } = await storageApi.uploadDrawing(blob);
      if (error) throw error;
      woDrawings.push(path);
    } catch (err) {
      toast("Drawing upload error: " + err.message, true);
    }
  }
  e.target.value = "";
  renderDrawings();
  if (files.length) toast("Drawing uploaded successfully.");
});