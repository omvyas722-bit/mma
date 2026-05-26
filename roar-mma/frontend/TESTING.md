# ROAR MMA Frontend - Testing Guide

## Testing Stack

- **Vitest** - Fast unit test framework
- **React Testing Library** - Component testing
- **MSW (Mock Service Worker)** - API mocking
- **Playwright** - E2E testing (optional)

## Setup

### Install Testing Dependencies

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw
```

### Configure Vitest

Create `vitest.config.js`:

```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.config.js',
      ],
    },
  },
});
```

### Test Setup File

Create `src/test/setup.js`:

```javascript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

## Writing Tests

### Component Tests

```javascript
// src/components/Button/Button.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Button from './Button';

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });

  it('applies correct variant class', () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByText('Click me')).toHaveClass('btn-primary');
  });
});
```

### Hook Tests

```javascript
// src/hooks/useDebounce.test.js
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useDebounce } from './useCustomHooks';

describe('useDebounce', () => {
  it('debounces value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    expect(result.current).toBe('initial');

    // Update value
    rerender({ value: 'updated', delay: 500 });
    
    // Value should not change immediately
    expect(result.current).toBe('initial');

    // Wait for debounce
    await waitFor(() => {
      expect(result.current).toBe('updated');
    }, { timeout: 600 });
  });
});
```

### API Tests with MSW

```javascript
// src/test/mocks/handlers.js
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/members', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        members: [
          { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
          { id: 2, first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' },
        ],
        total: 2,
      })
    );
  }),

  rest.post('/api/members', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        id: 3,
        ...req.body,
      })
    );
  }),

  rest.delete('/api/members/:id', (req, res, ctx) => {
    return res(ctx.status(204));
  }),
];

// src/test/mocks/server.js
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

```javascript
// src/test/setup.js (add to existing file)
import { server } from './mocks/server';
import { beforeAll, afterAll, afterEach } from 'vitest';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Integration Tests

```javascript
// src/pages/Members.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import Members from './Members';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('Members Page', () => {
  it('displays members list', async () => {
    render(<Members />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    render(<Members />, { wrapper: createWrapper() });
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
```

### Utility Function Tests

```javascript
// src/lib/validation.test.js
import { describe, it, expect } from 'vitest';
import { validateEmail, validatePhone } from './validation';

describe('validateEmail', () => {
  it('validates correct email', () => {
    const result = validateEmail('test@example.com');
    expect(result.isValid).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = validateEmail('invalid-email');
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects empty email', () => {
    const result = validateEmail('');
    expect(result.isValid).toBe(false);
  });
});

describe('validatePhone', () => {
  it('validates Australian mobile number', () => {
    const result = validatePhone('0412345678');
    expect(result.isValid).toBe(true);
  });

  it('rejects invalid phone number', () => {
    const result = validatePhone('123');
    expect(result.isValid).toBe(false);
  });
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- src/components/Button/Button.test.jsx

# Run tests matching pattern
npm test -- --grep "Button"
```

## Test Coverage

Aim for:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

View coverage report:
```bash
npm test -- --coverage
open coverage/index.html
```

## Testing Best Practices

### 1. Test User Behavior, Not Implementation

```javascript
// ❌ Bad - testing implementation
expect(component.state.count).toBe(1);

// ✅ Good - testing behavior
expect(screen.getByText('Count: 1')).toBeInTheDocument();
```

### 2. Use Accessible Queries

```javascript
// ❌ Bad
screen.getByTestId('submit-button');

// ✅ Good
screen.getByRole('button', { name: /submit/i });
```

### 3. Test Edge Cases

```javascript
describe('Input', () => {
  it('handles empty value', () => {
    // Test with empty string
  });

  it('handles very long value', () => {
    // Test with 1000+ characters
  });

  it('handles special characters', () => {
    // Test with special chars
  });
});
```

### 4. Mock External Dependencies

```javascript
import { vi } from 'vitest';

vi.mock('./lib/api', () => ({
  membersApi: {
    getAll: vi.fn(() => Promise.resolve([])),
  },
}));
```

### 5. Clean Up After Tests

```javascript
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
```

## E2E Testing with Playwright

### Install Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

### Configure Playwright

Create `playwright.config.js`:

```javascript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});
```

### Write E2E Tests

```javascript
// e2e/login.spec.js
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/login');

  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});

test('shows error on invalid credentials', async ({ page }) => {
  await page.goto('/login');

  await page.fill('input[name="email"]', 'wrong@example.com');
  await page.fill('input[name="password"]', 'wrongpassword');
  await page.click('button[type="submit"]');

  await expect(page.locator('.error')).toBeVisible();
});
```

### Run E2E Tests

```bash
# Run all E2E tests
npx playwright test

# Run in headed mode
npx playwright test --headed

# Run specific test
npx playwright test e2e/login.spec.js

# Debug test
npx playwright test --debug
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v2
        with:
          files: ./coverage/coverage-final.json
```

## Debugging Tests

### Using VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test", "--", "--run"],
  "console": "integratedTerminal"
}
```

### Using Browser DevTools

```javascript
import { screen } from '@testing-library/react';

// Add debugger statement
debugger;

// Or use screen.debug()
screen.debug();
```

## Common Testing Patterns

### Testing Forms

```javascript
it('submits form with valid data', async () => {
  const handleSubmit = vi.fn();
  render(<MemberForm onSubmit={handleSubmit} />);

  await userEvent.type(screen.getByLabelText(/first name/i), 'John');
  await userEvent.type(screen.getByLabelText(/last name/i), 'Doe');
  await userEvent.type(screen.getByLabelText(/email/i), 'john@example.com');
  
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));

  await waitFor(() => {
    expect(handleSubmit).toHaveBeenCalledWith({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    });
  });
});
```

### Testing Async Operations

```javascript
it('loads and displays data', async () => {
  render(<MembersList />);

  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
});
```

### Testing Error States

```javascript
it('displays error message on failure', async () => {
  server.use(
    rest.get('/api/members', (req, res, ctx) => {
      return res(ctx.status(500));
    })
  );

  render(<MembersList />);

  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [MSW Documentation](https://mswjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
