# Freshora frontend

A responsive React storefront inspired by the supplied grocery reference. Includes product search and sorting, category filters, product details, saved products, a persistent cart, login and registration, cash-on-delivery checkout, order history, and mobile navigation.

## Run locally

```sh
cd client
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). In another terminal, start the existing API:

```sh
cd server
npm install
npm start
```

The backend requires its existing MongoDB, JWT, and Cloudinary environment configuration. No secrets belong in the frontend. Vite proxies `/api` to port 4000. For production, set `VITE_API_URL` to your backend origin and allow your frontend origin in the backend CORS configuration, or configure a same-origin `/api` reverse proxy.

## Store behavior

- A successful catalog response uses the real API, including an intentional empty catalog.
- If the API cannot be reached, a clearly labeled sample catalog and demo checkout remain available. Demo orders are stored on the current device and never represent a real payment or delivery. Demo mode does not fake account authentication.
- The cart and saved items persist on this device. Signed-in carts sync with the existing API.
- Live checkout requires sign-in, saves the address, then creates a cash-on-delivery order. Item prices plus 18% tax match the existing backend. Card payments are not implemented.
- All prices and order totals display in Sri Lankan rupees (LKR). Product amounts are treated as LKR; no exchange-rate conversion is applied.
- Editorial product photographs use Unsplash. The generated hero is included locally. Customer stories are labeled illustrative; replace these with verified customer feedback before launch.
- Customer support details and returns terms still need to be supplied by the store owner.

## Validation

```sh
npm run build
npm test
npx playwright test
```

Browser tests cover demo shopping and order history, mobile layout, search empty states, dialog dismissal, account errors, and the existing live API request contracts using mocked responses. They do not place actual orders or prove remote MongoDB availability.

Browser checks default to the installed Microsoft Edge browser. Alternatively, install Chromium with `npx playwright install chromium` and set `PLAYWRIGHT_CHANNEL=chromium` when running the tests.

The small backend adjustments fix an undefined response variable in address retrieval, retain the street address, and return the created address for checkout.

## Accounts and seller workspace

Choose Buyer or Seller when creating an account. Accounts and hashed passwords are saved in MongoDB. Login restores the saved role: buyers use the storefront and sellers are redirected to `/seller`. Existing accounts without a role are buyers. Roles are checked against the database on every protected request; request-body role values cannot change login permissions.

Seller registration grants access to this store's shared catalog and all orders. There is no separate admin role or per-seller ownership. The original `SELLER_EMAIL` / `SELLER_PASSWORD` login remains available for the configured store owner.

The dashboard supports adding products with Cloudinary images (up to five JPG/PNG/WebP files, 5 MB each), editing prices in LKR and product details, toggling stock, deleting products, and updating order statuses. Images are retained when editing. Use a same-site frontend/API deployment for cookies; local Vite proxying already supports this.
