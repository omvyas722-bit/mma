# ROAR MMA Frontend - API Integration Guide

## API Client Configuration

The API client is configured in `src/lib/api.js` with the following features:

- Automatic retry logic with exponential backoff
- Request/response interceptors
- Authentication token management
- Error handling
- Request cancellation support

## Base Configuration

```javascript
import api from './lib/api';

// API base URL is set from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

## Authentication

### Login

```javascript
import { authApi } from './lib/api';

const response = await authApi.login({
  email: 'user@example.com',
  password: 'password123'
});

// Response includes token and user data
const { token, user } = response;
```

### Logout

```javascript
await authApi.logout();
```

### Token Management

Tokens are automatically included in request headers:

```javascript
// Automatically added to all requests
headers: {
  'Authorization': `Bearer ${token}`
}
```

## API Endpoints

### Members API

```javascript
import { membersApi } from './lib/api';

// Get all members
const members = await membersApi.getAll({ 
  query: 'search term',
  status: 'active',
  location: 'rockingham'
});

// Get single member
const member = await membersApi.getById(memberId);

// Create member
const newMember = await membersApi.create({
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  phone: '0412345678',
  // ... other fields
});

// Update member
const updated = await membersApi.update(memberId, {
  status: 'paused'
});

// Delete member
await membersApi.delete(memberId);

// Get member attendance
const attendance = await membersApi.getAttendance(memberId);

// Get member payments
const payments = await membersApi.getPayments(memberId);
```

### Classes API

```javascript
import { classesApi } from './lib/api';

// Get class instances
const instances = await classesApi.getInstances({
  week_start: '2024-01-01',
  week_end: '2024-01-07'
});

// Create class
const newClass = await classesApi.create({
  name: 'BJJ Fundamentals',
  class_type: 'bjj',
  capacity: 20,
  // ... other fields
});

// Check in member
await classesApi.checkIn(instanceId, memberId);
```

### Leads API

```javascript
import { leadsApi } from './lib/api';

// Get all leads
const leads = await leadsApi.getAll();

// Create lead
const newLead = await leadsApi.create({
  first_name: 'Jane',
  last_name: 'Smith',
  phone: '0412345678',
  source: 'website',
  stage: 'new'
});

// Update lead stage
await leadsApi.update(leadId, {
  stage: 'contacted'
});
```

### Payments API

```javascript
import { paymentsApi } from './lib/api';

// Get payments
const payments = await paymentsApi.getAll({
  status: 'succeeded',
  type: 'membership'
});

// Process payment
const payment = await paymentsApi.create({
  member_id: memberId,
  amount: 150.00,
  description: 'Monthly membership',
  payment_method: 'card'
});

// Refund payment
await paymentsApi.refund(paymentId);
```

### Reports API

```javascript
import { reportsApi } from './lib/api';

// Get membership report
const report = await reportsApi.getMembership({
  date_from: '2024-01-01',
  date_to: '2024-01-31'
});

// Get revenue report
const revenue = await reportsApi.getRevenue({
  date_from: '2024-01-01',
  date_to: '2024-01-31'
});

// Get attendance report
const attendance = await reportsApi.getAttendance({
  date_from: '2024-01-01',
  date_to: '2024-01-31'
});
```

### Communications API

```javascript
import { communicationsApi } from './lib/api';

// Send message
await communicationsApi.send({
  type: 'email',
  recipients: 'all_active',
  subject: 'Important Update',
  message: 'Message content...',
  schedule_for: null // or datetime string
});

// Get message history
const history = await communicationsApi.getHistory();
```

### Settings API

```javascript
import { settingsApi } from './lib/api';

// Get settings
const settings = await settingsApi.get();

// Update settings
await settingsApi.update({
  general: {
    gym_name: 'ROAR MMA',
    timezone: 'Australia/Perth'
  }
});
```

## React Query Integration

### Using with React Query

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membersApi } from './lib/api';

function MembersList() {
  const queryClient = useQueryClient();

  // Fetch data
  const { data: members, isLoading, error } = useQuery({
    queryKey: ['members', { status: 'active' }],
    queryFn: () => membersApi.getAll({ status: 'active' }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutate data
  const createMember = useMutation({
    mutationFn: membersApi.create,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries(['members']);
    },
    onError: (error) => {
      console.error('Failed to create member:', error);
    }
  });

  const handleCreate = (data) => {
    createMember.mutate(data);
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {members.map(member => (
        <div key={member.id}>{member.name}</div>
      ))}
    </div>
  );
}
```

## Error Handling

### API Error Structure

```javascript
{
  message: 'Error message',
  errors: {
    field_name: 'Field-specific error'
  },
  status: 400
}
```

### Handling Errors

```javascript
try {
  await membersApi.create(data);
} catch (error) {
  if (error.response) {
    // Server responded with error
    const { status, data } = error.response;
    
    if (status === 400) {
      // Validation errors
      setErrors(data.errors);
    } else if (status === 401) {
      // Unauthorized - redirect to login
      navigate('/login');
    } else if (status === 403) {
      // Forbidden
      alert('You do not have permission');
    } else if (status === 404) {
      // Not found
      alert('Resource not found');
    } else {
      // Other server error
      alert('Server error occurred');
    }
  } else if (error.request) {
    // Request made but no response
    alert('Network error - please check your connection');
  } else {
    // Other error
    alert('An error occurred');
  }
}
```

## Request Cancellation

```javascript
import { CancelToken } from './lib/api';

const source = CancelToken.source();

// Make request with cancel token
membersApi.getAll({ cancelToken: source.token });

// Cancel request
source.cancel('Request cancelled by user');
```

## Batch Requests

```javascript
import { batchRequests } from './lib/api';

const results = await batchRequests([
  () => membersApi.getAll(),
  () => classesApi.getAll(),
  () => leadsApi.getAll()
]);

const [members, classes, leads] = results;
```

## Polling

```javascript
import { pollUntilComplete } from './lib/api';

const result = await pollUntilComplete(
  () => reportsApi.getStatus(reportId),
  (response) => response.status === 'completed',
  { interval: 2000, maxAttempts: 30 }
);
```

## WebSocket Integration

```javascript
import { useWebSocket } from './contexts/WebSocketContext';

function MyComponent() {
  const { socket, connected } = useWebSocket();

  useEffect(() => {
    if (!socket) return;

    // Listen for events
    socket.on('member:updated', (data) => {
      console.log('Member updated:', data);
      queryClient.invalidateQueries(['members']);
    });

    return () => {
      socket.off('member:updated');
    };
  }, [socket]);

  return <div>Connected: {connected ? 'Yes' : 'No'}</div>;
}
```

## Environment Variables

Required environment variables:

```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

## CORS Configuration

The backend must allow requests from the frontend origin:

```javascript
// Backend CORS configuration
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

## Rate Limiting

The API client includes automatic retry with exponential backoff for rate-limited requests (429 status).

## Testing API Calls

```javascript
// Mock API calls in tests
jest.mock('./lib/api', () => ({
  membersApi: {
    getAll: jest.fn(() => Promise.resolve([
      { id: 1, name: 'Test Member' }
    ]))
  }
}));
```

## Troubleshooting

### CORS Errors

- Verify backend CORS configuration
- Check API_URL in .env
- Ensure credentials are included in requests

### Authentication Errors

- Check token is stored correctly
- Verify token is not expired
- Check Authorization header format

### Network Errors

- Verify backend is running
- Check API_URL is correct
- Test with curl or Postman

### Timeout Errors

- Increase timeout in api.js
- Check backend performance
- Verify network connection

## Best Practices

1. Always use React Query for data fetching
2. Handle loading and error states
3. Invalidate queries after mutations
4. Use optimistic updates for better UX
5. Implement proper error handling
6. Use TypeScript for type safety (optional)
7. Cache responses appropriately
8. Cancel requests when components unmount
