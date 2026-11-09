const searchForm = document.getElementById("ticker-search-form");
const tickerInput = document.getElementById("ticker-input");
const resContainer = document.getElementById("res-container")

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
      result = data;

      resContainer.innerHTML(result)
    })
    .catch((error) => {
      console.error(error);
    });

    
}
