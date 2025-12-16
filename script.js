const $ = (id) => document.getElementById(id);
const fmtTRY = (n) => `${Number(n).toFixed(4)} ₺`;
const fmtTRY2 = (n) => `${Number(n).toFixed(2)} ₺`;
const fmtUSD2 = (n) => `${Number(n).toFixed(2)} $`;
const pct = (x) => `${Math.abs(x).toFixed(2)}%`;

const market = $("market");
const lastUpdate = $("lastUpdate");

const gramEl = $("gram");
const onsEl = $("ons");
const ceyrekEl = $("ceyrek");
const cumhuriyetEl = $("cumhuriyet");

const gramCh = $("gramChange");
const onsCh = $("onsChange");
const ceyrekCh = $("ceyrekChange");
const cumhuriyetCh = $("cumhuriyetChange");

const infoModal = $("infoModal");
const abbrList = $("abbrList");

const converter = $("converter");
const cur1 = $("cur1");
const cur2 = $("cur2");
const a1 = $("amount1");
const a2 = $("amount2");

const currencyAPI = "https://api.exchangerate-api.com/v4/latest/TRY";
const goldAPI = "https://data-asg.goldprice.org/dbXRates/USD";

const WATCH = [
  "USD","EUR","GBP","CHF","JPY","CAD","AUD","SEK","NOK","RUB","SAR","AED"
];

const SYMBOL = {
  TRY: "₺",
  USD: "$ / ₺",
  EUR: "€ / ₺",
  GBP: "£ / ₺",
  CHF: "Fr / ₺",
  JPY: "¥ / ₺",
  CAD: "C$ / ₺",
  AUD: "A$ / ₺",
  SEK: "kr / ₺",
  NOK: "kr / ₺",
  RUB: "₽ / ₺",
  SAR: "﷼ / ₺",
  AED: "د.إ / ₺",
  BTC: "₿ / ₺"
};

const ABBR = {
  TRY:"Türk Lirası",
  USD:"Amerikan Doları",
  EUR:"Euro",
  GBP:"İngiliz Sterlini",
  CHF:"İsviçre Frangı",
  JPY:"Japon Yeni",
  CAD:"Kanada Doları",
  AUD:"Avustralya Doları",
  SEK:"İsveç Kronu",
  NOK:"Norveç Kronu",
  RUB:"Rus Rublesi",
  SAR:"Suudi Riyali",
  AED:"BAE Dirhemi",
  BTC:"Bitcoin"
};

let toTRY = { TRY: 1 };        
let prevToTRY = { TRY: 1 };

let spot = {
  gramTRY: null,
  onsUSD: null,
  btcTRY: 2151762.4094
};
let prevSpot = { ...spot };

const GOLD_COEF = {
  CEYREK_GRAM_EQUIV: 1.75,
  CUMHURIYET_GRAM_EQUIV: 7.0
};

let goldChart, usdChart, eurChart;

function hourLabels24() {
  const now = new Date();
  const start = new Date(now.getTime() - 23*60*60*1000);
  const labels = [];
  for (let i=0;i<24;i++){
    const d = new Date(start.getTime() + i*60*60*1000);
    labels.push(String(d.getHours()).padStart(2,"0"));
  }
  return labels;
}


function seriesFromNow(nowValue){
  const vals = new Array(24);
  vals[23] = Number(nowValue);
  for (let i=22;i>=0;i--){
    const drift = (Math.random()-0.5) * vals[i+1] * 0.002; // %0.2 aralık
    vals[i] = Math.max(0, vals[i+1] - drift);
  }
  return vals.map(v => Number(v.toFixed(4)));
}

function initCharts() {
  const labels = hourLabels24();

  const baseGold = spot.gramTRY ?? 2000;
  const baseUSD  = toTRY.USD ?? 33;
  const baseEUR  = toTRY.EUR ?? 36;

  const goldData = seriesFromNow(baseGold);
  const usdData  = seriesFromNow(baseUSD);
  const eurData  = seriesFromNow(baseEUR);

  const common = {
    type: "line",
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: { x: { grid: { display: false } }, y: { grid: { color: "rgba(255,255,255,.06)" } } }
    }
  };

  goldChart = new Chart($("goldChart"), {
    ...common,
    data: { labels, datasets: [{ label:"Gram Altın", data: goldData, tension:.35, fill:true }] }
  });

  usdChart = new Chart($("usdChart"), {
    ...common,
    data: { labels, datasets: [{ label:"USD / TRY", data: usdData, tension:.35, fill:true }] }
  });

  eurChart = new Chart($("eurChart"), {
    ...common,
    data: { labels, datasets: [{ label:"EUR / TRY", data: eurData, tension:.35, fill:true }] }
  });
}

function updateCharts() {
  if (!goldChart) { initCharts(); return; }
  const labels = hourLabels24();
  goldChart.data.labels = labels;
  usdChart.data.labels  = labels;
  eurChart.data.labels  = labels;

  goldChart.data.datasets[0].data = seriesFromNow(spot.gramTRY ?? 2000);
  usdChart.data.datasets[0].data  = seriesFromNow(toTRY.USD ?? 33);
  eurChart.data.datasets[0].data  = seriesFromNow(toTRY.EUR ?? 36);

  goldChart.update();
  usdChart.update();
  eurChart.update();
}

function renderMarket(){
  market.innerHTML = "";

  const all = [...WATCH, "BTC"];

  for (const code of all) {
    if (code === "TRY") continue;

    const value = (code === "BTC") ? spot.btcTRY : toTRY[code];
    const prevV = (code === "BTC") ? prevSpot.btcTRY : prevToTRY[code];

    if (!value || !prevV) continue;

    const diff = ((value - prevV) / prevV) * 100;
    const up = diff >= 0;

    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <span class="symbol">${code} ${SYMBOL[code] || ""}</span>
      <span class="price">${fmtTRY(value)}</span>
      <span class="change ${up ? "up" : "down"}">${up ? "▲" : "▼"} ${pct(diff)}</span>
    `;
    market.appendChild(row);
  }

  lastUpdate.textContent = "Son güncelleme: " + new Date().toLocaleTimeString();
}

function setDelta(el, diffPct){
  const up = diffPct >= 0;
  el.className = "delta " + (up ? "up" : "down");
  el.textContent = `${up ? "▲" : "▼"} ${pct(diffPct)}`;
}

function renderGoldCards(){
  if (spot.gramTRY != null) gramEl.textContent = fmtTRY2(spot.gramTRY);
  if (spot.onsUSD != null) onsEl.textContent  = fmtUSD2(spot.onsUSD);

  const gramDiff = ((spot.gramTRY - (prevSpot.gramTRY ?? spot.gramTRY)) / (prevSpot.gramTRY ?? spot.gramTRY)) * 100;
  const onsDiff  = ((spot.onsUSD  - (prevSpot.onsUSD  ?? spot.onsUSD )) / (prevSpot.onsUSD  ?? spot.onsUSD )) * 100;

  if (Number.isFinite(gramDiff)) setDelta(gramCh, gramDiff);
  if (Number.isFinite(onsDiff))  setDelta(onsCh, onsDiff);

  const ceyrek = (spot.gramTRY ?? 0) * GOLD_COEF.CEYREK_GRAM_EQUIV;
  const cumh   = (spot.gramTRY ?? 0) * GOLD_COEF.CUMHURIYET_GRAM_EQUIV;

  ceyrekEl.textContent = fmtTRY2(ceyrek);
  cumhuriyetEl.textContent = fmtTRY2(cumh);

  const prevCeyrek = (prevSpot.gramTRY ?? spot.gramTRY) * GOLD_COEF.CEYREK_GRAM_EQUIV;
  const prevCumh   = (prevSpot.gramTRY ?? spot.gramTRY) * GOLD_COEF.CUMHURIYET_GRAM_EQUIV;

  const ceyDiff = ((ceyrek - prevCeyrek)/prevCeyrek)*100;
  const cumDiff = ((cumh   - prevCumh)/prevCumh)*100;

  if (Number.isFinite(ceyDiff)) setDelta(ceyrekCh, ceyDiff);
  if (Number.isFinite(cumDiff)) setDelta(cumhuriyetCh, cumDiff);
}

async function fetchBase(){
  const c = await fetch(currencyAPI).then(r=>r.json());
  const ratesFromTRY = c.rates || {};

  const nextToTRY = { TRY: 1 };
  for (const code of WATCH) {
    const r = ratesFromTRY[code];
    if (r) nextToTRY[code] = 1 / r;
  }

  const g = await fetch(goldAPI).then(r=>r.json());
  const onsUSD = Number(g?.items?.[0]?.xauPrice);
  const usdTRY = nextToTRY.USD ?? toTRY.USD ?? 33;

  const gramTRY = (onsUSD * usdTRY) / 31.1035;

  prevToTRY = { ...toTRY };
  toTRY = nextToTRY;

  prevSpot = { ...spot };
  spot.onsUSD = onsUSD;
  spot.gramTRY = gramTRY;

  buildConverterOptions();

  buildAbbrList();
}

function microTick(){
  prevToTRY = { ...toTRY };
  prevSpot = { ...spot };

  for (const code of WATCH) {
    if (!toTRY[code]) continue;
    const v = toTRY[code];
    const delta = (Math.random()-0.5) * v * 0.0004; // ~%0.04
    toTRY[code] = v + delta;
  }

  {
    const v = spot.btcTRY;
    spot.btcTRY = v + (Math.random()-0.5) * v * 0.001;
  }

  if (spot.gramTRY != null) spot.gramTRY = spot.gramTRY + (Math.random()-0.5) * spot.gramTRY * 0.0006;
  if (spot.onsUSD  != null) spot.onsUSD  = spot.onsUSD  + (Math.random()-0.5) * spot.onsUSD  * 0.0003;

  renderGoldCards();
  renderMarket();
}

function buildConverterOptions(){
  const codes = ["TRY", ...WATCH, "BTC"];
  cur1.innerHTML = "";
  cur2.innerHTML = "";
  for (const c of codes) {
    const opt1 = document.createElement("option");
    opt1.value = c; opt1.textContent = c;
    const opt2 = document.createElement("option");
    opt2.value = c; opt2.textContent = c;
    cur1.appendChild(opt1);
    cur2.appendChild(opt2);
  }

  cur1.value = "USD";
  cur2.value = "TRY";
  a1.value = 100;
  a2.value = "";
}

function rateToTRY(code){
  if (code === "TRY") return 1;
  if (code === "BTC") return spot.btcTRY;
  return toTRY[code];
}

function convert(){
  const from = cur1.value;
  const to   = cur2.value;
  const amount = Number(a1.value || 0);

  const rFrom = rateToTRY(from);
  const rTo   = rateToTRY(to);

  if (!rFrom || !rTo) { a2.value = ""; return; }

  const result = (amount * rFrom) / rTo;
  a2.value = result.toFixed(4);
}

function swap(){
  const tmp = cur1.value;
  cur1.value = cur2.value;
  cur2.value = tmp;

  const tmpA = a1.value;
  a1.value = a2.value;
  a2.value = tmpA;
}

function buildAbbrList(){
  abbrList.innerHTML = "";
  const codes = ["TRY", ...WATCH, "BTC"];
  for (const c of codes) {
    const li = document.createElement("li");
    li.textContent = `${c} → ${ABBR[c] || "—"}`;
    abbrList.appendChild(li);
  }
}

function openInfo(){ infoModal.style.display = "block"; }
function closeInfo(){ infoModal.style.display = "none"; }

function openConverter(){ converter.style.display = "block"; }
function closeConverter(){ converter.style.display = "none"; }

(async function boot(){
  try{
    await fetchBase();

    renderGoldCards();
    renderMarket();
    initCharts();

    setInterval(microTick, 2000);

    setInterval(async ()=>{
      try{
        await fetchBase();
        renderGoldCards();
        renderMarket();
        updateCharts();
      }catch{}
    }, 60000);

  }catch(e){
    lastUpdate.textContent = "Veriler alınamadı (API).";
  }
})();
