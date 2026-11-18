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

function searchTicker() {
  if (!tickerInput) return;
  const viewsUrl = searchStockUrl;
  const ticker = tickerInput.value;

  fetch(`${viewsUrl}?ticker=${encodeURIComponent(ticker)}`)
    .then(async (response) => {
      if (!response.ok) {
        console.log("Status:", response.status);
        const errorText = await response.text();
        console.log("Response:", errorText);

        throw new Error("Request failed");
      }
      return response.json();
    })
    .then((data) => {
      const historical = data.historical_analysis;
      const lastDay = data.last_trading_day;
      const extraInfo = data.extra_info;

      const xValues = historical.trading_dates.slice().reverse();
      const yValues = historical.closing_price.slice().reverse();
      const priceIsBelowAverage = lastDay.below_historical_average;
      const priceChangeClass = priceIsBelowAverage
        ? "stock-price-change stock-price-down"
        : "stock-price-change stock-price-up";
      const priceChangeSign = priceIsBelowAverage ? "-" : "+";
      const priceChangeValue = Math.abs(Number(lastDay.price_difrance)).toFixed(2);

      if (stockChart) {
        stockChart.destroy();
      }

      resContainer.innerHTML = `
        <section class="stock-analysis">

          <div class="stock-header">
              <div>
                  <span class="stock-label">STOCK ANALYSIS</span>
                  <h2>${extraInfo.name} <span class="${priceChangeClass}">${priceChangeSign}$${priceChangeValue}</span></h2>
                  <p>Historical stock performance last 300 days</p>
              </div>

              <div class="company-information" aria-label="Company information">
                <span class="stock-label">COMPANY PROFILE</span>
                <table class="company-details" aria-label="Company details">
                  <tbody>
                    <tr>
                      <th scope="row">Ticker</th>
                      <th scope="row">Country</th>
                      <th scope="row">Sector</th>
                      <th scope="row">Industry</th>
                      <th scope="row">IPO year</th>
                    </tr>
                    <tr>
                      <td>${ticker}</td>
                      <td>${extraInfo.country || "N/V"}</td>
                      <td>${extraInfo.sector || "N/V"}</td>
                      <td>${extraInfo.industry || "N/V"}</td>
                      <td>${extraInfo.ipoyear || "N/V"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
          </div>

          <div class="stock-chart-container">
            <canvas
              id="myChart"
              role="img"
              aria-label="Historical stock closing prices"
            ></canvas>
          </div>

          <div class="analysis-row">

            <div class="analysis-column">
          
              <h3 id="row-header">Historical Analysis</h3>

              <div class="stock-statistics">

                <div class="stock-card">
                    <span class="stat-label"><span class="material-symbols-outlined" aria-hidden="true">show_chart</span><span class="stat-label-text">Average Close Price</span></span>
                    <h3>$${Number(historical.average_close_price).toFixed(2)}</h3>
                    <p>Average historical closing price</p>
                </div>

                <div class="stock-card">
                    <span class="stat-label"><span class="material-symbols-outlined" aria-hidden="true">bar_chart</span><span class="stat-label-text">Average Volume</span></span>
                    <h3>${Number(historical.average_volume).toLocaleString()}</h3>
                    <p>Average historical trading volume</p>
                </div>

                <div class="stock-card green">
                    <span class="stat-label"><span class="material-symbols-outlined" aria-hidden="true">trending_up</span><span class="stat-label-text">Highest Close Price</span></span>
                    <h3>$${Number(historical.highest_close_price).toFixed(2)}</h3>
                    <p>${historical.highest_close_date}</p>
                </div>

                <div class="stock-card red">
                    <span class="stat-label"><span class="material-symbols-outlined" aria-hidden="true">trending_down</span><span class="stat-label-text">Lowest Close Price</span></span>
                    <h3>$${Number(historical.lowest_close_price).toFixed(2)}</h3>
                    <p>${historical.lowest_close_date}</p>
                </div>


                <div class="stock-card green">
                    <span class="stat-label"><span class="material-symbols-outlined" aria-hidden="true">trending_up</span><span class="stat-label-text">Highest Volume</span></span>
                    <h3>${Number(historical.highest_volume).toLocaleString()}</h3>
                    <p>Highest recorded trading volume</p>
                </div>

                <div class="stock-card red">
                    <span class="stat-label"><span class="material-symbols-outlined" aria-hidden="true">equalizer</span><span class="stat-label-text">Lowest Volume</span></span>
                    <h3>${Number(historical.lowest_volume).toLocaleString()}</h3>
                    <p>Lowest recorded trading volume</p>
                </div>

              </div>

            </div>

            <div class="analysis-column">

              <h3 id="row-header">Last Trading Day</h3>

              <div class="stock-statistics">

                <div class="stock-card">
                    <span class="stat-label"><span class="material-symbols-outlined" aria-hidden="true">calendar_month</span><span class="stat-label-text">Trading Date</span></span>
                    <h3>${lastDay.trading_date}</h3>
                    <p>Day number 300</p>
                </div>

                <div class="stock-card">
                    <span class="stat-label"><span class="material-symbols-outlined" aria-hidden="true">monitoring</span><span class="stat-label-text">Average Daily Price</span></span>
                    <h3>$${Number(lastDay.average_daily_price).toFixed(2)}</h3>
                    <p>Historical average $${Number(historical.average_close_price).toFixed(2)}</p>
                </div>

                <div class="stock-card">
                    <span class="stat-label"><span class="material-symbols-outlined" aria-hidden="true">candlestick_chart</span><span class="stat-label-text">Opening Price</span></span>
                    <h3>$${Number(lastDay.open_price).toFixed(2)}</h3>
                    <p>Opening time: 09:00</p>
                </div>

                <div class="stock-card">
                    <span class="stat-label"><span class="material-symbols-outlined" aria-hidden="true">price_check</span><span class="stat-label-text">Closing Price</span></span>
                    <h3>$${Number(lastDay.close_price).toFixed(2)}</h3>
                    <p>Closing time: 16:00</p>
                </div>

                <div class="stock-card">
                    <span class="stat-label"><span class="material-symbols-outlined" aria-hidden="true">bar_chart</span><span class="stat-label-text">Trading Volume</span></span>
                    <h3>${Number(lastDay.volume).toLocaleString()}</h3>
                    <p>Average volume ${historical.average_volume}</p> 
                </div>

                <div class="stock-card ${lastDay.below_historical_average ? 'red' : 'green'}">
                    <span class="stat-label">
                      <span class="material-symbols-outlined" aria-hidden="true">${lastDay.below_historical_average ? "trending_down" : "trending_up"}</span>
                      <span class="stat-label-text">Current vs Historical Average</span>
                    </span>
                    <h3>$${Math.abs(Number(lastDay.price_difrance)).toFixed(2)}</h3>
                    <p>${lastDay.below_historical_average ? "Below average" : "At or above average"}</p>
                </div>

              </div>
            </div>
          </div>
        </section>
      `;
      
      //Chart
      const chartContext = document.getElementById("myChart").getContext("2d");
      stockChart = new Chart(chartContext, {
        type: "line",
        data: {
          labels: xValues,
          datasets: [
            {
              label: "Closing price",
              data: yValues,
              lineTension: 0,
              borderColor: lastDay.below_historical_average ? "#dc2626" : "#16a34a",
              backgroundColor: lastDay.below_historical_average
                ? "rgba(220, 38, 38, 0.10)"
                : "rgba(22, 163, 74, 0.10)",
              pointRadius: 2,
              fill: true
            },
            {
              label: "Historical average",
              data: xValues.map(() => historical.average_close_price),
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
            labels: {
              fontColor: "#b8b2c7"
            }
          },
          tooltips: {
            mode: "index",
            intersect: false,
            callbacks: {
              label: (tooltipItem, chartData) =>
                `${chartData.datasets[tooltipItem.datasetIndex].label}: $${Number(tooltipItem.yLabel).toFixed(2)}`
            }
          },
          scales: {
            xAxes: [{
              ticks: {
                maxTicksLimit: 12,
                maxRotation: 0
              }
            }],
            yAxes: [{
              ticks: {
                callback: (value) => `$${Number(value).toFixed(2)}`
              }
            }]
          }
        }
      });

      console.log(data);
    })
    .catch((error) => {
      console.error(error);
    });
}
  