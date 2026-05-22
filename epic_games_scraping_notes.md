# Epic Games Store API & Scraping Documentation

This document contains a compilation of reverse-engineered APIs, scraping
methodologies, and code snippets gathered during our research. Use this as a
reference for future improvements to the free games scanner and automation
tools.

---

## 1. Epic Games Store Free Games API

This is the public API used by the Epic Games Store storefront to query active
and upcoming free promotions.

### Endpoint Details

- **URL:**
  `https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions`
- **Query Parameters:**
  - `locale`: E.g., `en-US`
  - `country`: Country code, e.g., `CA` or `US`
  - `allowCountries`: Country list, e.g., `CA` or `US`
- **Full Test URL:**
  ```
  https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=CA&allowCountries=CA
  ```

### Parsing Logic

To find whether an item in `data.Catalog.searchStore.elements` is currently free
or upcoming:

1. **Active Promotions (Free Now):** Look inside `promotions.promotionalOffers`.
   Find an offer where `discountType === 'PERCENTAGE'` and
   `discountPercentage === 0`.
2. **Upcoming Promotions (Coming Soon):** Look inside
   `promotions.upcomingPromotionalOffers`. Find an offer with
   `discountPercentage === 0`.
3. **URL Slug Construction:** Assemble the store URL using the first available
   attribute: `https://store.epicgames.com/en-US/p/` +
   `catalogNs.mappings[0].pageSlug` (or `productSlug` / `urlSlug` as fallbacks).

---

## 2. Browser Console Quick-Test Script

To run a quick scan directly from your web browser, open the developer tools
(`F12`) on any **`epicgames.com`** domain page (to bypass CORS restriction) and
paste the following script:

```javascript
fetch(
  "https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=CA&allowCountries=CA",
)
  .then((res) => res.json())
  .then((data) => {
    const elements = data.data.Catalog.searchStore.elements;
    console.log(
      "%c=== EPIC GAMES FREE GAMES ===",
      "font-size: 16px; font-weight: bold; color: #0078f2;",
    );

    elements.forEach((game) => {
      const activePromos =
        game.promotions?.promotionalOffers?.[0]?.promotionalOffers || [];
      const upcomingPromos =
        game.promotions?.upcomingPromotionalOffers?.[0]?.promotionalOffers ||
        [];

      let status = "NORMAL";
      let startDate = "";
      let endDate = "";

      if (
        activePromos.length > 0 &&
        activePromos[0].discountSetting?.discountPercentage === 0
      ) {
        status = "FREE NOW";
        startDate = activePromos[0].startDate;
        endDate = activePromos[0].endDate;
      } else if (
        upcomingPromos.length > 0 &&
        upcomingPromos[0].discountSetting?.discountPercentage === 0
      ) {
        status = "COMING SOON";
        startDate = upcomingPromos[0].startDate;
        endDate = upcomingPromos[0].endDate;
      } else {
        return; // Skip non-free elements
      }

      const statusColor = status === "FREE NOW"
        ? "color: #2ece52; font-weight: bold;"
        : "color: #ff9800; font-weight: bold;";
      console.log(
        `%c[${status}] %c${game.title}`,
        statusColor,
        "font-weight: bold; color: #ffffff;",
      );

      if (startDate && endDate) {
        const start = new Date(startDate).toLocaleDateString();
        const end = new Date(endDate).toLocaleDateString();
        console.log(`   📅 Period: ${start} - ${end}`);
      }

      const pageSlug = game.catalogNs?.mappings?.[0]?.pageSlug ||
        game.productSlug || game.urlSlug;
      const cleanSlug = pageSlug ? pageSlug.replace(/\/home$/, "") : "";
      console.log(
        `   🔗 Link: https://store.epicgames.com/en-US/p/${cleanSlug}`,
      );
      console.log("--------------------------------------------------");
    });
  })
  .catch((err) => console.error("Error fetching data:", err));
```

---

## 3. Account Library & Entitlement API (Reverse Engineered)

These are the internal endpoints used by the official Epic Games Launcher to
manage your private library.

### Authentication Flow (OAuth2)

1. **Get Authorization Code:** Open
   `https://www.epicgames.com/id/api/redirect?clientId=34a02cf8f4414e29b1598528ce346f45&responseType=code`
   to login and copy the auth code.
2. **Swap Code for Token:** Post to
   `https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token`
   using header
   `Authorization: Basic MzRhMDJjZjhmNDQxNGUyOWIxNTk4NTI4Y2UzNDZmNDU6Y2I0YTdkM2QyODc5NDQ2MThlMmNhZTkxN2U1Y2I2ZDg=`
   and request body `grant_type=authorization_code&code=YOUR_CODE`.
3. **Query Entitlements (Library list):** Perform a `GET` request to:
   ```
   https://entitlement-public-service-prod06.ol.epicgames.com/entitlement/api/shared/accounts/{accountId}/entitlements?start=0&count=5000
   ```
   Pass the `access_token` inside the header as `Authorization: Bearer <TOKEN>`.

---

## 4. Metadata & Rating Scraping Methodologies

To make free games data more useful, we can enrich it with ratings using the
following public integrations:

### A. Metacritic Score

- **Search Endpoint:**
  `https://www.metacritic.com/search/{gameTitle}/?category=13`
- **Matching Strategy:** Generate title slugs (e.g. converting `û` -> `u`,
  replacing spaces/special characters with hyphens). Apply Sørensen-Dice bigram
  similarity and Monge-Elkan fuzzy matching to match the search results.
- **Extraction:** Fetch `/game/{matched_slug}/` and extract the metascore via
  Regex: `data-testid="global-score-value">(\d+)<`

### B. SteamDB Rating Formula

- **Search Endpoint:**
  `https://store.steampowered.com/api/storesearch?term={gameTitle}&l=english&cc=US`
  to retrieve the Steam App ID.
- **Reviews Endpoint:**
  `https://store.steampowered.com/appreviews/{appId}?json=1&language=all&purchase_type=all&num_per_page=0`
- **Bayesian Rating Formula:**
  $$Rating = ReviewScore - (ReviewScore - 0.5) \times 2^{-\log_{10}(TotalReviews + 1)}$$
  _(Where $ReviewScore = \frac{TotalPositive}{TotalReviews}$)_
