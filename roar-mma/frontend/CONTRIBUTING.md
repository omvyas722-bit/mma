# Contributing to ROAR MMA Frontend

Thank you for your interest in contributing to the ROAR MMA Management System!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/roar-mma.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Install dependencies: `npm install`
5. Start the dev server: `npm run dev`

## Development Guidelines

### Code Style

- Use functional components with React hooks
- Follow ESLint rules (run `npm run lint`)
- Use Tailwind CSS for styling
- Keep components small and focused (< 200 lines)
- Extract reusable logic into custom hooks
- Use meaningful variable and function names

### Component Structure

```jsx
// Component file structure
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export default function MyComponent({ prop1, prop2 }) {
  // 1. Hooks
  const [state, setState] = useState(initialValue);
  
  // 2. Queries/Mutations
  const { data, isLoading } = useQuery({
    queryKey: ['key'],
    queryFn: fetchFunction,
  });
  
  // 3. Effects
  useEffect(() => {
    // Effect logic
  }, [dependencies]);
  
  // 4. Event handlers
  const handleClick = () => {
    // Handler logic
  };
  
  // 5. Render logic
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### Naming Conventions

- **Components**: PascalCase (e.g., `MemberCard`, `AddMemberModal`)
- **Files**: PascalCase for components (e.g., `MemberCard.jsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useMembers`, `useAuth`)
- **Utilities**: camelCase (e.g., `formatDate`, `validateEmail`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`, `MAX_FILE_SIZE`)

### Commit Messages

Follow the Conventional Commits specification:

- `feat: add member search functionality`
- `fix: resolve login redirect issue`
- `docs: update API documentation`
- `style: format code with prettier`
- `refactor: simplify member validation logic`
- `test: add tests for payment processing`
- `chore: update dependencies`

### Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass: `npm test`
4. Run linter: `npm run lint`
5. Update CHANGELOG.md
6. Create a pull request with a clear description
7. Link related issues
8. Request review from maintainers

### Testing

- Write unit tests for utility functions
- Write integration tests for complex components
- Test edge cases and error scenarios
- Aim for >80% code coverage

### Accessibility

- Use semantic HTML elements
- Add ARIA labels where needed
- Ensure keyboard navigation works
- Test with screen readers
- Maintain color contrast ratios (WCAG AA)

### Performance

- Avoid unnecessary re-renders
- Use React.memo for expensive components
- Implement code splitting for large features
- Optimize images and assets
- Use lazy loading where appropriate

## Project Structure

- `src/components/` - Reusable UI components
- `src/pages/` - Page-level components
- `src/contexts/` - React context providers
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions and helpers
- `src/styles/` - Global styles

## Adding New Features

### Adding a New Page

1. Create page component in `src/pages/`
2. Add route in `src/App.jsx`
3. Add navigation link in `src/components/Layout/index.jsx`
4. Update documentation

### Adding a New Component

1. Create component directory in `src/components/`
2. Create `index.jsx` with component code
3. Export component
4. Add usage examples in comments
5. Update component documentation

### Adding a New API Endpoint

1. Add endpoint function in `src/lib/api.js`
2. Create React Query hook if needed
3. Update API documentation
4. Add error handling

## Code Review Checklist

- [ ] Code follows project style guidelines
- [ ] No console.log statements (use logger instead)
- [ ] Error handling implemented
- [ ] Loading states handled
- [ ] Empty states handled
- [ ] Responsive design works
- [ ] Dark mode works
- [ ] Accessibility requirements met
- [ ] No hardcoded values (use constants)
- [ ] Comments added for complex logic
- [ ] Tests added/updated
- [ ] Documentation updated

## Common Issues

### Import Errors

Use absolute imports from `src/`:
```jsx
import api from '../lib/api';  // ✗ Avoid
import api from '@/lib/api';   // ✓ Better (if configured)
```

### State Management

Use React Query for server state, Context for global UI state, and local state for component-specific state.

### Styling

Use Tailwind utility classes. Avoid inline styles unless absolutely necessary.

## Getting Help

- Check existing documentation
- Search closed issues
- Ask in team chat
- Create a discussion thread

## License

By contributing, you agree that your contributions will be licensed under the project's license.

## Questions?

Contact the development team or open an issue for clarification.
