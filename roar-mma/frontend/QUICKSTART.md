# ROAR MMA Frontend - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Backend API running (see backend README)

### Step 1: Clone and Install

```bash
# Navigate to frontend directory
cd roar-mma/frontend

# Install dependencies
npm install
```

### Step 2: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
# VITE_API_URL=http://localhost:3001
```

### Step 3: Start Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173`

### Step 4: Login

Use the default credentials:
- **Email**: owner@roarmma.com.au
- **Password**: admin123

## 📋 Common Tasks

### Development

```bash
# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Code Quality

```bash
# Format code
npm run format

# Check types
npm run type-check

# Run all checks
npm run check-all
```

## 🎯 Key Features to Try

### 1. Dashboard
- View real-time KPIs
- Check today's class schedule
- Monitor recent activity

### 2. Members
- Add a new member
- Search and filter members
- View member profile with attendance history

### 3. Classes
- View weekly schedule
- Create a new class
- Check in members to classes

### 4. Leads
- Manage leads in Kanban board
- Move leads through pipeline stages
- Convert leads to members

### 5. Reports
- Generate membership reports
- View revenue analytics
- Analyze attendance patterns

## 🎨 Customization

### Change Theme

Click the theme toggle in the header to switch between light and dark mode.

### Update Gym Information

Go to Settings → General to update:
- Gym name
- Contact information
- Business hours
- Locations

### Configure Notifications

Go to Settings → Notifications to configure:
- Email notifications
- SMS notifications
- Notification preferences

## 🔧 Troubleshooting

### Port Already in Use

```bash
# Use a different port
npm run dev -- --port 3000
```

### API Connection Issues

1. Verify backend is running
2. Check VITE_API_URL in .env
3. Check browser console for errors

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Hot Reload Not Working

```bash
# Restart dev server
# Press Ctrl+C to stop
npm run dev
```

## 📚 Learn More

- [Full Documentation](./README.md)
- [Development Guide](./DEVELOPMENT.md)
- [API Integration](./API_GUIDE.md)
- [Contributing](./CONTRIBUTING.md)

## 🆘 Getting Help

- Check the [Troubleshooting Guide](./TROUBLESHOOTING.md)
- Review [Common Issues](./README.md#troubleshooting)
- Contact support: support@roarmma.com.au

## ✅ Next Steps

1. ✅ Install dependencies
2. ✅ Configure environment
3. ✅ Start dev server
4. ✅ Login to the app
5. ⬜ Explore features
6. ⬜ Customize settings
7. ⬜ Add your first member
8. ⬜ Create a class schedule
9. ⬜ Process a payment
10. ⬜ Generate a report

## 🎉 You're Ready!

Start building your gym management system. Happy coding!

---

**Need help?** Check the full documentation or contact the development team.
