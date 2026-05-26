# ROAR MMA Frontend - Security Guide

## Security Best Practices

### 1. Authentication & Authorization

#### Secure Token Storage

```javascript
// ✅ Store tokens in httpOnly cookies (backend sets)
// ✅ Or use secure localStorage with encryption

// ❌ Never store tokens in:
// - Regular cookies without httpOnly flag
// - URL parameters
// - Local storage without encryption (for sensitive apps)
```

#### Token Refresh

```javascript
// Implement automatic token refresh
const refreshToken = async () => {
  try {
    const response = await api.post('/auth/refresh');
    const { token } = response.data;
    localStorage.setItem('token', token);
    return token;
  } catch (error) {
    // Redirect to login
    window.location.href = '/login';
  }
};
```

#### Protected Routes

```javascript
// Always verify authentication on protected routes
function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" />;

  return children;
}
```

### 2. XSS Prevention

#### Sanitize User Input

```javascript
// ✅ React automatically escapes content
<div>{userInput}</div>

// ❌ Dangerous - avoid dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ If you must use HTML, sanitize it first
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

#### Content Security Policy

Add to `index.html`:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: https:; 
               font-src 'self' data:;">
```

### 3. CSRF Protection

```javascript
// Include CSRF token in requests
axios.defaults.headers.common['X-CSRF-Token'] = getCsrfToken();

// Backend should validate CSRF token
```

### 4. Secure API Communication

#### Always Use HTTPS

```javascript
// ✅ Production API URL
const API_URL = 'https://api.roarmma.com.au';

// ❌ Never use HTTP in production
const API_URL = 'http://api.roarmma.com.au';
```

#### Validate SSL Certificates

```javascript
// Axios automatically validates SSL certificates
// Don't disable SSL verification in production
```

### 5. Input Validation

#### Client-Side Validation

```javascript
import { validateEmail, validatePhone } from './lib/validation';

const validateForm = (data) => {
  const errors = {};

  // Email validation
  const emailResult = validateEmail(data.email);
  if (!emailResult.isValid) {
    errors.email = emailResult.error;
  }

  // Phone validation
  const phoneResult = validatePhone(data.phone);
  if (!phoneResult.isValid) {
    errors.phone = phoneResult.error;
  }

  // Sanitize strings
  data.name = data.name.trim();
  
  return errors;
};
```

#### Server-Side Validation

```javascript
// ⚠️ Always validate on server-side too
// Client-side validation can be bypassed
```

### 6. Sensitive Data Handling

#### Never Log Sensitive Data

```javascript
// ❌ Bad
console.log('User password:', password);
console.log('Credit card:', cardNumber);

// ✅ Good
console.log('User authenticated');
console.log('Payment processed');
```

#### Mask Sensitive Information

```javascript
const maskEmail = (email) => {
  const [name, domain] = email.split('@');
  return `${name.substring(0, 2)}***@${domain}`;
};

const maskPhone = (phone) => {
  return phone.replace(/(\d{4})\d{4}(\d{2})/, '$1****$2');
};
```

### 7. File Upload Security

```javascript
const validateFile = (file) => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type');
  }

  // Check file size (5MB max)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File too large');
  }

  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
  const extension = file.name.toLowerCase().match(/\.[^.]*$/)?.[0];
  if (!allowedExtensions.includes(extension)) {
    throw new Error('Invalid file extension');
  }

  return true;
};
```

### 8. Dependency Security

#### Regular Updates

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update
```

#### Use Dependabot

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

### 9. Environment Variables

#### Secure Configuration

```javascript
// ✅ Use environment variables for sensitive config
const API_URL = import.meta.env.VITE_API_URL;

// ❌ Never commit sensitive data
const API_KEY = 'hardcoded-api-key'; // DON'T DO THIS
```

#### .env.example

```env
# Public variables (safe to expose)
VITE_API_URL=https://api.example.com
VITE_APP_NAME=ROAR MMA

# Never commit actual values for:
# - API keys
# - Secrets
# - Passwords
# - Private keys
```

### 10. Rate Limiting

```javascript
// Implement client-side rate limiting
import { throttle } from 'lodash';

const handleSearch = throttle((query) => {
  searchApi(query);
}, 1000);
```

### 11. Error Handling

#### Don't Expose Sensitive Information

```javascript
// ❌ Bad - exposes internal details
catch (error) {
  alert(`Database error: ${error.message}`);
}

// ✅ Good - generic message
catch (error) {
  console.error('Error:', error); // Log for debugging
  alert('An error occurred. Please try again.');
}
```

### 12. Session Management

```javascript
// Implement session timeout
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

let sessionTimer;

const resetSessionTimer = () => {
  clearTimeout(sessionTimer);
  sessionTimer = setTimeout(() => {
    logout();
    alert('Session expired. Please login again.');
  }, SESSION_TIMEOUT);
};

// Reset timer on user activity
document.addEventListener('click', resetSessionTimer);
document.addEventListener('keypress', resetSessionTimer);
```

### 13. Secure Headers

Configure server to send security headers:

```nginx
# Nginx configuration
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

### 14. Third-Party Scripts

```javascript
// ✅ Use Subresource Integrity (SRI)
<script 
  src="https://cdn.example.com/library.js"
  integrity="sha384-..."
  crossorigin="anonymous"
></script>

// ⚠️ Be cautious with third-party scripts
// - Only use trusted sources
// - Review what data they access
// - Use SRI when possible
```

### 15. Logging & Monitoring

```javascript
// Implement security event logging
const logSecurityEvent = (event, details) => {
  // Send to logging service
  logger.security({
    event,
    details,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    ip: '...' // Get from backend
  });
};

// Log important security events
logSecurityEvent('login_attempt', { email });
logSecurityEvent('password_change', { userId });
logSecurityEvent('permission_denied', { resource });
```

## Security Checklist

### Development

- [ ] All user input is validated
- [ ] Sensitive data is not logged
- [ ] No hardcoded secrets in code
- [ ] Dependencies are up to date
- [ ] HTTPS is enforced
- [ ] Authentication is implemented correctly
- [ ] Authorization checks are in place
- [ ] CSRF protection is enabled
- [ ] XSS prevention measures are in place
- [ ] File uploads are validated

### Deployment

- [ ] Environment variables are configured
- [ ] SSL certificate is valid
- [ ] Security headers are set
- [ ] CSP is configured
- [ ] Rate limiting is enabled
- [ ] Error messages don't expose sensitive info
- [ ] Logging is configured
- [ ] Monitoring is set up
- [ ] Backup strategy is in place
- [ ] Incident response plan exists

### Ongoing

- [ ] Regular security audits
- [ ] Dependency updates
- [ ] Security patches applied promptly
- [ ] Access logs reviewed
- [ ] User permissions audited
- [ ] Penetration testing performed
- [ ] Security training for team

## Common Vulnerabilities

### 1. Broken Authentication

**Risk**: Unauthorized access to user accounts

**Prevention**:
- Use strong password requirements
- Implement MFA
- Use secure session management
- Implement account lockout after failed attempts

### 2. Sensitive Data Exposure

**Risk**: Leaking sensitive information

**Prevention**:
- Encrypt data in transit (HTTPS)
- Encrypt sensitive data at rest
- Don't log sensitive data
- Mask sensitive information in UI

### 3. Injection Attacks

**Risk**: SQL injection, XSS, command injection

**Prevention**:
- Validate and sanitize all input
- Use parameterized queries (backend)
- Escape output
- Use Content Security Policy

### 4. Broken Access Control

**Risk**: Users accessing unauthorized resources

**Prevention**:
- Implement proper authorization checks
- Use role-based access control
- Verify permissions on every request
- Don't rely on client-side checks alone

### 5. Security Misconfiguration

**Risk**: Exposed admin interfaces, default credentials

**Prevention**:
- Remove default accounts
- Disable unnecessary features
- Keep software updated
- Use security headers

## Incident Response

### If a Security Breach Occurs

1. **Contain**: Isolate affected systems
2. **Assess**: Determine scope and impact
3. **Notify**: Inform stakeholders and users
4. **Remediate**: Fix the vulnerability
5. **Review**: Analyze what went wrong
6. **Improve**: Update security measures

### Contact

Security issues should be reported to: security@roarmma.com.au

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [React Security Best Practices](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)
- [Web Security Guidelines](https://developer.mozilla.org/en-US/docs/Web/Security)
- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)
