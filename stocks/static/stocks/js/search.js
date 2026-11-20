const searchForm = document.getElementById("ticker-search-form");
const tickerInput = document.getElementById("ticker-input");
const resContainer = document.getElementById("res_container");
const tickerSuggestions = document.getElementById("ticker-suggestions");
let tickerSymbols = [];
let stockChart = null;

if (tickerInput && tickerSuggestions) {
  fetch(tickerSuggestionsUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Could not load ticker suggestions: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data.tickers)) {
        throw new Error("Ticker suggestions response is invalid");
      }
      tickerSymbols = data.tickers;
      updateTickerSuggestions();
    })
    .catch((error) => {
      console.error(error);
    });

  tickerInput.addEventListener("input", updateTickerSuggestions);
}

searchForm.addEventListener("submit", function (event) {
  event.preventDefault();
  searchTicker();
});

function updateTickerSuggestions() {
  const query = tickerInput.value.trim().toUpperCase();
  tickerSuggestions.replaceChildren();

  if (!query) return;

  const matches = tickerSymbols
    .filter(
      (stock) =>
        stock.symbol.startsWith(query) ||
        stock.name.toUpperCase().includes(query)
    )
    .slice(0, 10);

  matches.forEach((stock) => {
    const option = document.createElement("option");
    option.value = stock.symbol;
    option.label = `${stock.symbol} - ${stock.name} - ${stock.sector} - ${stock.country}`;
    tickerSuggestions.appendChild(option);
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function displayValue(value) {
  return value === null || value === undefined || value === "" ? "N/V" : value;
}

function formatNumber(value, maximumFractionDigits = 2) {
  if (value === null || value === undefined || value === "") return "N/V";
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString(undefined, { maximumFractionDigits })
    : String(value);
}

function formatCurrency(value, currency) {
  if (value === null || value === undefined || value === "") return "N/V";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);

  const currencyCode = /^[A-Z]{3}$/.test(currency || "") ? currency : "USD";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2
  }).format(number);
}

function formatDate(value, includeTime = false) {
  if (!value) return "N/V";
  const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00`
    : value;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return String(value);

  return includeTime
    ? date.toLocaleString()
    : date.toLocaleDateString();
}

function safeExternalUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function metricCard(label, value, detail = "", variant = "") {
  return `
    <article class="stock-card ${variant}">
      <span class="stat-label">${escapeHtml(label)}</span>
      <h3>${escapeHtml(displayValue(value))}</h3>
      ${detail ? `<p>${escapeHtml(detail)}</p>` : ""}
    </article>
  `;
}

function renderCompanyDetails(company, ticker) {
  const websiteUrl = safeExternalUrl(company.website);
  const description = String(displayValue(company.description));
  const shortDescription = description.length > 220
    ? `${description.slice(0, 217).trimEnd()}…`
    : description;
  const details = [
    ["Ticker", company.symbol || ticker],
    ["Sector", company.sector],
    ["Industry", company.industry],
    ["Currency", company.currency],
    ["Employees", formatNumber(company.employees, 0)],
    [
      "Website",
      websiteUrl
        ? `<a href="${escapeHtml(websiteUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(company.website)}</a>`
        : displayValue(company.website)
    ]
  ];

  return `
    <section class="company-information" aria-label="Company information">
      <span class="stock-label">COMPANY PROFILE</span>
      <h3>${escapeHtml(displayValue(company.name))}</h3>
      <dl class="company-profile">
        ${details.map(([label, value]) => `
          <div>
            <dt>${escapeHtml(label)}</dt>
            <dd>${label === "Website" ? value : escapeHtml(displayValue(value))}</dd>
          </div>
        `).join("")}
      </dl>
      <p class="company-description">${escapeHtml(shortDescription)}</p>
      ${description.length > 220 ? `
        <details class="company-description-details">
          <summary>Read full company description</summary>
          <p>${escapeHtml(description)}</p>
        </details>
      ` : ""}
    </section>
  `;
}

function renderQuoteCards(quote, currency) {
  const changeClass = Number(quote.change) < 0 ? "red" : "green";
  const quoteMetrics = [
    ["Current price", formatCurrency(quote.price, currency)],
    ["Previous close", formatCurrency(quote.previous_close, currency)],
    ["Daily change", formatCurrency(quote.change, currency), "", changeClass],
    ["Daily change %", quote.change_percent == null ? "N/V" : `${formatNumber(quote.change_percent, 4)}%`, "", changeClass],
    ["Market state", quote.market_state],
    ["Market cap", formatNumber(quote.market_cap, 0)],
    ["Trading volume", formatNumber(quote.volume, 0)],
    ["Average volume", formatNumber(quote.average_volume, 0)],
    ["52-week high", formatCurrency(quote.fifty_two_week_high, currency)],
    ["52-week low", formatCurrency(quote.fifty_two_week_low, currency)]
  ];

  return quoteMetrics
    .map(([label, value, detail, variant]) => metricCard(label, value, detail, variant))
    .join("");
}

function renderHistoryTable(history, historical, currency) {
  const rows = history.map((record, index) => {
    const dailyChange = Number(historical.daily_absolute_changes[index]);
    const changeClass = dailyChange > 0
      ? "price-up"
      : dailyChange < 0
        ? "price-down"
        : "";

    return `
    <tr>
      <td>${escapeHtml(formatDate(record.date))}</td>
      <td>${escapeHtml(formatCurrency(record.open, currency))}</td>
      <td>${escapeHtml(formatCurrency(record.high, currency))}</td>
      <td>${escapeHtml(formatCurrency(record.low, currency))}</td>
      <td>${escapeHtml(formatCurrency(record.close, currency))}</td>
      <td>${escapeHtml(formatCurrency(record.adjusted_close, currency))}</td>
      <td>${escapeHtml(formatNumber(record.volume, 0))}</td>
      <td class="${changeClass}">${escapeHtml(formatCurrency(historical.daily_absolute_changes[index], currency))}</td>
      <td class="${changeClass}">${escapeHtml(formatNumber(historical.daily_percentage_changes[index], 4))}%</td>
      <td>${escapeHtml(formatNumber(record.dividends))}</td>
      <td>${escapeHtml(formatNumber(record.stock_splits))}</td>
    </tr>
    `;
  }).join("");

  return `
    <details class="history-details">
      <summary>Show all ${history.length} trading days</summary>
      <div class="history-table-container">
        <table class="history-table">
          <thead>
            <tr>
              <th>Date</th><th>Open</th><th>High</th><th>Low</th><th>Close</th>
              <th>Adjusted close</th><th>Volume</th><th>Daily change</th><th>Daily change %</th>
              <th>Dividends</th><th>Stock splits</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </details>
  `;
}

function renderNewsTimeline(news) {
  if (!news.length) {
    return '<p class="empty-state">No recent news found for this ticker.</p>';
  }

  const sortedNews = [...news].sort(
    (first, second) =>
      new Date(second.published_at || 0) - new Date(first.published_at || 0)
  );

  return `
    <ol class="news-timeline">
      ${sortedNews.map((article) => {
        const articleUrl = safeExternalUrl(article.url);
        const thumbnailUrl = safeExternalUrl(article.thumbnail);
        const title = escapeHtml(displayValue(article.title));
        const titleMarkup = articleUrl
          ? `<a href="${escapeHtml(articleUrl)}" target="_blank" rel="noopener noreferrer">${title}</a>`
          : title;
        const tickers = Array.isArray(article.tickers) ? article.tickers : [];

        return `
          <li class="news-timeline-item">
            <div class="news-timeline-marker" aria-hidden="true"></div>
            <article class="news-card">
              <div class="news-meta">
                <time>${escapeHtml(formatDate(article.published_at, true))}</time>
                <span>${escapeHtml(displayValue(article.provider))}</span>
              </div>
              <h4>${titleMarkup}</h4>
              ${article.summary ? `<p>${escapeHtml(article.summary)}</p>` : ""}
              ${thumbnailUrl ? `<img class="news-thumbnail" src="${escapeHtml(thumbnailUrl)}" alt="" loading="lazy">` : ""}
              ${tickers.length ? `<p class="news-tickers">Related tickers: ${escapeHtml(tickers.join(", "))}</p>` : ""}
            </article>
          </li>
        `;
      }).join("")}
    </ol>
  `;
}

function searchTicker() {
  if (!tickerInput) return;
  const ticker = tickerInput.value.trim().toUpperCase();

  fetch(`${searchStockUrl}?ticker=${encodeURIComponent(ticker)}`)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Stock search failed (${response.status})`);
      }
      return response.json();
    })
    .then((data) => {
      if (!data.historical_analysis || !data.last_trading_day) {
        throw new Error(data.message || "Stock analysis data is incomplete.");
      }

      const company = data.company || {};
      const quote = data.quote || {};
      const history = Array.isArray(data.history) ? data.history : [];
      const news = Array.isArray(data.news) ? data.news : [];
      const historical = data.historical_analysis;
      const lastDay = data.last_trading_day;
      const currency = company.currency || "USD";
      const changeClass = Number(quote.change) < 0
        ? "stock-price-down"
        : "stock-price-up";
      const changeSign = Number(quote.change) > 0 ? "+" : "";
      const changeText = quote.change == null
        ? ""
        : `${changeSign}${formatCurrency(quote.change, currency)} (${changeSign}${formatNumber(quote.change_percent, 4)}%)`;
      const historicalMetrics = [
        ["Average close price", formatCurrency(historical.average_close_price, currency)],
        ["Highest close price", formatCurrency(historical.highest_close_price, currency), formatDate(historical.highest_close_date)],
        ["Lowest close price", formatCurrency(historical.lowest_close_price, currency), formatDate(historical.lowest_close_date)],
        ["Highest intraday price", formatCurrency(historical.highest_price, currency)],
        ["Lowest intraday price", formatCurrency(historical.lowest_price, currency)],
        ["Average daily range", formatCurrency(historical.average_daily_range, currency)],
        ["Average volume", formatNumber(historical.average_volume, 0)],
        ["Highest volume", formatNumber(historical.highest_volume, 0)],
        ["Lowest volume", formatNumber(historical.lowest_volume, 0)]
      ];
      const lastDayMetrics = [
        ["Trading date", formatDate(lastDay.trading_date)],
        ["Opening price", formatCurrency(lastDay.open_price, currency)],
        ["Closing price", formatCurrency(lastDay.close_price, currency)],
        ["Average daily price", formatCurrency(lastDay.average_daily_price, currency)],
        ["Trading volume", formatNumber(lastDay.volume, 0)],
        [
          "Vs. historical average",
          formatCurrency(Math.abs(Number(lastDay.price_difference)), currency),
          lastDay.below_historical_average ? "Below average" : "At or above average",
          lastDay.below_historical_average ? "red" : "green"
        ]
      ];

      if (stockChart) {
        stockChart.destroy();
      }

      resContainer.innerHTML = `
        <section class="stock-analysis">
          <header class="stock-header">
            <div>
              <span class="stock-label">STOCK ANALYSIS · ${escapeHtml(ticker)}</span>
              <h2>
                ${escapeHtml(displayValue(company.name))}
                <span class="stock-price-change ${changeClass}">${escapeHtml(formatCurrency(quote.price, currency))}</span>
              </h2>
              <p>${changeText ? escapeHtml(changeText) : "Market quote details below"}</p>
            </div>
          </header>

          <div class="stock-chart-container">
            <canvas id="myChart" role="img" aria-label="Historical closing prices"></canvas>
          </div>

          <div class="overview-row">
            <section class="stock-data-section company-section">
              ${renderCompanyDetails(company, ticker)}
            </section>
            <section class="stock-data-section market-section">
              <h3>Market overview</h3>
              <div class="stock-statistics quote-statistics">
                ${renderQuoteCards(quote, currency)}
              </div>
            </section>
          </div>

          <div class="analysis-row">
            <section class="analysis-column">
              <h3>Historical analysis</h3>
              <div class="stock-statistics">
                ${historicalMetrics.map(([label, value, detail]) => metricCard(label, value, detail)).join("")}
              </div>
            </section>
            <section class="analysis-column">
              <h3>Last trading day</h3>
              <div class="stock-statistics">
                ${lastDayMetrics.map(([label, value, detail, variant]) => metricCard(label, value, detail, variant)).join("")}
              </div>
            </section>
          </div>

          <section class="stock-data-section">
            <h3>Historical data</h3>
            ${renderHistoryTable(history, historical, currency)}
          </section>

          <section class="stock-data-section news-section">
            <h3>News timeline <span class="news-count">${news.length}</span></h3>
            ${renderNewsTimeline(news)}
          </section>
        </section>
      `;

      const chartContext = document.getElementById("myChart").getContext("2d");
      stockChart = new Chart(chartContext, {
        type: "line",
        data: {
          labels: history.map((record) => record.date),
          datasets: [
            {
              label: "Closing price",
              data: history.map((record) => record.close),
              lineTension: 0,
              borderColor: "#16a34a",
              backgroundColor: "rgba(22, 163, 74, 0.10)",
              pointRadius: 2,
              fill: true
            },
            {
              label: "Historical average",
              data: history.map(() => historical.average_close_price),
              lineTension: 0,
              borderColor: "#f59e0b",
              borderDash: [6, 4],
              pointRadius: 0,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          legend: {
            display: true,
            labels: { fontColor: "#b8b2c7" }
          },
          tooltips: {
            mode: "index",
            intersect: false,
            callbacks: {
              label: (tooltipItem, chartData) =>
                `${chartData.datasets[tooltipItem.datasetIndex].label}: ${formatCurrency(tooltipItem.yLabel, currency)}`
            }
          },
          scales: {
            xAxes: [{
              ticks: { maxTicksLimit: 12, maxRotation: 0 }
            }],
            yAxes: [{
              ticks: {
                callback: (value) => formatCurrency(value, currency)
              }
            }]
          }
        }
      });
    })
    .catch((error) => {
      console.error(error);
      resContainer.innerHTML = `
        <div class="stock-error" role="alert">
          <h2>Could not load stock data</h2>
          <p>${escapeHtml(error.message)}</p>
        </div>
      `;
    });
}
