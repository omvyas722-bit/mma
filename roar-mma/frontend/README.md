# ROAR MMA Management System - Frontend

A comprehensive gym management system built with React, designed specifically for martial arts gyms and fitness centers.

## 🚀 Features

- **Member Management** - Complete member profiles, attendance tracking, and membership management
- **Class Scheduling** - Schedule and manage classes with instructor assignments and capacity tracking
- **Payment Processing** - Integrated payment tracking with Stripe support
- **Lead Management** - Track and convert leads through the sales funnel
- **Communications** - Bulk email and SMS messaging with templates
- **Reports & Analytics** - Comprehensive reporting on members, revenue, attendance, and retention
- **Settings Management** - Configurable gym settings, locations, and integrations

## 🛠️ Tech Stack

- **React 18** - Modern React with hooks and functional components
- **React Router v6** - Client-side routing
- **TanStack Query (React Query)** - Data fetching and caching
- **Axios** - HTTP client
- **Tailwind CSS** - Utility-first CSS framework
- **date-fns** - Date manipulation library
- **Vite** - Fast build tool and dev server

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Accordion/       # Collapsible content sections
│   │   ├── Alert/           # Alert and notification messages
│   │   ├── Avatar/          # User profile images
│   │   ├── Badge/           # Status indicators and labels
│   │   ├── Breadcrumb/      # Navigation breadcrumbs
│   │   ├── Buttons/         # Button components
│   │   ├── Card/            # Content containers
│   │   ├── Dropdown/        # Dropdown menus
│   │   ├── Forms/           # Form input components
│   │   ├── Modal/           # Modal dialogs
│   │   ├── Pagination/      # Data pagination
│   │   ├── Progress/        # Loading and progress indicators
│   │   ├── Shared/          # Shared components
│   │   ├── Tabs/            # Tabbed interfaces
│   │   └── Tooltip/         # Helpful hints and tooltips
│   ├── contexts/            # React context providers
│   │   ├── AuthContext.jsx
│   │   ├── NotificationContext.jsx
│   │   ├── SettingsContext.jsx
│   │   └── ThemeContext.jsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useApi.js
│   │   └── useCustomHooks.js
│   ├── lib/                 # Utility libraries
│   │   ├── a11y.js          # Accessibility utilities
│   │   ├── animations.js    # Animation helpers
│   │   ├── api.js           # API client
│   │   ├── businessLogic.js # Business logic utilities
│   │   ├── constants.js     # Application constants
│   │   ├── dateUtils.js     # Date/time utilities
│   │   ├── exportUtils.js   # Data export utilities
│   │   ├── logger.js        # Logging system
│   │   ├── mockData.js      # Mock data generator
│   │   ├── storage.js       # Storage management
│   │   ├── theme.js         # Theme configuration
│   │   └── validation.js    # Form validation
│   ├── pages/               # Page components
│   │   ├── Calendar.jsx
│   │   ├── Classes.jsx
│   │   ├── Communications.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Leads.jsx
│   │   ├── MemberProfile.jsx
│   │   ├── Members.jsx
│   │   ├── Payments.jsx
│   │   ├── Reports.jsx
│   │   └── Settings.jsx
│   └── styles/              # Global styles
│       └── print.css
└── package.json
```

## 🚦 Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- Backend API running (see backend README)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:3001
```

## 📚 Component Library

### Form Components

```jsx
import { Input, Select, Checkbox, RadioGroup } from './components/Forms';

<Input
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
  required
/>
```

### Modal Components

```jsx
import { Modal, ConfirmDialog } from './components/Modal';

<Modal isOpen={isOpen} onClose={onClose} title="Edit Member">
  <form>...</form>
</Modal>
```

### Data Display

```jsx
import { Card, Badge, Avatar } from './components';

<Card>
  <Avatar src={member.photo} name={member.name} />
  <Badge variant="success">Active</Badge>
</Card>
```

## 🎨 Theming

The application supports light and dark themes:

```jsx
import { useTheme } from './contexts/ThemeContext';

function MyComponent() {
  const { mode, toggleTheme } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      Current theme: {mode}
    </button>
  );
}
```

## 🔐 Authentication

```jsx
import { useAuth } from './contexts/AuthContext';

function ProtectedPage() {
  const { user, logout } = useAuth();
  
  return (
    <div>
      <p>Welcome, {user.name}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## 📊 Data Fetching

Using React Query for data management:

```jsx
import { useQuery, useMutation } from '@tanstack/react-query';
import { membersApi } from './lib/api';

function MembersList() {
  const { data, isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersApi.getAll(),
  });

  const createMember = useMutation({
    mutationFn: membersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['members']);
    },
  });
}
```

## 🔔 Notifications

```jsx
import { useNotifications } from './contexts/NotificationContext';

function MyComponent() {
  const { success, error } = useNotifications();

  const handleSave = async () => {
    try {
      await saveData();
      success('Data saved successfully!');
    } catch (err) {
      error('Failed to save data');
    }
  };
}
```

## 📝 Form Validation

```jsx
import { validateEmail, validatePhone } from './lib/validation';

const emailValidation = validateEmail(email);
if (!emailValidation.isValid) {
  console.error(emailValidation.error);
}
```

## 🎯 Business Logic

```jsx
import {
  isMembershipActive,
  canAttendClass,
  calculateChurnRisk,
} from './lib/businessLogic';

const isActive = isMembershipActive(member);
const canAttend = canAttendClass(member, classType, attendanceThisWeek);
const churnRisk = calculateChurnRisk(member, attendance, payments);
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📦 Building for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## 🎨 Styling Guidelines

- Use Tailwind CSS utility classes
- Follow dark mode support with `dark:` prefix
- Maintain consistent spacing using Tailwind's spacing scale
- Use theme colors from `lib/theme.js`

## ♿ Accessibility

- All interactive elements have proper ARIA labels
- Keyboard navigation supported throughout
- Focus management in modals and dropdowns
- Screen reader announcements for dynamic content
- Color contrast meets WCAG AA standards

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📖 API Documentation

See `lib/api.js` for complete API client documentation.

### Available API Modules

- `authApi` - Authentication
- `membersApi` - Member management
- `leadsApi` - Lead management
- `classesApi` - Class scheduling
- `paymentsApi` - Payment processing
- `communicationsApi` - Messaging
- `reportsApi` - Analytics and reports
- `settingsApi` - Settings management

## 🔧 Configuration

### Settings Context

```jsx
import { useSettings } from './contexts/SettingsContext';

function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  
  await updateSettings({
    general: {
      gymName: 'New Gym Name',
    },
  });
}
```

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (< 768px)

## 🐛 Debugging

Enable debug logging:

```jsx
import logger from './lib/logger';

logger.setLevel(LOG_LEVELS.DEBUG);
logger.debug('Debug message', { data });
```

## 🚀 Performance

- Code splitting with React.lazy()
- Image optimization
- Memoization with useMemo and useCallback
- React Query caching
- Lazy loading for large lists

## 📄 License

Proprietary - All rights reserved

## 👥 Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Submit a pull request

## 📞 Support

For support, email support@roarmma.com or open an issue in the repository.

---

Built with ❤️ for martial arts gyms worldwide
