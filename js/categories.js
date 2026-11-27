// Roller Category master
const $c = (id) => document.getElementById(id);
let editingCatId = null;
let editingCatOld = "";
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

  fillCategoryList(data);
  const body = $c("catBody");
  if (!data.length) return emptyMsg(body, "Abhi koi category nahi hai.");
  body.innerHTML = "";
  data.forEach((c) => addRow(body, [c.name], () => editCategory(c), () => deleteCategory(c)));
}

function resetCatForm() {
  editingCatId = null;
  editingCatOld = "";
  $c("catForm").reset();
  $c("catSaveBtn").textContent = "Add Category";
  $c("catCancelBtn").classList.add("hidden");
}

function editCategory(c) {
  editingCatId = c.id;
  editingCatOld = c.name;
  $c("cName").value = c.name;
  $c("catSaveBtn").textContent = "Update Category";
  $c("catCancelBtn").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
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
  if (error) return toast(error.code === "23505" ? "Ye category pehle se hai" : "Save error: " + error.message, true);

  // Naam badla ho to purane rollers me bhi badlo
  if (editingCatId && editingCatOld && editingCatOld !== name) {
    await sb.from("rollers").update({ category: name }).eq("category", editingCatOld);
  }
  toast(editingCatId ? "Category update ho gayi ✅" : "Category add ho gayi ✅");
  resetCatForm();
  loadCategories();
});
$c("catCancelBtn").addEventListener("click", resetCatForm);