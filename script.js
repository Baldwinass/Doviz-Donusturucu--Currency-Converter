const fromSelect = document.getElementById('from');
const toSelect = document.getElementById('to');
const darkToggle = document.getElementById('darkModeToggle');
const ctx = document.getElementById('rateChart').getContext('2d');
const languageSelect = document.getElementById('languageSelect');
const themeSelect = document.getElementById('themeSelect');
let chart;
let currentLang = 'tr';

const translations = {
  tr: {
    amountPlaceholder: "Miktar",
    convert: "Dönüştür",
    darkModeLight: "🌞 Aydınlık",
    darkModeDark: "🌙 Karanlık",
    dateLabel: "📅 Tarih Seç:",
    dateButton: "Tarihli Kur",
    resultError: "Lütfen geçerli bir miktar girin.",
    sameCurrency: "Aynı para birimine dönüştürülemez.",
    chartTitle: "📈 Son 7 Günlük Kur",
    dateResultError: "Tarih bilgisi alınamadı."
  },
  en: {
    amountPlaceholder: "Amount",
    convert: "Convert",
    darkModeLight: "🌞 Light",
    darkModeDark: "🌙 Dark",
    dateLabel: "📅 Select Date:",
    dateButton: "Get Rate",
    resultError: "Please enter a valid amount.",
    sameCurrency: "Cannot convert to the same currency.",
    chartTitle: "📈 Last 7 Days Exchange Rate",
    dateResultError: "Could not fetch date info."
  }
};

// Karanlık mod geçişi
darkToggle.addEventListener('change', () => {
  const isDark = darkToggle.checked;
  document.body.classList.toggle('dark', isDark);
  localStorage.setItem('dark', isDark);
});

// Tema seçimi
themeSelect.addEventListener('change', (e) => {
  const theme = e.target.value;
  document.body.classList.remove('default', 'fun', 'retro');
  document.body.classList.add(theme);
  localStorage.setItem('theme', theme);
});

// Dil değiştirici
languageSelect.addEventListener('change', (e) => {
  const lang = e.target.value;
  localStorage.setItem('preferredLang', lang);
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

// Para birimlerini yükle
async function loadCurrencies() {
  try {
    const res = await fetch('https://api.frankfurter.app/currencies');
    const data = await res.json();
    for (let code in data) {
      const opt1 = document.createElement('option');
      const opt2 = document.createElement('option');
      opt1.value = opt2.value = code;
      opt1.text = opt2.text = `${code} - ${data[code]}`;
      fromSelect.appendChild(opt1);
      toSelect.appendChild(opt2);
    }
    fromSelect.value = 'USD';
    toSelect.value = 'TRY';
  } catch (error) {
    console.error("Para birimleri yüklenemedi:", error);
  }
}

// Döviz çevirme
async function convertCurrency() {
  const amount = parseFloat(document.getElementById('amount').value);
  const from = fromSelect.value;
  const to = toSelect.value;
  const t = translations[currentLang];

  if (isNaN(amount) || amount <= 0) {
    document.getElementById('result').textContent = t.resultError;
    return;
  }

  if (from === to) {
    document.getElementById('result').textContent = t.sameCurrency;
    return;
  }

  try {
    const res = await fetch(`https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`);
    const data = await res.json();
    const rate = data.rates[to];
    document.getElementById('result').textContent = `${amount} ${from} = ${rate.toFixed(2)} ${to} 💸`;
    loadChart(from, to);
  } catch (error) {
    document.getElementById('result').textContent = 'Dönüştürme başarısız.';
  }
}

// Grafik çizimi
async function loadChart(from, to) {
  const end = new Date().toISOString().split('T')[0];
  const start = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  try {
    const res = await fetch(`https://api.frankfurter.app/${start}..${end}?from=${from}&to=${to}`);
    const data = await res.json();
    const labels = Object.keys(data.rates);
    const values = labels.map(date => data.rates[date][to]);

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: `1 ${from} → ${to}`,
          data: values,
          borderColor: '#007bff',
          backgroundColor: 'rgba(0,123,255,0.1)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true }
        }
      }
    });
  } catch (error) {
    console.error("Grafik verisi yüklenemedi:", error);
  }
}

// Tarihli kur
async function getRateByDate() {
  const date = document.getElementById('datePicker').value;
  const from = fromSelect.value;
  const to = toSelect.value;
  const t = translations[currentLang];
  if (!date) return;

  try {
    const res = await fetch(`https://api.frankfurter.app/${date}?from=${from}&to=${to}`);
    const data = await res.json();
    document.getElementById('dateResult').textContent = `📅 ${date}: 1 ${from} = ${data.rates[to]} ${to}`;
  } catch {
    document.getElementById('dateResult').textContent = t.dateResultError;
  }
}

// Sayfa ilk yüklendiğinde
window.onload = () => {
  const savedLang = localStorage.getItem('preferredLang');
  if (savedLang) currentLang = savedLang;

  const savedTheme = localStorage.getItem('theme') || 'default';
  themeSelect.value = savedTheme;
  document.body.classList.add(savedTheme);

  const isDark = localStorage.getItem('dark') === 'true';
  darkToggle.checked = isDark;
  document.body.classList.toggle('dark', isDark);

  loadCurrencies();
  changeLanguage(currentLang);
  languageSelect.value = currentLang;
  document.getElementById('datePicker').valueAsDate = new Date();
};
