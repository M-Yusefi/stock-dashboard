const form = document.getElementById("ticker-search-form");
const input = document.getElementById("ticker-input");
const suggestions = document.getElementById("ticker-suggestions");
const results = document.getElementById("res_container");

let tickers = [];
let chart = null;

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, char =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])
);

const value = (item) => item === null || item === undefined || item === "" ? "N/V" : item;

function number(item, digits = 2) {
  if (item === null || item === undefined || item === "") return "N/V";
  const parsed = Number(item);
  return Number.isFinite(parsed) ? parsed.toLocaleString(undefined, { maximumFractionDigits: digits }) : String(item);
}

function currency(item, code = "USD") {
  if (item === null || item === undefined || item === "") return "N/V";
  const parsed = Number(item);
  if (!Number.isFinite(parsed)) return String(item);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: /^[A-Z]{3}$/.test(code) ? code : "USD",
    maximumFractionDigits: 2
  }).format(parsed);
}

function date(item, withTime = false) {
  if (!item) return "N/V";
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(item) ? `${item}T00:00:00` : item);
  return Number.isNaN(parsed.getTime()) ? String(item) : withTime ? parsed.toLocaleString() : parsed.toLocaleDateString();
}

function externalUrl(item) {
  try {
    const url = new URL(item);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function card(label, amount, detail = "", variant = "", detailPlacement = "below") {
  const inlineLabel = detailPlacement === "label";
  const inlineAmount = detailPlacement === "amount";
  const detailMarkup = detail
    ? detailPlacement === "below"
      ? `<p>${esc(detail)}</p>`
      : `<span class="${inlineLabel ? "stat-date" : "stat-inline-detail"}">${esc(detail)}</span>`
    : "";
  return `<article class="stock-card ${variant}${inlineLabel ? " has-label-detail" : ""}${inlineAmount ? " has-amount-detail" : ""}">
    <span class="stat-label">${esc(label)}${inlineLabel ? detailMarkup : ""}</span>
    <h3>${esc(value(amount))}${inlineAmount ? detailMarkup : ""}</h3>
    ${detailPlacement === "below" ? detailMarkup : ""}
  </article>`;
}

function cardGrid(items) {
  return items.map(item => card(...item)).join("");
}

async function loadTickers() {
  try {
    const response = await fetch(tickerSuggestionsUrl);
    if (!response.ok) throw new Error("Could not load ticker suggestions.");
    const data = await response.json();
    tickers = Array.isArray(data.tickers) ? data.tickers : [];
  } catch (error) {
    console.error(error);
  }
}

function updateSuggestions() {
  const query = input.value.trim().toUpperCase();
  suggestions.replaceChildren();
  if (!query) return;

  tickers
    .filter(stock =>
      stock.symbol.startsWith(query) ||
      String(stock.name).toUpperCase().includes(query)
    )
    .slice(0, 10)
    .forEach(stock => {
      const option = document.createElement("option");
      option.value = stock.symbol;
      option.label = `${stock.symbol} - ${stock.name} - ${stock.sector} - ${stock.country}`;
      suggestions.appendChild(option);
    });
}

function companyProfile(company, ticker) {
  const website = externalUrl(company.website);
  const description = String(value(company.description));
  const details = [
    ["Ticker", company.symbol || ticker],
    ["Sector", company.sector],
    ["Industry", company.industry],
    ["Currency", company.currency],
    ["Employees", number(company.employees, 0)],
    ["Website", website
      ? `<a href="${esc(website)}" target="_blank" rel="noopener noreferrer">${esc(company.website)}</a>`
      : value(company.website)]
  ];

  return `<section class="company-information" aria-label="Company information">
    <span class="stock-label">Company Profile</span>
    <div>
      <h3>${esc(value(company.name))}</h3>

      <dl class="company-profile">
        ${details.map(([label, amount]) => `<div>
          <dt>${esc(label)}</dt>
          <dd>${label === "Website" ? amount : esc(value(amount))}</dd>
        </div>`).join("")}
      </dl>

      <p class="company-description">${esc(description.length > 220 ? `${description.slice(0, 217).trimEnd()}...` : description)}</p>

      ${description.length > 220 ? `<details class="company-description-details">
        <summary>Read full company description</summary>
        <p>${esc(description)}</p>
      </details>` : ""}
    </div>
  </section>`;
}

function historyTable(history, analysis, code) {
  const rows = history.map((record, index) => ({ record, index }))
    .reverse()
    .map(({ record, index }) => {
    const change = Number(analysis.daily_absolute_changes[index]);
    const className = change > 0 ? "price-up" : change < 0 ? "price-down" : "";
    return `<tr>
      <td>${esc(date(record.date))}</td>
      <td>${esc(currency(record.open, code))}</td>
      <td>${esc(currency(record.high, code))}</td>
      <td>${esc(currency(record.low, code))}</td>
      <td>${esc(currency(record.close, code))}</td>
      <td>${esc(currency(record.adjusted_close, code))}</td>
      <td>${esc(number(record.volume, 0))}</td>
      <td class="${className}">${esc(currency(analysis.daily_absolute_changes[index], code))}</td>
      <td class="${className}">${esc(number(analysis.daily_percentage_changes[index], 4))}%</td>
      <td>${esc(number(record.dividends))}</td>
      <td>${esc(number(record.stock_splits))}</td>
    </tr>`;
  }).join("");

  return `<details class="history-details">
    <summary>Show all ${history.length} trading days</summary>
    <div class="history-table-container">
      <table class="history-table">
        <thead><tr>
          <th>Date</th><th>Open</th><th>High</th><th>Low</th><th>Close</th>
          <th>Adjusted close</th><th>Volume</th><th>Daily change</th>
          <th>Daily change %</th><th>Dividends</th><th>Stock splits</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </details>`;
}

function newsTimeline(news) {
  if (!news.length) return '<p class="empty-state">No recent news found for this ticker.</p>';

  return `<ol class="news-timeline">${[...news]
    .sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0))
    .map(article => {
      const articleUrl = externalUrl(article.url);
      const imageUrl = externalUrl(article.thumbnail);
      const title = esc(value(article.title));
      return `<li class="news-timeline-item">
        <article class="news-card">
          <div class="news-meta">
            <time>${esc(date(article.published_at, true))}</time>
            <span>${esc(value(article.provider))}</span>
          </div>
          ${imageUrl ? `<img class="news-thumbnail" src="${esc(imageUrl)}" alt="" loading="lazy">` : ""}
          <h4>${articleUrl ? `<a href="${esc(articleUrl)}" target="_blank" rel="noopener noreferrer">${title}</a>` : title}</h4>
          ${article.summary ? `<p>${esc(article.summary)}</p>` : ""}
          ${article.tickers?.length ? `<p class="news-tickers">Related tickers: ${esc(article.tickers.join(", "))}</p>` : ""}
        </article>
      </li>`;
    }).join("")}</ol>`;
}

function drawChart(history, analysis, code) {
  const canvas = document.getElementById("myChart");
  if (!canvas) return;
  if (chart) chart.destroy();

  chart = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels: history.map(record => record.date),
      datasets: [
        {
          label: "Closing price",
          data: history.map(record => record.close),
          borderColor: "#16a34a",
          backgroundColor: "rgba(22, 163, 74, 0.10)",
          pointRadius: 2,
          fill: true
        },
        {
          label: "Historical average",
          data: history.map(() => analysis.average_close_price),
          borderColor: "#f59e0b",
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false
        },
        {
          label: "Highest close price",
          data: history.map(record =>
            record.date === analysis.highest_close_date ? analysis.highest_close_price : null
          ),
          borderColor: "#57ce83",
          backgroundColor: "#053416",
          pointRadius: 5,
          pointHoverRadius: 7,
          showLine: false,
          fill: false
        },
        {
          label: "Lowest close price",
          data: history.map(record =>
            record.date === analysis.lowest_close_date ? analysis.lowest_close_price : null
          ),
          borderColor: "#e90e0e",
          backgroundColor: "#52110e",
          pointRadius: 5,
          pointHoverRadius: 7,
          showLine: false,
          fill: false
        }        
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      legend: { labels: { fontColor: "#b8b2c7" } },
      tooltips: {
        mode: "index",
        intersect: false,
        callbacks: {
          label: (item, chartData) =>
            `${chartData.datasets[item.datasetIndex].label}: ${currency(item.yLabel, code)}`
        }
      },
      scales: {
        xAxes: [{ ticks: { maxTicksLimit: 12, maxRotation: 0 } }],
        yAxes: [{ ticks: { callback: item => currency(item, code) } }]
      }
    }
  });
}

async function searchTicker() {
  const ticker = input.value.trim().toUpperCase();
  if (!ticker) return;

  try {
    const response = await fetch(`${searchStockUrl}?ticker=${encodeURIComponent(ticker)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || `Stock search failed (${response.status})`);
    if (!data.historical_analysis || !data.last_trading_day) {
      throw new Error(data.message || "Stock analysis data is incomplete.");
    }

    const company = data.company || {};
    const quote = data.quote || {};
    const history = Array.isArray(data.history) ? data.history : [];
    const news = Array.isArray(data.news) ? data.news : [];
    const analysis = data.historical_analysis;
    const lastDay = data.last_trading_day;
    const code = company.currency || "USD";
    const change = Number(quote.change);
    const changeClass = change < 0 ? "stock-price-down" : "stock-price-up";
    const sign = change > 0 ? "+" : "";
    const changeText = quote.change == null
      ? ""
      : `${sign}${currency(quote.change, code)} (${sign}${number(quote.change_percent, 4)}%)`;

    const quoteCards = [
      ["Current price", currency(quote.price, code)],
      ["Previous close", currency(quote.previous_close, code)],
      ["Daily change", currency(quote.change, code), "", change < 0 ? "red" : "green"],
      ["Daily change %", quote.change_percent == null ? "N/V" : `${number(quote.change_percent, 4)}%`, "", change < 0 ? "red" : "green"],
      ["Market state", quote.market_state],
      ["Market cap", number(quote.market_cap, 0)],
      ["Trading volume", number(quote.volume, 0)],
      ["Average volume", number(quote.average_volume, 0)],
      ["52-week high", currency(quote.fifty_two_week_high, code), "","green"],
      ["52-week low", currency(quote.fifty_two_week_low, code), "", "red"]
    ];

    const historyCards = [
      ["Highest close price", currency(analysis.highest_close_price, code), date(analysis.highest_close_date), "green", "label"],
      ["Lowest close price", currency(analysis.lowest_close_price, code), date(analysis.lowest_close_date), "red", "label"],
      ["Highest intraday price", currency(analysis.highest_price, code), "", "green"],
      ["Lowest intraday price", currency(analysis.lowest_price, code), "", "red"],
      ["Average close price", currency(analysis.average_close_price, code)],
      ["Average daily range", currency(analysis.average_daily_range, code)],
      ["Average volume", number(analysis.average_volume, 0)],
      ["Highest volume", number(analysis.highest_volume, 0)],
      ["Lowest volume", number(analysis.lowest_volume, 0)]
    ];

    const dayCards = [
      ["Trading date", date(lastDay.trading_date)],
      ["Opening price", currency(lastDay.open_price, code)],
      ["Closing price", currency(lastDay.close_price, code)],
      ["Average daily price", currency(lastDay.average_daily_price, code)],
      ["Trading volume", number(lastDay.volume, 0)],
      ["Vs. historical average", currency(Math.abs(Number(lastDay.price_difference)), code),
        lastDay.below_historical_average ? "Below" : "At or above",
        lastDay.below_historical_average ? "red" : "green", "amount"]
    ];

    results.innerHTML = `<section class="stock-analysis">
      <header class="stock-header">
        <span class="stock-label">STOCK ANALYSIS · ${esc(ticker)}</span>
        <h2>${esc(value(company.name))}
          <span class="stock-price-change ${changeClass}">${esc(currency(quote.price, code))}</span>
        </h2>
        <p>${changeText ? esc(changeText) : "Market quote details below"}</p>
      </header>

      <div class="stock-chart-container"><canvas id="myChart" role="img" aria-label="Historical closing prices"></canvas></div>

      <div class="company-market-row">
        ${companyProfile(company, ticker)}
        
        <section class="market-section">
          <h3>Market overview</h3>
          <div class="stock-statistics quote-statistics">${cardGrid(quoteCards)}</div>
        </section>
      </div>

      <div class="analysis-row">
        <section class="analysis-column">
          <h3>Historical analysis</h3>
          <div class="stock-statistics">
            ${cardGrid(historyCards)}
          </div>
        </section>

        <section class="analysis-column">
          <h3>Last trading day</h3>
          <div class="stock-statistics">
            ${cardGrid(dayCards)}
          </div>
        </section>
      </div>

      <section class="stock-data-section"><h3>Historical data</h3>${historyTable(history, analysis, code)}</section>
        <section class="stock-data-section news-section">
          <h3>News timeline <span class="news-count">${news.length}</span></h3>
          ${newsTimeline(news)}
        </section>
      </section>
    `;

    drawChart(history, analysis, code);
  } catch (error) {
    console.error(error);
    results.innerHTML = `<div class="stock-error" role="alert">
      <h2>Could not load stock data</h2>
      <p>${esc(error.message)}</p>
    </div>`;
  }
}

loadTickers();
input?.addEventListener("input", updateSuggestions);
form?.addEventListener("submit", event => {
  event.preventDefault();
  searchTicker();
});
