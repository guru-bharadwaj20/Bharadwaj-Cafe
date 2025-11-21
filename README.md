# Bharadwaj's Cafe

A full-stack coffee shop platform with a React (Vite) frontend and an Express/MongoDB backend. It supports real-time features (orders & chat), user accounts, loyalty points, wishlist management, reviews, blogs, and basic admin functions for menu and order oversight.

## Project Structure

```
Bharadwaj-Cafe/
├── backend/                    # Express.js REST + Socket.io API
│   ├── server.js               # App & Socket.io bootstrap
│   ├── config/db.js            # MongoDB connection logic
│   ├── models/                 # Mongoose schemas (User, MenuItem, Order, Review, Address, Wishlist, Blog, Chat, Contact)
│   ├── controllers/            # Business logic per domain
│   ├── routes/                 # Route definitions mapping to controllers
│   ├── middleware/auth.js      # JWT auth & role checks
│   ├── utils/email.js          # Nodemailer integration (contact, notifications)
│   ├── createAdmin.js          # Script to create initial admin
│   ├── seeder.js               # Data seeding (menu items, optionally destroy)
│   └── README.md
├── frontend/                   # React 18 + Vite application
│   ├── src/
│   │   ├── App.jsx             # Root component / Router
│   │   ├── main.jsx            # Entry point (mount React)
│   │   ├── components/         # Reusable UI & feature components
│   │   ├── pages/              # Page-level views (Home, Login, Register, AdminDashboard, etc.)
│   │   ├── context/            # Global state (Auth, Cart)
│   │   ├── utils/              # API client + socket setup
│   │   ├── *.css               # Feature-scoped styles
│   │   └── ...
│   ├── public/                 # Static assets (images)
│   └── README.md
└── README.md                   # Root documentation
```

## Core Domains & Features

Frontend (React + Vite):
- Responsive UI components (hero, menu, cart, profile, admin dashboard)
- React Router-based navigation with protected routes
- Real-time order & chat updates via `socket.io-client`
- User authentication flows (register, login, email verification placeholder, password reset)
- Wishlist & loyalty points display
- Blog listing & reviews integration
- Client-side cart & order placement

Backend (Express + MongoDB):
- Modular controllers & routes per domain (menu, orders, reviews, addresses, wishlist, blogs, chat, loyalty, contact, auth, admin)
- JWT-based auth (token issuance & middleware guard)
- Socket.io server for order events + chat messaging
- Mongoose models encapsulating data schemas
- Email utility (Nodemailer) for contact form or future notifications
- Seeder & admin creation scripts for initial setup

Real-Time:
- Order notifications broadcast (`orderPlaced` → `newOrder`)
- Live chat between user and admin (room-based messaging)

Data Models (High-Level):
- `User`: credentials, roles (user/admin), possibly loyalty points
- `MenuItem`: coffee/food items (name, price, category, availability)
- `Order`: items, user reference, status lifecycle
- `Review`: user reviews for menu items or overall experience
- `Wishlist`: user-curated list of desired items
- `Address`: stored shipping / delivery addresses
- `Blog`: content posts for cafe updates
- `Chat`: message records for user-admin sessions
- `Contact`: submissions from the contact form

## API Overview (Representative)

Public:
- `GET /api/menu` – List menu items
- `POST /api/auth/register` – Register user
- `POST /api/auth/login` – Authenticate user
- `POST /api/orders` – Place an order
- `POST /api/contact` – Submit contact form

Authenticated / User:
- `GET /api/orders` – (User or Admin scoped) Fetch orders
- `GET /api/wishlist` / `POST /api/wishlist` – Manage wishlist
- `GET /api/addresses` / CRUD – Address management
- `GET /api/reviews` / `POST /api/reviews` – Submit/view reviews
- `GET /api/loyalty` – Loyalty points status
- `GET /api/blogs` – View blogs

Admin:
- `POST /api/menu` / `PUT /api/menu/:id` / `DELETE /api/menu/:id`
- `PUT /api/orders/:id/status` – Update order state
- Additional admin oversight endpoints in `adminRoutes`

Health:
- `GET /api/health` – Simple uptime check

## Environment Variables

Backend `.env` (minimum):
```
PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:5173
```
Optional (if extending email):
```
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
```

Frontend `.env`:
```
VITE_API_URL=http://localhost:5000/api
```

## Installation & Development

**📋 For detailed setup instructions after cloning, see [SETUP.md](SETUP.md)**

Quick start:

Backend:
```bash
cd backend
npm install
cp .env.example .env  # Create and configure .env
npm run seed          # Seed initial menu data
npm run dev           # Start with nodemon
```
Runs at: `http://localhost:5000`

Frontend:
```bash
cd frontend
npm install
cp .env.example .env  # Create .env (optional, defaults work)
npm run dev
```
Runs at: `http://localhost:5173`

## Scripts (Backend)
- `npm run dev` – Nodemon development server
- `npm start` – Production start
- `npm run seed` – Seed sample data
- `npm run seed:destroy` – Remove seeded data
- `node createAdmin.js` – Initialize an admin user

## Tech Stack

Frontend:
- React 18, Vite 5, React Router 6, Socket.io Client

Backend:
- Node.js, Express.js, Mongoose, Socket.io, JWT, bcryptjs, Nodemailer

## High-Level Flow
1. User registers / logs in → receives JWT stored client-side.
2. Authenticated requests include token → backend middleware validates + attaches user.
3. Orders placed trigger Socket.io events → admin dashboard receives real-time updates.
4. Chat uses Socket.io rooms to target messages (`user_<userId>`).
5. Loyalty, wishlist, reviews, addresses managed via their respective REST endpoints.

## Future Enhancements (Ideas)
- Payment gateway integration
- Image uploads for blog/menu items
- Role-based granular permissions
- Detailed email notifications (order status changes)
- Rate limiting & security hardening

## Documentation
- [Frontend Documentation](frontend/README.md)
- [Backend Documentation](backend/README.md)

## Contact
Email: gururb20@gmail.com  
Website: https://www.bharadwajscafe.com

---
Superficial overview added: for deeper domain details, inspect individual controller & model files under `backend/`.
