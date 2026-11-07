# How this project works

A guide for reading the code for the first time. You don't need to read every file. Follow the reading order below, and most of the other files will look familiar because they repeat the same patterns.

## The big picture

The app has three parts that talk to each other:

```
Browser (React)  --- HTTP request --->  Server (Express)  --- query --->  Database (MongoDB)
  client/ folder <--- JSON reply -----    server/ folder  <--- data -----   Atlas
```

- **React** draws the screens and collects what the user types.
- **Express** receives requests, checks who is asking, applies the rules, and replies with JSON.
- **MongoDB** stores the data. **Mongoose** is the library Express uses to talk to it.

## The six collections

| Model | What it stores | Example |
|---|---|---|
| User | Everyone who can log in, with a role | Arjun, a delivery agent |
| Address | A customer's saved addresses | Home, 14 MI Road, Jaipur |
| Shipment | One parcel and its current status | CTS7KQ2MZ94XP, in transit |
| TrackingEvent | One line of a parcel's history | Picked up at Jaipur Hub, 10:30 am |
| Assignment | Which agent handles which shipment | Arjun handles CTS7KQ2MZ94XP |
| DeliveryAttempt | One try at delivering | Attempt 1, failed, nobody home |

## Life of a parcel

1. A customer or staff member **creates a shipment**. The server generates a tracking number and adds the first tracking event.
2. Staff **assign an agent**, which creates an Assignment.
3. The agent or staff **add checkpoints**: picked up, in transit, out for delivery. Each one creates a TrackingEvent and updates the shipment's status.
4. The agent **records a delivery attempt**. If it succeeds, the shipment is delivered. If it fails, the shipment goes out for delivery again later, or back to the sender.
5. At any point, **anyone with the tracking number** can see the history on the public page.

The allowed moves are listed in `TRANSITIONS` in `server/src/models/constants.js`. For example, a shipment that's `created` can only become `picked_up` or `cancelled`.

## How one request travels through the server

Every feature follows the same path. Here's what happens when an agent adds a checkpoint:

```
POST /api/tracking-events
  app.js                                sends /api/tracking-events to the right router
  routes/trackingEventRoutes.js         lists the steps for this URL
    middleware/auth.js  protect         is the JWT valid? who is this?
    middleware/auth.js  authorize       is this role allowed?
    middleware/validate.js              are the fields filled in correctly?
  controllers/trackingEventController   handles the request
  services/shipmentWorkflow.js          applies the business rules, saves to the database
  models/...                            define what the data looks like
  res.json(...)                         sends the reply to the browser
```

If anything goes wrong, the code does `throw new ApiError(404, "Shipment not found")`. Express passes it to `middleware/error.js`, which sends a clean error message to the browser.

## How login works

1. The user submits their email and password to `POST /api/auth/login`.
2. The server finds the user and compares the password with the stored **bcrypt hash**. The real password is never stored.
3. The server replies with a **JWT**: a signed token that says "this is user 123". Only the server can create a valid one, because signing needs `JWT_SECRET`.
4. The browser saves the token in `localStorage` and sends it with each request, in the `Authorization` header. See `client/src/api/client.js`.
5. The `protect` middleware checks the token on protected routes and puts the user on `req.user`.
6. Logging out deletes the token from the browser.

## How roles work

There are two layers, and the server is the one that actually protects the data:

- **Which routes a role can use:** `authorize("admin", "staff")` in the route files.
- **Which records a role can see:** `shipmentScope()` in `server/src/utils/access.js`. A customer's queries are limited to their own shipments, and an agent's to the shipments assigned to them.

The React side (`NAV_BY_ROLE` in `Layout.jsx`, `RoleRoute` in `main.jsx`) only decides what to show. It can't protect anything, because users can change code running in their own browser.

## How a React screen works

Look at `client/src/pages/Login.jsx`, the smallest form:

1. `useFormState` holds what's typed in each field. This is what makes it a **controlled form**: React state is the source of truth for every input.
2. On submit, `event.preventDefault()` stops the browser from reloading the page.
3. `validateLogin` checks the fields first. If there are errors, they appear next to the inputs and nothing is sent.
4. Otherwise the request is sent. Errors from the server show the same way.

Other files you'll see used everywhere:

| File | What it does |
|---|---|
| `main.jsx` | The list of all pages and who can open them |
| `context/AuthContext.jsx` | Stores the logged-in user. Any page can call `useAuth()` |
| `context/ToastContext.jsx` | Pop-up success and error messages |
| `components/ListPage.jsx` | The reusable table with search, filters, sorting and pagination |
| `components/Feedback.jsx` | The loading, empty and error displays |
| `components/Modal.jsx` | Pop-up windows and "are you sure?" dialogs |

## Suggested reading order

Take these one at a time, and run the app so you can try each feature as you read it.

**Server**

1. `server/src/server.js` and `app.js`: how the server starts
2. `models/Address.js`: a simple model
3. `routes/addressRoutes.js` and `controllers/addressController.js`: a simple feature from start to finish
4. `middleware/auth.js` and `controllers/authController.js`: login and permissions
5. `models/constants.js` and `services/shipmentWorkflow.js`: the main rules of the app

**Client**

6. `client/src/main.jsx`: all the pages
7. `pages/Login.jsx` and `hooks/useFormState.js`: a simple form
8. `api/client.js`: how requests are sent
9. `context/AuthContext.jsx`: shared login state
10. `components/ListPage.jsx` and `pages/Addresses.jsx`: a full list screen
11. `pages/ShipmentDetail.jsx`: the busiest screen

## Words you'll run into

| Word | Meaning |
|---|---|
| Middleware | A function that runs before the controller, and can stop the request |
| Controller | The function that handles a request and sends the reply |
| Schema | The shape and rules of a document in MongoDB |
| `populate` | Replaces a stored ID with the actual record, like a customer's ID with their name |
| Index | Makes a database search faster, and can enforce uniqueness |
| `useState` | Lets a component remember a value and redraw when it changes |
| `useEffect` | Runs code after drawing, such as loading data |
| Context | Shares values across components without passing them down by hand |
| CORS | The browser rule that decides which websites may call the API |
| Status codes | 200 OK, 201 created, 400 bad input, 401 not logged in, 403 not allowed, 404 not found, 409 conflict with current state |

## Try changing something

Small changes are the fastest way to learn the code:

1. **Add a service type.** Add `"same_day"` to `SERVICE_TYPES` in `constants.js` and to `SERVICE_LABELS` in `client/src/utils/format.js`.
2. **Add a column.** Show `originBranch` in the `columns` list in `pages/Shipments.jsx`.
3. **Add a dashboard number.** Count `cancelled` shipments in `reportController.js` and show one more `Tile` in `Dashboard.jsx`.
4. **Add a field.** Add `alternatePhone` to `Address`, starting with the model, then the validator, the controller's `FIELDS` and the form.
