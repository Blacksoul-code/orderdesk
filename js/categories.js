// Roller Category master
const $c = (id) => document.getElementById(id);
let editingCatId = null;
let editingCatOld = "";
let catsCache = [];
const DEFAULT_CATS = ["Inkers", "Dampening", "Transfer", "Distributor"];

// Roller form ka Category dropdown bharo (sirf asli categories)
function fillCategoryList(list) {
  const sel = $c("rCategory");
  if (!sel) return;
  const keep = sel.value;
  sel.innerHTML = '<option value="">-- Select Category --</option>';
  list.forEach((c) => sel.add(new Option(c.name, c.name)));
  sel.value = keep;
}

async function loadCategories() {
  let { data, error } = await categoriesApi.list();
  if (error) return toast("Categories load error: " + error.message, true);

  // Pehli baar: default categories bana do
  if (!data.length) {
    await categoriesApi.add(DEFAULT_CATS.map((name) => ({ name })));
    ({ data } = await categoriesApi.list());
  }

    catsCache = data;
  fillCategoryList(data);
  renderCategories();
}

function renderCategories() {
  const q = $c("cSearch").value.trim().toLowerCase();
  const list = catsCache.filter((c) => !q || (c.name || "").toLowerCase().includes(q));
  const body = $c("catBody");
  if (!list.length) return emptyMsg(body, catsCache.length ? "Koi category match nahi hui." : "Abhi koi category nahi hai.");
  body.innerHTML = "";
  list.forEach((c) => addRow(body, [c.name], () => editCategory(c), () => deleteCategory(c)));
}
$c("cSearch").addEventListener("input", renderCategories);

function resetCatForm() {
  editingCatId = null;
  editingCatOld = "";
  $c("catForm").reset();
  $c("catSaveBtn").textContent = "Add Category";
    $c("catFormTitle").textContent = "Add Category";
}

function editCategory(c) {
  editingCatId = c.id;
  editingCatOld = c.name;
  showView("category-add");
  $c("cName").value = c.name;
  $c("catFormTitle").textContent = "Edit Category";
  $c("catSaveBtn").textContent = "Update Category";
}

async function deleteCategory(c) {
  if (!confirm(c.name + " delete karni hai?\n(Is category ke purane rollers me naam waisa hi rahega)")) return;
  const { error } = await categoriesApi.remove(c.id);
  if (error) return toast("Delete error: " + error.message, true);
  toast("Category delete ho gayi");
  loadCategories();
}

$c("catForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $c("cName").value.trim();
  if (!name) return toast("Category name zaroori hai", true);
  const btn = $c("catSaveBtn");
  btn.disabled = true;
  const { error } = editingCatId
    ? await categoriesApi.update(editingCatId, { name })
    : await categoriesApi.add({ name });
  btn.disabled = false;
  if (error) return toast(error.code === "23505" ? "This category already exists" : "Save error: " + error.message, true);

  // Naam badla ho to purane rollers me bhi badlo
  if (editingCatId && editingCatOld && editingCatOld !== name) {
    await sb.from("rollers").update({ category: name }).eq("category", editingCatOld);
  }
  toast(editingCatId ? "Category updated successfully" : "Category added successfully");
  resetCatForm();
  await loadCategories();
  showView("categories");
});
$c("catCancelBtn").addEventListener("click", () => { resetCatForm(); showView("categories"); });

// "+ Add Category" button
$c("addCatBtn").addEventListener("click", () => {
  resetCatForm();
  showView("category-add");
});