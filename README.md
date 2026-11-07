# Courier Tracking System

A MERN app for running a courier service: create shipments with tracking numbers, assign delivery agents, record transit checkpoints and delivery attempts, and let anyone follow a parcel on a public tracking page.

New to the code? Start with [How it works](docs/HOW-IT-WORKS.md).

## Live links

| | |
|---|---|
| Frontend | https://courie-tracking-system.netlify.app |
| Backend API | https://courier-tracking-api-xnxt.onrender.com/api/health |
| GitHub repository | https://github.com/Sachin-Rajpurohit/courier-tracking-system |

The API runs on Render's free plan and sleeps when idle, so the first request can take up to a minute.

## Demo accounts

Created by the seed script. These are for demonstration only.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@courier.test` | `Admin@1234` |
| Branch staff | `staff@courier.test` | `Staff@1234` |
| Delivery agent | `agent@courier.test` | `Agent@1234` |
| Customer | `customer@courier.test` | `Customer@1234` |

## Tech stack

- **Frontend:** React with Vite, react-router-dom, Context API, controlled forms
- **Backend:** Express 5, JWT, bcrypt password hashing, role middleware
- **Database:** MongoDB Atlas with Mongoose schemas, validation and indexes
- **Deployment:** Render (API), Netlify or Vercel (frontend), GitHub

## What each role can do

| | Admin | Branch staff | Delivery agent | Customer |
|---|---|---|---|---|
| Track a parcel publicly | ✓ | ✓ | ✓ | ✓ |
| Dashboard | All shipments | All shipments | Their deliveries | Their shipments |
| Create shipments | ✓ | ✓ | | Their own |
| Edit shipments | Until closed | Until closed | | Before pickup |
| Cancel shipments | Before transit | Before transit | | Before pickup |
| Delete shipments | ✓ | | | |
| Assign or reassign agents | ✓ | ✓ | | |
| Add checkpoints | ✓ | ✓ | Assigned shipments | |
| Record delivery attempts | ✓ | ✓ | Assigned shipments | |
| Delete checkpoints | ✓ | ✓ | | |
| Delete delivery attempts | ✓ | | | |
| Addresses | All | All | Through assigned shipments | Their own |
| Users | Full control | View customers and agents, add customers | | |

## Run it locally

You need Node.js 20 or newer.

### Quick try, without an Atlas account

This runs the API on a temporary in-memory database filled with demo data. Everything is lost when it stops.

```bash
cd server
npm install
npm run dev:memory
```

The first `npm install` downloads a copy of MongoDB of several hundred MB for this, so it can take a while.

In a second terminal:

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173.

### With MongoDB Atlas

1. In Atlas, create a free cluster, a database user, and allow network access from your IP.
2. Set up the server:

   ```bash
   cd server
   npm install
   cp .env.example .env
   ```

3. In `server/.env`, set `MONGO_URI` to your connection string and `JWT_SECRET` to a long random value. This command generates one:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

4. Load the demo data and start the API:

   ```bash
   npm run seed
   npm run dev
   ```

   `npm run seed` won't touch a database that already has data. `npm run seed -- --reset` **deletes everything** in the database first.

5. Start the frontend as above.

## Tests

The API tests run against a temporary database, so they don't need Atlas.

```bash
cd server
npm test
```

They cover authentication, role permissions, customer data isolation, list features, validation, the full delivery workflow, what the public tracking page reveals, and reports.

## Deployment

### Backend on Render

1. Push this repository to GitHub.
2. In Render, choose **New > Blueprint** and select the repository. It reads `render.yaml`.
3. Enter `MONGO_URI` and, once you know the frontend URL, `CLIENT_URL`.
4. In Atlas, allow network access from Render. On the free tier that means `0.0.0.0/0`, so use a strong database password.
5. To load demo data, run this once from your own computer with `MONGO_URI` in `server/.env` pointing at Atlas: `npm run seed`.

Free Render services go to sleep when idle, so the first request after a while can take up to a minute.

### Frontend on Netlify or Vercel

1. Import the repository and set the base directory to `client`.
2. Build command `npm run build`, publish directory `dist`.
3. Add the environment variable `VITE_API_URL=https://YOUR-RENDER-APP.onrender.com/api`.
4. Set `CLIENT_URL` on Render to the frontend's URL, with no trailing slash.

Page refreshes on inner routes are already handled by `client/public/_redirects` (Netlify) and `client/vercel.json` (Vercel).

## API overview

All routes start with `/api`. Lists accept `page`, `limit` (up to 100), `sort` (prefix with `-` for descending) and the filters below. The Postman collection in `docs/` has an example of every request.

| Method and path | Access | Notes |
|---|---|---|
| `POST /auth/register` | Public | Always creates a customer |
| `POST /auth/login` | Public | Returns a JWT |
| `POST /auth/logout` | Signed in | Confirms logout; the browser deletes its token |
| `GET`, `PUT /auth/me` | Signed in | Own profile |
| `PUT /auth/password` | Signed in | Change password |
| `GET /track/:trackingNumber` | Public | Status and history without private details |
| `GET /users` | Admin, staff | `q`, `role`, `active`, `branch` |
| `POST /users` | Admin, staff | Staff can only create customers |
| `GET /users/:id` | Admin, staff | |
| `PUT`, `DELETE /users/:id` | Admin | Users with records can only be deactivated |
| `GET /addresses` | Admin, staff, customer | `q`, `city`, `owner` |
| `POST /addresses` | Admin, staff, customer | |
| `GET`, `PUT`, `DELETE /addresses/:id` | Admin, staff, owner | Locked once used by a shipment |
| `GET /shipments` | Signed in, scoped by role | `q`, `status`, `serviceType`, `branch`, `customer`, `agent`, `from`, `to`, `open` |
| `POST /shipments` | Admin, staff, customer | Generates the tracking number |
| `GET /shipments/:id` | Signed in, scoped by role | Includes events, attempts and assignments |
| `PUT /shipments/:id` | Admin, staff, customer | Status changes go through checkpoints |
| `POST /shipments/:id/cancel` | Admin, staff, customer | |
| `DELETE /shipments/:id` | Admin | Also deletes related records |
| `GET /tracking-events` | Signed in, scoped by role | `q`, `tracking`, `status`, `from`, `to` |
| `POST /tracking-events` | Admin, staff, assigned agent | Adds a checkpoint and moves the shipment |
| `GET /tracking-events/:id` | Signed in, scoped by role | |
| `PUT /tracking-events/:id` | Admin, staff, agent who recorded it | Location and note only |
| `DELETE /tracking-events/:id` | Admin, staff | Restores the previous status if needed |
| `GET /assignments` | Admin, staff, agent | `tracking`, `status`, `agent` |
| `POST /assignments` | Admin, staff | Replaces any active assignment |
| `GET /assignments/:id` | Admin, staff, agent | |
| `PUT /assignments/:id` | Admin, staff | Note, or `status: "cancelled"` to unassign |
| `DELETE /assignments/:id` | Admin | Not if it has attempts |
| `GET /delivery-attempts` | Admin, staff, agent | `tracking`, `outcome`, `failureReason`, `agent`, `from`, `to` |
| `POST /delivery-attempts` | Admin, staff, assigned agent | Shipment must be out for delivery |
| `GET`, `PUT /delivery-attempts/:id` | Admin, staff, agent | Outcome can't be changed |
| `DELETE /delivery-attempts/:id` | Admin | Latest attempt only; restores the previous status |
| `GET /reports/summary` | Signed in, scoped by role | Dashboard numbers |

## Project structure

```
server/src/
  config/        environment checks and database connection
  models/        Mongoose schemas and indexes
  routes/        Express routers
  controllers/   request handlers
  middleware/    auth, roles, validation, rate limits, errors
  validators/    API validation rules
  services/      shipment workflow rules
  utils/         pagination, access rules, tracking numbers
  seed/          demo data
server/tests/    API tests
client/src/
  api/           fetch wrapper
  context/       auth and toast state (Context API)
  components/    shared UI and forms
  pages/         one file per screen
  utils/         labels, formatting, form validation
docs/            ER diagram, Postman collection
```

## Design decisions

- **Public tracking shows only cities and status history.** Names, phone numbers, street addresses and staff notes stay private. Tracking numbers are random, so they can't be guessed in sequence.
- **Status only changes through the workflow.** Shipments follow fixed transitions (see [the status flow](docs/ER-diagram.md#shipment-status-flow)), and `delivered` can only come from a recorded delivery attempt.
- **Addresses lock once used,** so a shipment's history always shows where it actually went.
- **Users with records are deactivated rather than deleted,** so history stays complete.
- **Logging out deletes the token from the browser.** The server doesn't keep a list of tokens, so a copied token keeps working until it expires. Deactivating a user blocks them immediately.

## Submission checklist

- [x] Source code and README
- [x] Postman collection: `docs/Courier-Tracking.postman_collection.json`
- [x] ER diagram: `docs/ER-diagram.md`
- [x] Demo credentials (above)
- [x] Screenshots of the local app: `docs/screenshots/`
- [x] GitHub repository
- [x] Live URLs
