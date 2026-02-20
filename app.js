const KEY = "dlwms_hub_v1";

const state = JSON.parse(localStorage.getItem(KEY) || "null") || {
  quickTasks: [],
  bins: [],
  remises: [],
  palettes: [{ id: nextPaletteId(1), items: [] }],
  counters: { remise: 1, palette: 1 }
};

function persist() {
  localStorage.setItem(KEY, JSON.stringify(state));
  renderAll();
}

function nextPaletteId(n) {
  return `BE${String(n).padStart(7, "0")}`;
}

function nextRemiseId(n) {
  return `LAVREM${String(n).padStart(4, "0")}`;
}

function addDeleteButton(container, arr, index) {
  const btn = document.createElement("button");
  btn.className = "delete-btn";
  btn.textContent = "✕";
  btn.type = "button";
  btn.onclick = () => {
    arr.splice(index, 1);
    persist();
  };
  container.appendChild(btn);
}

function renderSimpleList(id, list, mapper) {
  const el = document.getElementById(id);
  el.innerHTML = "";
  list.forEach((entry, index) => {
    const li = document.createElement("li");
    const left = document.createElement("div");
    left.innerHTML = mapper(entry);
    li.appendChild(left);
    addDeleteButton(li, list, index);
    el.appendChild(li);
  });
}

function renderKpis() {
  const kpis = [
    { label: "Tâches actives", val: state.quickTasks.length },
    { label: "Bins P7", val: state.bins.filter((b) => b.priority === "P7").length },
    { label: "Scans remise", val: state.remises.length },
    {
      label: "Items palette active",
      val: state.palettes[state.palettes.length - 1]?.items.length || 0
    }
  ];

  const wrap = document.getElementById("kpis");
  wrap.innerHTML = "";
  kpis.forEach((kpi) => {
    const card = document.createElement("article");
    card.className = "kpi";
    card.innerHTML = `<div>${kpi.label}</div><div class="val">${kpi.val}</div>`;
    wrap.appendChild(card);
  });
}

function renderPalette() {
  const active = state.palettes[state.palettes.length - 1];
  document.getElementById("paletteLabel").textContent = `Palette active: ${active.id}`;

  renderSimpleList(
    "paletteList",
    active.items,
    (item) => `<strong>${item.code}</strong><div class="meta">${item.time}</div>`
  );
}

function renderAll() {
  renderSimpleList(
    "quickTaskList",
    state.quickTasks,
    (t) => `<strong>${t.title}</strong><div class="meta">${t.module}</div>`
  );

  renderSimpleList(
    "binList",
    state.bins,
    (b) => `<strong>${b.name}</strong><div class="meta">${b.priority}</div>`
  );

  renderSimpleList(
    "remiseList",
    state.remises,
    (r) => `<strong>${r.id}</strong> · ${r.item} (x${r.qty})<div class="meta">Zone ${r.zone}</div>`
  );

  renderPalette();
  renderKpis();
}

document.getElementById("quickTaskForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const title = document.getElementById("taskTitle").value.trim();
  const module = document.getElementById("taskModule").value;
  if (!title) return;
  state.quickTasks.unshift({ title, module });
  e.target.reset();
  persist();
});

document.getElementById("binForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("binName").value.trim();
  const priority = document.getElementById("binPriority").value;
  if (!name) return;
  state.bins.unshift({ name, priority });
  e.target.reset();
  persist();
});

document.getElementById("remiseForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const item = document.getElementById("remiseItem").value.trim();
  const qty = Number(document.getElementById("remiseQty").value || 1);
  const zone = document.getElementById("remiseZone").value.trim();
  if (!item || !zone) return;
  const id = nextRemiseId(state.counters.remise++);
  state.remises.unshift({ id, item, qty, zone });
  e.target.reset();
  persist();
});

document.getElementById("paletteForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const code = document.getElementById("paletteItem").value.trim();
  if (!code) return;
  const active = state.palettes[state.palettes.length - 1];
  active.items.unshift({ code, time: new Date().toLocaleString("fr-CA") });
  e.target.reset();
  persist();
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `dlwms_export_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById("importInput").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const txt = await file.text();
  const imported = JSON.parse(txt);
  Object.assign(state, imported);
  persist();
});

renderAll();
