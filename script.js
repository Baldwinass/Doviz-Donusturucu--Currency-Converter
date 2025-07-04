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
    title: "💱 Döviz Dönüştürücü",
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
    title: "💱 Currency Converter",
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

//Karanlık mod
darkToggle.addEventListener('change', () => {
  document.body.classList.toggle('dark', darkToggle.checked);
});

//Tema seçici
themeSelect.addEventListener('change', (e) => {
  document.body.classList.remove('default', 'fun', 'retro');
  document.body.classList.add(e.target.value);
});

//Dil değiştirici
languageSelect.addEventListener('change', (e) => {
  changeLanguage(e.target.value);
});

function changeLanguage(lang) {
  currentLang = lang;
  const t = translations[lang];
  document.querySelector("h2").textContent = t.title;
  document.getElementById("amount").placeholder = t.amountPlaceholder;
  document.querySelector(".convert-btn").textContent = t.convert;
  document.querySelector("label[for='datePicker']").textContent = t.dateLabel;
  document.querySelector(".date-btn").textContent = t.dateButton;
  document.querySelector(".chart-title").textContent = t.chartTitle;
  document.querySelectorAll(".toggle-label")[0].textContent = t.darkModeLight;
  document.querySelectorAll(".toggle-label")[1].textContent = t.darkModeDark;
}

//Para birimlerini yükle
async function loadCurrencies() {
  const res = await fetch('https://api.frankfurter.app/currencies');
  const data = await res.json();
  for (let code in data) {
    const option1 = document.createElement('option');
    const option2 = document.createElement('option');
    option1.value = option2.value = code;
    option1.text = option2.text = `${code} - ${data[code]}`;
    fromSelect.appendChild(option1);
    toSelect.appendChild(option2);
  }
  fromSelect.value = 'USD';
  toSelect.value = 'TRY';
}

//Dönüştürme işlemi
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

//Grafik yükle
async function loadChart(from, to) {
  const end = new Date().toISOString().split('T')[0];
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
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
}

//Belirli tarih için kur bilgisi
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

//Sayfa yüklendiğinde başlat
window.onload = () => {
  loadCurrencies();
  changeLanguage(currentLang);
  languageSelect.value = currentLang;
  themeSelect.value = 'default';
  document.body.classList.add('default');
};
