let settingsData = {};   

// Extract data from all `[data-key]` fields in the form.
function collectSettings() {
  const d = { ...settingsData };
  document.querySelectorAll("#settingsForm [data-key]").forEach((el) => {
    d[el.dataset.key] = el.type === "checkbox" ? el.checked : el.value;
  });
  return d;
}

//Populate the form with the saved data.
function fillSettings() {
  document.querySelectorAll("#settingsForm [data-key]").forEach((el) => {
    const v = settingsData[el.dataset.key];
    if (el.type === "checkbox") el.checked = v === undefined ? true : !!v;
    else if (v !== undefined) el.value = v;
  });
}

// Resize the image to a maximum dimension of 600px and convert it into a PNG Blob.
function resizeImage(file, maxW = 600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("Unable to convert the image."))), "image/png");
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error("Unable to read the image."));
    img.src = URL.createObjectURL(file);
  });
}

// Teeno image boxes (logo/signature/stamp) ka preview refresh karo
async function refreshImages() {
  for (const box of document.querySelectorAll(".imgbox")) {
    const kind = box.dataset.img;
    const img = box.querySelector(".imgprev");
    if (settingsData["img_" + kind]) {
      const { url } = await storageApi.url(kind);
      if (url) { img.src = url; img.classList.remove("hidden"); continue; }
    }
    img.classList.add("hidden");
    img.removeAttribute("src");
  }
  renderPreview();
}

// Header ka live preview
function renderPreview() {
  const d = collectSettings();
  const p = document.getElementById("headerPreview");
  const layout = d.headerLayout || "left";
  p.className = "preview layout-" + layout;
  p.style.borderBottom = "4px solid " + (d.accentColor || "#2563eb");
  p.innerHTML = "";

  const logo = document.querySelector('.imgbox[data-img="logo"] .imgprev');
  if (layout !== "text" && logo && logo.getAttribute("src")) {
    const i = document.createElement("img");
    i.src = logo.src;
    p.appendChild(i);
  }
  const t = document.createElement("div");
  const h = document.createElement("h3");
  h.textContent = d.businessName || "Your Business Name";
  h.style.color = d.accentColor || "#2563eb";
  t.appendChild(h);
  [d.tagline, d.address, d.phone].filter(Boolean).forEach((x) => {
    const q = document.createElement("p");
    q.textContent = x;
    t.appendChild(q);
  });
  p.appendChild(t);
}

// Settings load (login ke baad)
async function loadSettings() {
  const { data, error } = await settingsApi.get();
  if (error) return toast("Settings load nahi hui: " + error.message, true);
  settingsData = data;
  fillSettings();
  await refreshImages();
}

// Save button
document.getElementById("settingsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("saveSettingsBtn");
  btn.disabled = true;
  const d = collectSettings();
  const { error } = await settingsApi.save(d);
  btn.disabled = false;
  if (error) return toast("Save error: " + error.message, true);
  settingsData = d;
  toast("Settings saved successfully.");
});

// Live preview: kuch bhi type/change karo to preview badle
document.getElementById("settingsForm").addEventListener("input", renderPreview);

// Image upload / remove
document.querySelectorAll(".imgbox").forEach((box) => {
  const kind = box.dataset.img;

  box.querySelector('input[type="file"]').addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const blob = await resizeImage(file);
      const { error } = await storageApi.upload(kind, blob);
      if (error) throw error;
      settingsData["img_" + kind] = true;
      const r = await settingsApi.save(collectSettings());
      if (r.error) throw r.error;
      await refreshImages();
      toast(kind + " uploaded successfully");
    } catch (err) {
      toast("Upload error: " + err.message, true);
    }
    e.target.value = "";
  });

  box.querySelector(".rmimg").addEventListener("click", async () => {
    await storageApi.remove(kind);
    settingsData["img_" + kind] = false;
    await settingsApi.save(collectSettings());
    await refreshImages();
    toast(kind + " Removed successfully.");
  });
});