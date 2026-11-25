const form = document.getElementById("ticker-search-form");
const input = document.getElementById("ticker-input");
const suggestions = document.getElementById("ticker-suggestions");
const results = document.getElementById("res_container");

let tickers = [];
let chart = null;
let selectedPeriod = "1mo";

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

function companyProfile(company, ticker, marketCap) {
  const website = externalUrl(company.website);
  const description = String(value(company.description));
  const details = [
    ["Ticker", company.symbol || ticker],
    ["Sector", company.sector],
    ["Industry", company.industry],
    ["Currency", company.currency],
    ["Market cap", number(marketCap, 0)],
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

  const averagePrice = Number(analysis.average_close_price);
  const chartPoints = [];
  history.forEach((record, index) => {
    const price = Number(record.close);
    chartPoints.push({ x: index, price, historyIndex: index });

    const nextPrice = history[index + 1] ? Number(history[index + 1].close) : null;
    if (
      nextPrice !== null
      && ((price < averagePrice && nextPrice > averagePrice)
        || (price > averagePrice && nextPrice < averagePrice))
    ) {
      const crossingPosition = index + (averagePrice - price) / (nextPrice - price);
      chartPoints.push({ x: crossingPosition, price: averagePrice, historyIndex: null });
    }
  });

  const chartDateForPosition = position => {
    const index = Math.max(0, Math.min(history.length - 1, Math.round(Number(position))));
    return history[index]?.date || "";
  };
  const chartAxisDate = position => {
    const numericPosition = Number(position);
    if (numericPosition < 0 || numericPosition > history.length - 1) return "";
    const date = chartDateForPosition(position);
    const [, month, day] = date.split("-");
    return month && day ? `${month}/${day}` : date;
  };
  const chartDateForTooltip = items => {
    if (!items.length) return "";
    const point = chartPoints[items[0].index];
    return point ? chartDateForPosition(point.x) : "";
  };

  chart = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      datasets: [
        {
          label: "Closing price above average",
          data: chartPoints.map(point => ({
            x: point.x,
            y: point.price >= averagePrice ? point.price : null
          })),
          borderColor: "#16a34a",
          backgroundColor: "rgba(22, 163, 74, 0.18)",
          pointRadius: 2,
          lineTension: 0,
          fill: 2
        },
        {
          label: "Closing price below average",
          data: chartPoints.map(point => ({
            x: point.x,
            y: point.price <= averagePrice ? point.price : null
          })),
          borderColor: "#dc2626",
          backgroundColor: "rgba(220, 38, 38, 0.18)",
          pointRadius: 2,
          lineTension: 0,
          fill: 2
        },
        {
          label: "Historical average",
          data: chartPoints.map(point => ({ x: point.x, y: averagePrice })),
          borderColor: "#f59e0b",
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false
        },
        {
          label: "Highest close price",
          data: chartPoints.map(point => ({
            x: point.x,
            y: point.historyIndex !== null
              && history[point.historyIndex].date === analysis.highest_close_date
              ? analysis.highest_close_price
              : null
          })),
          borderColor: "#90ffb8",
          backgroundColor: "#0f380a",
          pointRadius: 5,
          pointHoverRadius: 7,
          showLine: false,
          fill: false
        },
        {
          label: "Lowest close price",
          data: chartPoints.map(point => ({
            x: point.x,
            y: point.historyIndex !== null
              && history[point.historyIndex].date === analysis.lowest_close_date
              ? analysis.lowest_close_price
              : null
          })),
          borderColor: "#fea3a3",
          backgroundColor: "#2b0303",
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
          title: chartDateForTooltip,
          label: (item, chartData) =>
            `${chartData.datasets[item.datasetIndex].label}: ${currency(item.yLabel, code)}`
        }
      },
      scales: {
        xAxes: [{
          type: "linear",
          ticks: {
            min: -0.5,
            max: history.length - 0.5,
            autoSkip: true,
            maxTicksLimit: 12,
            maxRotation: 0,
            callback: chartAxisDate
          }
        }],
        yAxes: [{ ticks: { callback: item => currency(item, code) } }]
      }
    }
  });
}

async function searchTicker(period = selectedPeriod) {
  const ticker = input.value.trim().toUpperCase();
  if (!ticker) return;

  try {
    selectedPeriod = period;
    const response = await fetch(
      `${searchStockUrl}?ticker=${encodeURIComponent(ticker)}&period=${encodeURIComponent(period)}`
    );
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
    const hasMarketChange = quote.change !== null
      && quote.change !== undefined
      && Number.isFinite(change);
    const changeClass = change < 0 ? "stock-price-down" : "stock-price-up";
    const sign = change > 0 ? "+" : "";
    const changeText = quote.change == null
      ? ""
      : `${sign}${currency(quote.change, code)} (${sign}${number(quote.change_percent, 4)}%)`;
    const preMarketPrice = quote.pre_market_price;
    const hasPreMarketPrice = preMarketPrice !== null
      && preMarketPrice !== undefined
      && preMarketPrice !== ""
      && Number.isFinite(Number(preMarketPrice));
    const regularMarketPrice = Number(quote.price);
    const hasRegularMarketPrice = quote.price !== null
      && quote.price !== undefined
      && quote.price !== ""
      && Number.isFinite(regularMarketPrice)
      && regularMarketPrice !== 0;
    const preMarketChangePercent = hasPreMarketPrice && hasRegularMarketPrice
      ? (Number(preMarketPrice) - regularMarketPrice) / regularMarketPrice * 100
      : null;
    const preMarketClass = hasRegularMarketPrice && Number(preMarketPrice) >= regularMarketPrice
      ? "stock-price-up"
      : "stock-price-down";
    const preMarketPriceMarkup = hasPreMarketPrice
      ? `<span class="stock-price-change ${preMarketClass}">Pre-market: ${esc(currency(preMarketPrice, code))}${preMarketChangePercent === null
        ? ""
        : ` (${preMarketChangePercent > 0 ? "+" : ""}${number(preMarketChangePercent, 2)}%)`}</span>`
      : "";
    const marketState = String(quote.market_state ?? "").trim();
    const marketIsOpen = ["REGULAR", "OPEN"].includes(marketState.toUpperCase());
    const marketStatusClass = marketIsOpen ? "market-status-open" : "market-status-closed";
    const marketStatusText = marketState || "N/V";

    const quoteCards = [
      ["Current price", currency(quote.price, code), "", quote.price < quote.previous_close ? "red" : "green"],
      ["Previous close", currency(quote.previous_close, code), "", quote.previous_close < quote.price ? "red" : "green"],
      ["Daily change", currency(quote.change, code), "", change < 0 ? "red" : "green"],
      ["Daily change %", quote.change_percent == null ? "N/V" : `${number(quote.change_percent, 4)}%`, "", change < 0 ? "red" : "green"],
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
        <div class="header-left">
          <span class="stock-label">STOCK ANALYSIS · ${esc(ticker)}</span>
          <h2>${esc(value(company.name))}
            <span class="stock-price-change ${changeClass}">${esc(currency(quote.price, code))}</span>
            ${preMarketPriceMarkup}
          </h2>
          <p class="${hasMarketChange ? changeClass : ""}">${changeText ? esc(changeText) : "Market quote details below"}</p>
        </div>

        <div class="header-right">
          <span class="market-status ${marketStatusClass}">
            <span class="market-status-dot" aria-hidden="true"></span>${esc(marketStatusText)}
          </span>
        </div>
      </header>

      <div class="stock-chart-container"><canvas id="myChart" role="img" aria-label="Historical closing prices"></canvas></div>
      <div class="periode-buttons" aria-label="Historical period">
        ${[
          ["1d", "1 day"],
          ["5d", "5 days"],
          ["1mo", "1 month"],
          ["2mo", "2 months"],
          ["3mo", "3 months"],
          ["6mo", "6 months"],
          ["1y", "1 year"],
          ["2y", "2 years"],
          ["5y", "5 years"],
          ["10y", "10 years"],
          ["ytd", "Year to date"],
          ["max", "Max"]
        ].map(([value, label]) => `
          <button type="button"
            class="periode-button${period === value ? " active" : ""}"
            data-period="${value}"
            aria-pressed="${period === value}">
            ${esc(label)}
          </button>
        `).join("")}
      </div>

      <div class="company-market-row">
        ${companyProfile(company, ticker, quote.market_cap)}
        
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

    results.querySelectorAll(".periode-button").forEach(button => {
      button.addEventListener("click", () => {
        searchTicker(button.dataset.period);
      });
    });
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
  searchTicker(selectedPeriod);
});
