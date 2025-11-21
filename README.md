# Bharadwaj's Cafe

A full-stack coffee shop website with React frontend and Express backend.

## Project Structure

```
Bharadwaj_Cafe/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── utils/         # API & Socket utilities
│   │   └── ...
│   ├── public/        # Static assets (images)
│   └── ...
├── backend/           # Express.js backend API
│   ├── models/        # MongoDB models
│   ├── routes/        # API routes
│   ├── controllers/   # Route controllers
│   ├── middleware/    # Auth middleware
│   ├── config/        # Database config
│   └── ...
└── README.md
```

## Features

✅ **Frontend**
- Modern React 18 with Vite
- Responsive design
- Real-time updates with Socket.io
- Menu display from database
- Contact form integration
- Order management

✅ **Backend**
- RESTful API with Express.js
- MongoDB database
- JWT authentication
- Real-time notifications
- Order management
- Menu management

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:
```env
PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:5173
```

Seed database with menu items:
```bash
npm run seed
```

Start backend server:
```bash
npm run dev
```

Backend will run on `http://localhost:5000`

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create `.env` file:
```env
VITE_API_URL=http://localhost:5000/api
```

Start frontend:
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

## API Endpoints

### Public Routes
- `GET /api/menu` - Get menu items
- `POST /api/orders` - Create order
- `POST /api/contact` - Submit contact form
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user

### Protected Routes (Admin)
- `GET /api/orders` - Get all orders
- `PUT /api/orders/:id/status` - Update order status
- `POST /api/menu` - Create menu item
- `PUT /api/menu/:id` - Update menu item
- `DELETE /api/menu/:id` - Delete menu item

## Technologies

### Frontend
- React 18
- Vite 5
- Socket.io Client
- CSS3
- Font Awesome

### Backend
- Node.js
- Express.js
- MongoDB & Mongoose
- Socket.io
- JWT
- bcryptjs

## Documentation

- [Frontend Documentation](frontend/README.md)
- [Backend Documentation](backend/README.md)

## Contact

Email: gururb20@gmail.com
Website: www.bharadwajscafe.com
