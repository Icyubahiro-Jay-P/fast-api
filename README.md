# CEDO

CEDO is a full-stack business dashboard for customers, products, orders, and revenue. It uses MongoDB, Express, React, and Node.js in an npm workspace.

## Stack

- Server: Node.js 22, Express 4, Mongoose 9, Zod 4
- Client: React 19, React Router 7, Vite 8
- Testing: Vitest, Supertest, and an isolated MongoDB test database
- Linting: ESLint 10

## Requirements

- Node.js 22 or newer
- npm 10 or newer
- MongoDB 7 or newer running locally or reachable over the network

## Quick start

```bash
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
npm run seed
npm run dev
```

Open:

- App: http://localhost:5173
- API: http://localhost:5000/api
- Health: http://localhost:5000/api/health

The Vite development server proxies `/api` requests to the API on port 5000.

## Production build

```bash
npm run build
NODE_ENV=production npm start
```

The Express server serves `client/dist` when it exists and falls back to `index.html` for client-side routes. If the build directory is absent, the server exposes only the API.

Set `VITE_API_URL` before building when the frontend is hosted separately from the API. When it is empty, the client uses a relative `/api/v1` base URL.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run the API and Vite client together |
| `npm run build` | Build the React client into `client/dist` |
| `npm start` | Start the Express API, serving the built client when available |
| `npm run seed` | Insert the demo dataset |
| `npm run seed -- --reset` | Replace the demo dataset |
| `npm test` | Run the server test suite |
| `npm run lint` | Lint the server and client |
| `npm run preview` | Preview the built client through Vite |

Workspace commands can be scoped with `npm --workspace server run <script>` or `npm --workspace client run <script>`.

## Features

- Dashboard with revenue, order counts, average order value, low-stock alerts, monthly revenue, status mix, recent orders, top products, and category breakdowns
- Customer, product, and order CRUD
- Search, status and category filters, date and amount filters, sorting, and pagination
- Server-side Zod validation with field-level client errors
- Order line snapshots that preserve product names, SKUs, and prices at order time
- Responsive tables that become labelled cards on narrow screens
- Accessible dialogs with focus trapping, Escape handling, and focus restoration
- Toast notifications, loading skeletons, empty states, and retryable error banners

## Project structure

```text
cedo-mern/
  client/
    src/
      api/          Fetch wrapper and resource methods
      components/   Forms, tables, dialogs, chart, layout
      context/      Toast context
      hooks/        Debounce helper
      pages/        Dashboard and resource pages
      utils/        Formatting, constants, error parsing
  server/
    src/
      config/       Environment configuration
      controllers/  HTTP request handlers
      middleware/   Validation, 404, and error handling
      models/       Mongoose schemas
      routes/       Express routers
      schemas/      Zod request schemas
      scripts/      Seed script
      services/     Business logic and aggregations
      utils/        Shared API helpers
    test/           Vitest and Supertest suites
```

## API

Base URL: `/api/v1`

Successful list responses use this envelope:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 10,
  "total": 0,
  "pages": 0
}
```

Errors use this shape:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed.",
    "details": []
  }
}
```

### Resource endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/customers` | List customers |
| POST | `/customers` | Create a customer |
| GET | `/customers/:id` | Get a customer |
| PATCH | `/customers/:id` | Update a customer |
| DELETE | `/customers/:id` | Delete a customer |
| GET | `/products` | List products |
| POST | `/products` | Create a product |
| GET | `/products/:id` | Get a product |
| PATCH | `/products/:id` | Update a product |
| DELETE | `/products/:id` | Delete a product |
| GET | `/orders` | List orders |
| POST | `/orders` | Create an order |
| GET | `/orders/:id` | Get an order |
| PATCH | `/orders/:id` | Update order status or items |
| DELETE | `/orders/:id` | Delete an order |

Common list parameters are `page`, `pageSize`, `sort`, and `search`.

Additional filters:

- Customers: `status`
- Products: `category`, `status`, `minPrice`, `maxPrice`
- Orders: `status`, `customerId`, `dateFrom`, `dateTo`, `minTotal`, `maxTotal`

Sort values use `field:asc` or `field:desc`. Invalid sort fields return a validation error.

### Dashboard endpoints

| Path | Description |
| --- | --- |
| `/dashboard/summary` | Totals, revenue, average order value, and low stock count |
| `/dashboard/orders-by-status` | Order counts and revenue by status |
| `/dashboard/products-by-category` | Product count, stock, and average price by category |
| `/dashboard/monthly-revenue?months=12` | Revenue and order counts for the last N months |
| `/dashboard/top-products?limit=5` | Top products by units sold |
| `/dashboard/recent-orders?limit=5` | Most recent orders |

## Data model

### Customer

- `name`: 2 to 120 characters
- `email`: valid, unique, stored lowercase
- `phone`: optional, up to 30 characters
- `status`: `active` or `inactive`

### Product

- `name`: 2 to 160 characters
- `sku`: unique, uppercase, letters, numbers, dashes, and underscores
- `category`: 2 to 60 characters
- `price`: at least `0.01`
- `stock`: non-negative integer
- `status`: `active`, `draft`, or `archived`

### Order

- `orderNumber`: generated as `ORD-YYYYMMDD-XXXXXXXX`
- `customerId` and `customerName`: customer reference and snapshot
- `items`: one to 50 unique products with quantity and price snapshots
- `totalAmount`: recalculated from line totals
- `status`: `pending`, `paid`, `shipped`, `completed`, or `cancelled`

Revenue includes orders with `paid`, `shipped`, or `completed` status. Low stock means an active product with stock at or below 5 units.

Customers with existing orders cannot be deleted. Products referenced by an order cannot be deleted.

## Environment variables

### Server

| Variable | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | `development` | Runtime mode |
| `PORT` | `5000` | API port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/cedo_mern` | MongoDB connection string |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed origin, or a comma-separated list |

### Client

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_URL` | empty | Absolute API base URL, including `/api/v1` |

## Testing

```bash
npm test
```

Tests run sequentially against `mongodb://127.0.0.1:27017/cedo_mern_test`. The suite refuses to use a database whose name does not end in `_test`. Start MongoDB before running tests.

The current suite covers resource CRUD, validation, filtering, deletion constraints, health checks, and dashboard aggregations.

## Demo data

`npm run seed` creates:

- 6 customers
- 10 products across 4 categories
- 60 orders spread across the last 360 days

Use `npm run seed -- --reset` to replace existing data. Seeding is deterministic.

## Notes and limitations

- Authentication and authorization are not included. Add them before exposing the app to untrusted users.
- Currency formatting uses USD.
- There is no file upload or image support for products.
- The legacy FastAPI project in `../cedo-api` is separate from this application.
