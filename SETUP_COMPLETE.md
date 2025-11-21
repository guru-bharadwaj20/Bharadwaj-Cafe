# Development Setup Guide

## 🚀 Backend & Frontend Integration Complete!

Both servers are now running and fully integrated!

### ✅ What's Been Set Up:

#### Backend (Port 5000)
- ✅ Express.js server with MongoDB
- ✅ RESTful API endpoints
- ✅ JWT authentication
- ✅ Socket.io for real-time updates
- ✅ Database seeded with menu items
- ✅ Models: MenuItem, Order, Contact, User
- ✅ Routes: /api/menu, /api/orders, /api/contact, /api/auth

#### Frontend (Port 5173)
- ✅ React 18 with Vite
- ✅ API integration with backend
- ✅ Socket.io client setup
- ✅ Contact form with backend submission
- ✅ Menu loaded from database
- ✅ Real-time order notifications

### 🎯 Current Status:

**Backend Server:** ✅ Running on http://localhost:5000
**Frontend Server:** ✅ Running on http://localhost:5173
**Database:** ✅ Connected (MongoDB Atlas)
**Menu Items:** ✅ Seeded (6 coffee items)

### 🧪 Testing the Integration:

1. **Menu Display:**
   - Visit http://localhost:5173
   - Scroll to "Our Menu" section
   - Menu items should load from database with prices

2. **Contact Form:**
   - Scroll to "Contact Us" section
   - Fill out the form
   - Submit and check for success message
   - Data is saved to MongoDB

3. **API Health Check:**
   - Visit: http://localhost:5000/api/health
   - Should return: `{"status":"OK","message":"Server is running"}`

4. **View Menu API:**
   - Visit: http://localhost:5000/api/menu
   - Should return JSON array of menu items

### 📝 Next Steps:

#### To Create an Order (Future Implementation):
You can add an order modal/page with:
- Menu item selection
- Quantity picker
- Customer details form
- Order submission

#### To Add Admin Panel (Future Implementation):
- Create admin login page
- Dashboard to view orders
- Manage menu items
- View contact messages
- Real-time order notifications

### 🛠️ Useful Commands:

#### Backend:
```bash
cd backend
npm run dev        # Start development server
npm run seed       # Seed database with menu
npm run seed:destroy  # Clear database
```

#### Frontend:
```bash
cd frontend
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
```

### 📡 API Endpoints Available:

#### Public:
- `GET /api/menu` - Get menu items ✅
- `POST /api/contact` - Submit contact form ✅
- `POST /api/orders` - Create order (ready to implement)
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user

#### Admin (requires authentication):
- `GET /api/orders` - View all orders
- `PUT /api/orders/:id/status` - Update order status
- `POST /api/menu` - Add menu item
- `PUT /api/menu/:id` - Update menu item
- `DELETE /api/menu/:id` - Delete menu item

### 🔐 Database Collections:

- **menuitems** - Coffee menu items (6 items)
- **contacts** - Contact form submissions
- **orders** - Customer orders
- **users** - User accounts

### 🌐 Environment Variables:

**Backend (.env):**
```
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
CLIENT_URL=http://localhost:5173
```

**Frontend (.env):**
```
VITE_API_URL=http://localhost:5000/api
```

### 📚 Documentation:

- Root README: `/README.md`
- Backend README: `/backend/README.md`
- Frontend README: `/frontend/README.md`

---

## 🎉 Success!

Your full-stack cafe website is now running with:
- Beautiful React frontend
- Powerful Express backend
- MongoDB database
- Real-time Socket.io updates
- All styling preserved from original design

Visit **http://localhost:5173** to see it in action!
