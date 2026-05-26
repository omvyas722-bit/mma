# ROAR MMA - Quick Start Guide

**Get up and running in 5 minutes!**

---

## ✅ Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js 18+ installed (`node --version`)
- ✅ npm 9+ installed (`npm --version`)
- ✅ Git installed (optional)

---

## 🚀 Installation & Setup

### Step 1: Navigate to Project
```bash
cd "C:\Users\omvya\Documents\randi software\roar-mma"
```

### Step 2: Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 3: Initialize Database
```bash
npm run db:init
```
This creates the database and default owner account.

### Step 4: Seed Test Data (Optional but Recommended)
```bash
npm run db:seed
```
This adds 8 members, 6 classes, 15+ bookings, 5 leads, and transactions.

### Step 5: Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

---

## 🎯 Running the Application

### Option 1: Two Terminals (Recommended)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
✅ Backend running at http://localhost:3001

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
✅ Frontend running at http://localhost:5173

### Option 2: Background Processes

**Start Backend in Background:**
```bash
cd backend
start /B npm run dev
```

**Start Frontend in Background:**
```bash
cd frontend
start /B npm run dev
```

---

## 🌐 Access the Application

Open your browser and go to:
```
http://localhost:5173
```

---

## 🔑 Login Credentials

### Owner Account (Full Access)
- **Email:** owner@roarmma.com.au
- **Password:** admin123

### Other Test Accounts
- **GM:** gm@roarmma.com.au / password123
- **Front Desk:** frontdesk@roarmma.com.au / password123
- **Coach:** kane@roarmma.com.au / password123
- **Sales:** sales@roarmma.com.au / password123
- **Social:** social@roarmma.com.au / password123

⚠️ **IMPORTANT:** Change the owner password after first login!

---

## 🎨 What You'll See

### Dashboard
- 6 KPI cards showing key metrics
- Today's class schedule
- Recent activity feed
- Real-time updates

### Members
- Searchable member list
- Filter by status and location
- 8 test members included

### Classes
- Weekly timetable view
- 6 classes across both locations
- Capacity indicators

### Leads
- Kanban board with 5 stages
- 5 test leads included
- Source tracking

### Billing
- Transaction history
- Revenue statistics
- Failed payment tracking

### Reports
- 4 report types (Membership, Revenue, Attendance, Leads)
- Date range filtering
- Detailed analytics

---

## 🔧 Common Tasks

### View Database
```bash
cd data
sqlite3 roarmma.db
.tables
.schema members
SELECT * FROM members;
.quit
```

### Check Backend Health
```bash
curl http://localhost:3001/api/health
```

### Reset Database (⚠️ Deletes all data)
```bash
cd backend
rm ../data/roarmma.db
npm run db:init
npm run db:seed
```

### Stop Servers
Press `Ctrl+C` in each terminal window.

---

## 🐛 Troubleshooting

### Port Already in Use

**Backend (3001):**
```bash
netstat -ano | findstr :3001
taskkill /PID <process_id> /F
```

**Frontend (5173):**
```bash
netstat -ano | findstr :5173
taskkill /PID <process_id> /F
```

### Database Locked
```bash
# Close all connections and restart
cd backend
rm ../data/roarmma.db-shm
rm ../data/roarmma.db-wal
npm run db:init
npm run db:seed
```

### WebSocket Not Connecting
1. Check backend is running
2. Verify `VITE_WS_URL=ws://localhost:3001` in `frontend/.env`
3. Check browser console for errors
4. Refresh the page

### Login Not Working
1. Verify backend is running at http://localhost:3001
2. Check `VITE_API_URL=http://localhost:3001` in `frontend/.env`
3. Try the default credentials exactly as shown
4. Check browser console for errors

---

## 📚 Next Steps

### 1. Explore the Application
- Login with different roles to see permission differences
- Create a new member
- Book a member into a class
- Add a new lead
- Generate reports

### 2. Customize Configuration
- Edit `backend/.env` for backend settings
- Edit `frontend/.env` for frontend settings
- Change JWT secret in production
- Configure external services (Lightspeed, Brevo, Twilio)

### 3. Add Real Data
- Replace test members with real members
- Update class schedule
- Configure actual payment processing
- Set up email/SMS services

### 4. Deploy to Production
- See `07-orchestration-deployment-plan.md` for deployment guide
- Set up Ubuntu VPS with PM2 + Nginx
- Configure SSL certificates
- Set up automated backups

---

## 📖 Documentation

- **README.md** - Complete documentation
- **STATUS.md** - Current project status
- **BUILD-COMPLETE.md** - Build summary
- **Planning docs/** - 12 detailed planning documents

---

## 💡 Tips

- Use the search bar in Members to find people quickly
- Click KPI cards in Dashboard to drill down
- WebSocket status shows in sidebar (green dot = connected)
- All dates are in YYYY-MM-DD format
- Trial end dates are automatically calculated
- Hold fees are $0.71 per day (max 84 days)

---

## 🎯 Key Features to Try

1. **Create a Member**
   - Go to Members → Add Member
   - Fill in details
   - Note: Trial end date is auto-calculated

2. **Book a Class**
   - Go to Classes
   - Click on a class
   - Select a member to book

3. **Track a Lead**
   - Go to Leads
   - Add a new lead
   - Drag between pipeline stages

4. **Generate Reports**
   - Go to Reports
   - Select report type
   - Choose date range
   - Click Generate Report

5. **View Analytics**
   - Dashboard shows real-time KPIs
   - Billing shows revenue statistics
   - Reports show detailed breakdowns

---

## ✅ Success Checklist

After setup, verify:
- [ ] Backend running at http://localhost:3001
- [ ] Frontend running at http://localhost:5173
- [ ] Can login with owner credentials
- [ ] Dashboard loads with KPIs
- [ ] Can see test members
- [ ] Can see test classes
- [ ] WebSocket connected (green dot in sidebar)
- [ ] No console errors

---

## 🆘 Need Help?

1. Check the troubleshooting section above
2. Review README.md for detailed documentation
3. Check browser console for errors
4. Verify both servers are running
5. Try resetting the database

---

**You're all set! Enjoy using ROAR MMA Management System! 🥋**
