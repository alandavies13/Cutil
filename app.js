let DATA = [];
const el = (id) => document.getElementById(id);

function norm(s){
  return (s ?? "")
    .toString()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function uniqueSorted(arr){
  return [...new Set(arr.filter(v => v !== null && v !== undefined && v !== ""))]
    .map(v => v.toString())
    .sort((a,b) => a.localeCompare(b, "pt-BR", {numeric:true, sensitivity:"base"}));
}

function buildIndex(r){
  const parts = [
    r.id, r.area, r.painel, r.disjuntor, r.cubic, r.funcao,
    r.tensao_v, r.vem_de, r.vai_para, r.grau, r.obs
  ];
  return norm(parts.filter(Boolean).join(" | "));
}

function matchesFilters(r){
  const fArea = el("f_area").value;
  const fFunc = el("f_funcao").value;
  const fTen = el("f_tensao").value;
  const fGrau = el("f_grau").value;
  
  if (fArea && (r.area ?? "") !== fArea) return false;
  if (fFunc && (r.funcao ?? "") !== fFunc) return false;
  if (fTen && String(r.tensao_v ?? "") !== fTen) return false;
  if (fGrau && String(r.grau ?? "") !== fGrau) return false;
  return true;
}

function toEmptyIfNull(x){
  if (x === null || x === undefined) return "";
  return x;
}

function normalizeRecord(raw){
  return {
    id: toEmptyIfNull(raw["ID"]),
    area: toEmptyIfNull(raw["Nome da Área"]),
    painel: toEmptyIfNull(raw["Painel"]),
    disjuntor: toEmptyIfNull(raw["Disjuntor"]),
    cubic: toEmptyIfNull(raw["Cubículo/ Gaveta"]),
    funcao: toEmptyIfNull(raw["Função"]),
    tensao_v: toEmptyIfNull(raw["Tensão (V)"]),
    vem_de: toEmptyIfNull(raw["Vem de"]),
    vai_para: toEmptyIfNull(raw["Vai para"]),
    grau: toEmptyIfNull(raw["Grau"]),
    obs: toEmptyIfNull(raw["Obs"] ?? raw["Observações"] ?? "")
  };
}

function findHitLabel(r, qRaw){
  const q = norm(qRaw);
  if (!q) return "";

  // Ordem de prioridade do "tipo de interesse" no título
  const fields = [
    { key: "vai_para", label: "Alimenta" },
    { key: "vem_de", label: "Vem de" },
    { key: "disjuntor", label: "Equipamento" },
    { key: "painel", label: "Painel" },
    { key: "cubic", label: "Cubículo/Gaveta" },
    { key: "funcao", label: "Função" },
    { key: "area", label: "Área" },
    { key: "tensao_v", label: "Tensão" },
    { key: "grau", label: "Grau" }
  ];

  for (const f of fields){
    const v = (r[f.key] ?? "").toString();
    if (norm(v).includes(q)){
      return `${f.label}: ${v || "—"}`;
    }
  }
  return "";
}

function buildCardTitle(r, qRaw){
  const q = norm(qRaw);
  
  // 1. Se houver busca e bater com algum campo, destaca a correspondência no título
  const hit = findHitLabel(r, qRaw);
  if (q && hit) return hit;

  // 2. Sem busca (ou termo genérico), destaca prioritariamente o que é Alimentado
  if (r.vai_para) {
    return `Alimenta: ${r.vai_para}`;
  }

  // 3. Fallback caso o campo "vai_para" esteja vazio
  return `${r.painel || "(Sem painel)"} — ${r.disjuntor || "(Sem equip.)"}`;
}

function render(list, qRaw){
  const root = el("list");
  root.innerHTML = "";
  el("count").textContent = `${list.length} resultado(s)`;

  for (const r of list){
    const card = document.createElement("div");
    card.className = "card";

    const topo = document.createElement("div");
    topo.className = "card_top";

    const left = document.createElement("div");
    left.innerHTML = `
      <div class="k1">${buildCardTitle(r, qRaw)}</div>
      <div class="k2">${r.area || ""}${r.cubic ? " • " + r.cubic : ""}${r.funcao ? " • " + r.funcao : ""}</div>
    `;

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = (r.tensao_v ? `${r.tensao_v} V` : "—");

    topo.appendChild(left);
    topo.appendChild(badge);

    const row = document.createElement("div");
    row.className = "row";

    const p1 = document.createElement("div");
    p1.className = "pill";
    p1.textContent = `Vem de: ${r.vem_de || "—"}`;

    const p2 = document.createElement("div");
    p2.className = "pill";
    p2.textContent = `Alimenta: ${r.vai_para || "—"}`;

    row.appendChild(p1);
    row.appendChild(p2);

    const btn = document.createElement("button");
    btn.className = "btn";
    btn.type = "button";
    btn.textContent = "Ver detalhes";
    btn.addEventListener("click", () => openDetails(r));

    card.appendChild(topo);
    card.appendChild(row);
    card.appendChild(btn);

    root.appendChild(card);
  }
}

function openDetails(r){
  el("dlg_title").textContent = `${r.painel || "(Sem painel)"} — ${r.disjuntor || "(Sem equip.)"}`;
  el("dlg_sub").textContent = `${r.area || ""}${r.cubic ? " • " + r.cubic : ""}${r.funcao ? " • " + r.funcao : ""}`;

  const kv = (k,v) => `
    <div class="kv">
      <span class="k">${k}</span>
      <span class="v">${(v ?? "").toString() || "—"}</span>
    </div>
  `;

  el("dlg_body").innerHTML = [
    kv("ID", r.id),
    kv("Área", r.area),
    kv("Painel", r.painel),
    kv("Equipamento/Disjuntor", r.disjuntor),
    kv("Cubículo/Gaveta", r.cubic),
    kv("Função", r.funcao),
    kv("Tensão (V)", r.tensao_v),
    kv("Vem de", r.vem_de),
    kv("Alimenta", r.vai_para),
    kv("Grau", r.grau),
    r.obs ? kv("Observações", r.obs) : ""
  ].join("");

  el("dlg").showModal();
}

function apply(){
  const qRaw = el("q").value;
  const q = norm(qRaw);
  const filtered = DATA
    .filter(matchesFilters)
    .filter(r => !q || r.__idx.includes(q));

  render(filtered, qRaw);
}

function fillSelect(selectId, values){
  const s = el(selectId);
  const keep = s.querySelector("option").textContent;
  s.innerHTML = `<option value="">${keep}</option>`;
  for (const v of values){
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    s.appendChild(opt);
  }
}

async function init(){
  const res = await fetch("./data.json", {cache:"no-store"});
  const raw = await res.json();
  DATA = raw.map(normalizeRecord);

  for (const r of DATA){
    r.__idx = buildIndex(r);
  }

  fillSelect("f_area", uniqueSorted(DATA.map(x => x.area)));
  fillSelect("f_funcao", uniqueSorted(DATA.map(x => x.funcao)));
  fillSelect("f_tensao", uniqueSorted(DATA.map(x => String(x.tensao_v ?? "")).filter(Boolean)));
  fillSelect("f_grau", uniqueSorted(DATA.map(x => String(x.grau ?? "")).filter(Boolean)));

  el("q").addEventListener("input", apply);
  el("clear").addEventListener("click", () => { el("q").value = ""; apply(); });

  for (const id of ["f_area","f_funcao","f_tensao","f_grau"]){
    el(id).addEventListener("change", apply);
  }

  el("dlg_close").addEventListener("click", () => el("dlg").close());

  apply();
}

init();
