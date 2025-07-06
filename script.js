const fromSelect = document.getElementById('from');
const toSelect = document.getElementById('to');
const darkToggle = document.getElementById('darkModeToggle');
const languageSelect = document.getElementById('languageSelect');
const themeSelect = document.getElementById('themeSelect');
const ctx = document.getElementById('rateChart').getContext('2d');
let chart;
let currentLang = 'tr';

const translations = {
  tr: {
    amountPlaceholder: "Miktar",
    convert: "Dönüştür",
    darkModeLight: "🌞 Aydınlık",
    darkModeDark: "🌙 Karanlık",
    dateLabel: "📅 Tarih:",
    dateButton: "Tarihli Kur",
    resultError: "Lütfen pozitif bir miktar girin.",
    sameCurrency: "Aynı para birimine dönüştürülemez.",
    chartTitle: "📈 Son 7 Günlük Kur Değişimi",
    dateResultError: "Tarihli veri alınamadı."
  },
  en: {
    amountPlaceholder: "Amount",
    convert: "Convert",
    darkModeLight: "🌞 Light",
    darkModeDark: "🌙 Dark",
    dateLabel: "📅 Date:",
    dateButton: "Get Rate",
    resultError: "Please enter a positive amount.",
    sameCurrency: "Cannot convert to the same currency.",
    chartTitle: "📈 Last 7 Days Exchange Rate",
    dateResultError: "Could not retrieve dated rate."
  }
};

// Sayfa yüklendiğinde:
window.onload = () => {
  const savedLang = localStorage.getItem("preferredLang") || "tr";
  const theme = localStorage.getItem("theme") || "default";
  const isDark = localStorage.getItem("dark") === "true";

  document.body.classList.add(theme);
  themeSelect.value = theme;

  document.body.classList.toggle("dark", isDark);
  darkToggle.checked = isDark;

  changeLanguage(savedLang);
  languageSelect.value = savedLang;
  currentLang = savedLang;

  loadCurrencies();
  document.getElementById("datePicker").valueAsDate = new Date();
  renderFavorites();
};

// Tema seçimi
themeSelect.addEventListener("change", (e) => {
  const theme = e.target.value;
  document.body.classList.remove("default", "fun", "retro");
  document.body.classList.add(theme);
  localStorage.setItem("theme", theme);
});

// Dil seçimi
languageSelect.addEventListener("change", (e) => {
  const lang = e.target.value;
  localStorage.setItem("preferredLang", lang);
  changeLanguage(lang);
});

function changeLanguage(lang) {
  currentLang = lang;
  const t = translations[lang];
  document.getElementById("amount").placeholder = t.amountPlaceholder;
  document.querySelector(".convert-btn").textContent = t.convert;
  document.querySelector("label[for='datePicker']").textContent = t.dateLabel;
  document.querySelector(".date-btn").textContent = t.dateButton;
  document.querySelector(".chart-section h3").textContent = t.chartTitle;
  document.querySelectorAll(".toggle-label")[0].textContent = t.darkModeLight;
  document.querySelectorAll(".toggle-label")[1].textContent = t.darkModeDark;
}

// Karanlık mod
darkToggle.addEventListener("change", () => {
  const isDark = darkToggle.checked;
  document.body.classList.toggle("dark", isDark);
  localStorage.setItem("dark", isDark);
});

// Para birimlerini yükle
async function loadCurrencies() {
  try {
    const res = await fetch("https://api.frankfurter.app/currencies");
    const data = await res.json();
    for (let code in data) {
      const option1 = new Option(`${code} - ${data[code]}`, code);
      const option2 = new Option(`${code} - ${data[code]}`, code);
      fromSelect.appendChild(option1);
      toSelect.appendChild(option2);
    }
    fromSelect.value = "USD";
    toSelect.value = "TRY";
  } catch (err) {
    console.error("Dövizler yüklenemedi:", err);
  }
}

// Dönüştürme işlemi
async function convertCurrency() {
  const t = translations[currentLang];
  const amount = parseFloat(document.getElementById("amount").value);
  const from = fromSelect.value;
  const to = toSelect.value;

  if (isNaN(amount) || amount <= 0) {
    document.getElementById("result").textContent = t.resultError;
    return;
  }

  if (from === to) {
    document.getElementById("result").textContent = t.sameCurrency;
    return;
  }

  try {
    const res = await fetch(`https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`);
    const data = await res.json();
    const rate = data.rates[to];
    document.getElementById("result").textContent = `${amount} ${from} = ${rate.toFixed(2)} ${to} 💸 (📅 ${data.date})`;
    loadChart(from, to);
  } catch {
    document.getElementById("result").textContent = "Dönüştürme başarısız.";
  }
}

// Grafik verisi yükle
async function loadChart(from, to) {
  const end = new Date().toISOString().split("T")[0];
  const start = new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0];

  try {
    const res = await fetch(`https://api.frankfurter.app/${start}..${end}?from=${from}&to=${to}`);
    const data = await res.json();
    const dates = Object.keys(data.rates);
    const values = dates.map(d => data.rates[d][to]);

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: dates,
        datasets: [{
          label: `1 ${from} → ${to}`,
          data: values,
          borderColor: "#0d6efd",
          backgroundColor: "rgba(13,110,253,0.1)",
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } }
      }
    });
  } catch (err) {
    console.error("Grafik yükleme hatası:", err);
  }
}

// Tarihli kur isteği
async function getRateByDate() {
  const t = translations[currentLang];
  const date = document.getElementById("datePicker").value;
  const from = fromSelect.value;
  const to = toSelect.value;

  if (!date) return;

  try {
    const res = await fetch(`https://api.frankfurter.app/${date}?from=${from}&to=${to}`);
    const data = await res.json();
    const rate = data.rates[to];
    document.getElementById("dateResult").textContent = `📅 ${date}: 1 ${from} = ${rate} ${to}`;
  } catch {
    document.getElementById("dateResult").textContent = t.dateResultError;
  }
}

// ⭐ Favori döviz çiftlerini yönet (Tıklayınca siler)
function saveFavorite() {
  const from = fromSelect.value;
  const to = toSelect.value;
  const pair = `${from}_${to}`;
  let favs = JSON.parse(localStorage.getItem("favorites") || "[]");

  if (!favs.includes(pair)) {
    favs.push(pair);
    localStorage.setItem("favorites", JSON.stringify(favs));
    renderFavorites();
  }
}

function renderFavorites() {
  const container = document.getElementById("favoritesList");
  container.innerHTML = "";
  const favs = JSON.parse(localStorage.getItem("favorites") || "[]");

  favs.forEach(pair => {
    const [from, to] = pair.split("_");
    const el = document.createElement("span");
    el.className = "fav-item";
    el.textContent = `${from} → ${to}`;

    // Tıklanırsa sil
    el.onclick = () => {
      const updated = favs.filter(f => f !== pair);
      localStorage.setItem("favorites", JSON.stringify(updated));
      renderFavorites();
    };

    container.appendChild(el);
  });
}

// 🔘 Ripple Efekti
document.querySelectorAll(".ripple").forEach(btn => {
  btn.addEventListener("click", function (e) {
    const ripple = document.createElement("span");
    ripple.className = "ripple-effect";
    const rect = this.getBoundingClientRect();
    ripple.style.left = `${e.clientX - rect.left - 50}px`;
    ripple.style.top = `${e.clientY - rect.top - 50}px`;
    ripple.style.width = ripple.style.height = "100px";
    this.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
});
