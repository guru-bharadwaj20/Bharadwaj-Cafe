# Bharadwaj's Cafe - Backend API

Express.js REST API with MongoDB for Bharadwaj's Cafe website.

## Features

- 🔐 JWT Authentication
- 📦 RESTful API endpoints
- 🗄️ MongoDB database
- ⚡ Real-time updates with Socket.io
- 🔒 Secure password hashing with bcrypt
- 📝 Contact form submissions
- 🛒 Order management
- 🍽️ Menu management

## API Endpoints

### Menu Routes
- `GET /api/menu` - Get all menu items (Public)
- `GET /api/menu/:id` - Get single menu item (Public)
- `POST /api/menu` - Create menu item (Admin only)
- `PUT /api/menu/:id` - Update menu item (Admin only)
- `DELETE /api/menu/:id` - Delete menu item (Admin only)

### Order Routes
- `POST /api/orders` - Create new order (Public)
- `GET /api/orders` - Get all orders (Admin only)
- `GET /api/orders/:id` - Get order by ID (Public)
- `GET /api/orders/customer/:email` - Get orders by email (Public)
- `PUT /api/orders/:id/status` - Update order status (Admin only)

### Contact Routes
- `POST /api/contact` - Submit contact form (Public)
- `GET /api/contact` - Get all messages (Admin only)
- `PUT /api/contact/:id` - Update message status (Admin only)

### Auth Routes
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (Protected)

### Health Check
- `GET /api/health` - Check server status

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
CLIENT_URL=http://localhost:5173
```

### 3. Seed Database

Import menu items:
```bash
npm run seed
```

Destroy data:
```bash
npm run seed:destroy
```

### 4. Run Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Socket.io Events

### Client -> Server
- `orderPlaced` - Notify when new order is placed

### Server -> Client
- `newOrder` - Broadcast new orders to admin
- `orderStatusUpdated` - Notify when order status changes

## Models

### MenuItem
```javascript
{
  name: String,
  description: String,
  price: Number,
  image: String,
  category: String,
  available: Boolean
}
```

### Order
```javascript
{
  customerName: String,
  customerEmail: String,
  customerPhone: String,
  items: [{ menuItem, name, quantity, price }],
  totalAmount: Number,
  status: String,
  orderType: String,
  specialInstructions: String,
  deliveryAddress: String
}
```

### Contact
```javascript
{
  name: String,
  email: String,
  message: String,
  status: String
}
```

### User
```javascript
{
  name: String,
  email: String,
  password: String (hashed),
  role: String
}
```

## Authentication

Protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

## Error Handling

All errors return JSON response:
```json
{
  "message": "Error description"
}
```

## Tech Stack

- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Socket.io** - Real-time communication
- **CORS** - Cross-origin requests
- **dotenv** - Environment variables
