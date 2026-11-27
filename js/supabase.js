// Supabase client is named **"sb"** because **"supabase"** is already used by the library.
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- AUTH ----------
const authApi = {
  login: (email, password) => sb.auth.signInWithPassword({ email, password }),
  logout: () => sb.auth.signOut(),
  getSession: async () => (await sb.auth.getSession()).data.session,
};

// ---------- SETTINGS (table: settings) ----------
const settingsApi = {
  get: async () => {
    const { data, error } = await sb.from("settings").select("data").maybeSingle();
    return { data: (data && data.data) || {}, error };
  },
  save: async (obj) => {
    const session = await authApi.getSession();
    const { error } = await sb.from("settings").upsert({
      user_id: session.user.id,
      data: obj,
      updated_at: new Date().toISOString(),
    });
    return { error };
  },
};

// ---------- STORAGE (bucket: branding, private) ----------
const storageApi = {
  upload: async (kind, blob) => {
    const session = await authApi.getSession();
    const path = `${session.user.id}/${kind}.png`;
    const { error } = await sb.storage.from("branding").upload(path, blob, {
      upsert: true, contentType: "image/png",
    });
    return { error };
  },
  url: async (kind) => {
    const session = await authApi.getSession();
    const path = `${session.user.id}/${kind}.png`;
    const { data, error } = await sb.storage.from("branding").createSignedUrl(path, 3600);
    return { url: data ? data.signedUrl : null, error };
  },
  remove: async (kind) => {
    const session = await authApi.getSession();
    return sb.storage.from("branding").remove([`${session.user.id}/${kind}.png`]);
  },
    // Drawing upload / signed link (path: {user_id}/drawings/xxxx.jpg)
  uploadDrawing: async (blob) => {
    const session = await authApi.getSession();
    const path = `${session.user.id}/drawings/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await sb.storage.from("branding").upload(path, blob, { contentType: "image/jpeg" });
    return { path, error };
  },
  urlOf: async (path) => {
    const { data } = await sb.storage.from("branding").createSignedUrl(path, 3600);
    return data ? data.signedUrl : null;
  },
};

// ---------- PARTIES (table: parties) ----------
const partiesApi = {
  list: () => sb.from("parties").select("*").order("name"),
  add: (row) => sb.from("parties").insert(row),
  update: (id, row) => sb.from("parties").update(row).eq("id", id),
  remove: (id) => sb.from("parties").delete().eq("id", id),
};

// ---------- ITEMS (table: items) ----------
const itemsApi = {
  list: () => sb.from("items").select("*").order("name"),
  add: (row) => sb.from("items").insert(row),
  update: (id, row) => sb.from("items").update(row).eq("id", id),
  remove: (id) => sb.from("items").delete().eq("id", id),
};

// ---------- DOCUMENTS (table: documents) ----------
const documentsApi = {
  list: () => sb.from("documents")
    .select("id,doc_type,doc_no,party_name,party_mobile,doc_date,status,total,balance,created_at")
    .order("created_at", { ascending: false }),
  get: (id) => sb.from("documents").select("*").eq("id", id).single(),
  nextNo: (type) => sb.rpc("next_doc_no", { p_type: type }),
  add: (row) => sb.from("documents").insert(row),
  update: (id, row) => sb.from("documents")
    .update({ ...row, updated_at: new Date().toISOString() }).eq("id", id),
  remove: (id) => sb.from("documents").delete().eq("id", id),
};

// ---------- BRANDS (table: brands) ----------
const brandsApi = {
  list: () => sb.from("brands").select("*").order("name"),
  add: (row) => sb.from("brands").insert(row),
  update: (id, row) => sb.from("brands").update(row).eq("id", id),
  remove: (id) => sb.from("brands").delete().eq("id", id),
};

// ---------- MACHINES (table: machines) ----------
const machinesApi = {
  list: () => sb.from("machines").select("*, brands(name)").order("name"),
  add: (row) => sb.from("machines").insert(row),
  update: (id, row) => sb.from("machines").update(row).eq("id", id),
  remove: (id) => sb.from("machines").delete().eq("id", id),
};

// ---------- ROLLERS (table: rollers) ----------
const rollersApi = {
  listByMachine: (machineId) => sb.from("rollers").select("*").eq("machine_id", machineId).order("roller_no"),
  add: (row) => sb.from("rollers").insert(row),
  update: (id, row) => sb.from("rollers").update(row).eq("id", id),
};

// ---------- ROLLER CATEGORIES (table: roller_categories) ----------
const categoriesApi = {
  list: () => sb.from("roller_categories").select("*").order("name"),
  add: (row) => sb.from("roller_categories").insert(row),
  update: (id, row) => sb.from("roller_categories").update(row).eq("id", id),
  remove: (id) => sb.from("roller_categories").delete().eq("id", id),
};