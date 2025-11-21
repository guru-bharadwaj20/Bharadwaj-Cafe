# Setup Guide

## After Cloning from GitHub

Follow these steps to set up the project locally after cloning:

### 1. Clone the Repository
```bash
git clone https://github.com/guru-bharadwaj20/Bharadwaj-Cafe.git
cd Bharadwaj-Cafe
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file (copy from `.env.example` and update values):
```bash
cp .env.example .env
```

Edit `.env` with your actual values:
```env
PORT=5000
MONGO_URI=your_actual_mongodb_uri
JWT_SECRET=your_actual_secret_key
CLIENT_URL=http://localhost:5173
```

Seed the database:
```bash
npm run seed
```

Create admin user (optional):
```bash
node createAdmin.js
```

Start backend:
```bash
npm run dev
```

### 3. Frontend Setup

Open a new terminal:
```bash
cd frontend
npm install
```

Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env` if needed (default should work):
```env
VITE_API_URL=http://localhost:5000/api
```

Start frontend:
```bash
npm run dev
```

### 4. Access the Application

- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Health Check: http://localhost:5000/api/health

## Important Notes

- **Never commit `.env` files** - they contain sensitive credentials
- `.env.example` files are tracked to show required variables
- `node_modules/` folders will be created by `npm install`
- Make sure MongoDB is running and accessible at your `MONGO_URI`

## Troubleshooting

**MongoDB Connection Issues:**
- Verify your `MONGO_URI` is correct
- Ensure MongoDB service is running
- Check network access if using cloud MongoDB (Atlas)

**Port Already in Use:**
- Change `PORT` in backend `.env` file
- Update `VITE_API_URL` in frontend `.env` accordingly

**Module Not Found:**
- Delete `node_modules/` and `package-lock.json`
- Run `npm install` again
