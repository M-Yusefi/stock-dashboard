const searchForm = document.getElementById("ticker-search-form");
const tickerInput = document.getElementById("ticker-input");
const resContainer = document.getElementById("res_container");

searchForm.addEventListener("submit", function (event) {
  event.preventDefault();
  searchTicker();
});

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

      resContainer.innerHTML = `
        <section class="stock-analysis">

          <div class="stock-header">
              <div>
                  <span class="stock-label">STOCK ANALYSIS</span>
                  <h2>${ticker}</h2>
                  <p>Historical stock performance</p>
              </div>

              <span class="stock-status">Analysis completed</span>
          </div>

          <div class="analysis-row">

            <div class="analysis-column">
          
              <h3>Historical Analysis</h3>

              <div class="stock-statistics">

                <div class="stock-card">
                    <span class="stat-label">Average Close Price</span>
                    <h3>$${Number(historical.average_close_price).toFixed(2)}</h3>
                    <p>Average historical closing price</p>
                </div>

                <div class="stock-card green">
                    <span class="stat-label">Highest Close Price</span>
                    <h3>$${Number(historical.highest_close_price).toFixed(2)}</h3>
                    <p>${historical.highest_close_date}</p>
                </div>

                <div class="stock-card red">
                    <span class="stat-label">Lowest Close Price</span>
                    <h3>$${Number(historical.lowest_close_price).toFixed(2)}</h3>
                    <p>${historical.lowest_close_date}</p>
                </div>

                <div class="stock-card">
                    <span class="stat-label">Average Volume</span>
                    <h3>${Number(historical.average_volume).toLocaleString()}</h3>
                    <p>Average historical trading volume</p>
                </div>

                <div class="stock-card green">
                    <span class="stat-label">Highest Volume</span>
                    <h3>${Number(historical.highest_volume).toLocaleString()}</h3>
                    <p>Highest recorded trading volume</p>
                </div>

                <div class="stock-card red">
                    <span class="stat-label">Lowest Volume</span>
                    <h3>${Number(historical.lowest_volume).toLocaleString()}</h3>
                    <p>Lowest recorded trading volume</p>
                </div>

              </div>

            </div>

            <div class="analysis-column">

              <h3>Last Trading Day</h3>

              <div class="stock-statistics">

                <div class="stock-card">
                    <span class="stat-label">Trading Date</span>
                    <h3>${lastDay.trading_date}</h3>
                </div>

                <div class="stock-card">
                    <span class="stat-label">Opening Price</span>
                    <h3>$${Number(lastDay.open_price).toFixed(2)}</h3>
                </div>

                <div class="stock-card">
                    <span class="stat-label">Closing Price</span>
                    <h3>$${Number(lastDay.close_price).toFixed(2)}</h3>
                </div>

                <div class="stock-card">
                    <span class="stat-label">Average Daily Price</span>
                    <h3>$${Number(lastDay.average_daily_price).toFixed(2)}</h3>
                </div>

                <div class="stock-card">
                    <span class="stat-label">Trading Volume</span>
                    <h3>${Number(lastDay.volume).toLocaleString()}</h3>
                </div>

                <div class="stock-card ${lastDay.below_historical_average ? 'red' : 'green'}">
                    <span class="stat-label">Current vs Historical Average</span>
                    <h3>${lastDay.below_historical_average ? `- $${lastDay.price_difrance}` : `+ $${lastDay.price_difrance}`}</h3>
                    <h4>${lastDay.below_historical_average ? "Below average" : "At or above average"}</h4>
                </div>

              </div>
            </div>
          </div>
        </section>
      `;     
      console.log(data);
    })
    .catch((error) => {
      console.error(error);
    });
}
  