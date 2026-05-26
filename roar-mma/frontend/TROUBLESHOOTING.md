# ROAR MMA Frontend - Troubleshooting Guide

## Common Issues and Solutions

### Installation Issues

#### npm install fails

**Problem**: Dependencies fail to install

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Delete lock file and node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install

# If still failing, try with legacy peer deps
npm install --legacy-peer-deps
```

#### Node version mismatch

**Problem**: "Unsupported engine" error

**Solution**:
```bash
# Check your Node version
node --version

# Should be 18.x or higher
# Install correct version using nvm:
nvm install 18
nvm use 18
```

### Development Server Issues

#### Port 5173 already in use

**Problem**: "Port 5173 is already in use"

**Solutions**:
```bash
# Option 1: Kill the process using the port
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:5173 | xargs kill -9

# Option 2: Use a different port
npm run dev -- --port 3000
```

#### Hot reload not working

**Problem**: Changes don't reflect in browser

**Solutions**:
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Restart dev server
4. Check if file is being watched:
   ```bash
   # Increase file watchers (Linux)
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

#### Blank page on load

**Problem**: App shows blank page

**Solutions**:
1. Check browser console for errors
2. Verify API connection
3. Check if JavaScript is enabled
4. Clear browser cache and cookies
5. Try incognito/private mode

### API Connection Issues

#### CORS errors

**Problem**: "Access-Control-Allow-Origin" error

**Solutions**:
1. Verify backend CORS configuration allows frontend origin
2. Check VITE_API_URL in .env matches backend URL
3. Ensure backend is running
4. Backend CORS config should include:
   ```javascript
   app.use(cors({
     origin: 'http://localhost:5173',
     credentials: true
   }));
   ```

#### Network errors

**Problem**: "Network Error" or "Failed to fetch"

**Solutions**:
1. Verify backend is running: `curl http://localhost:3001/health`
2. Check VITE_API_URL in .env
3. Check firewall settings
4. Verify no proxy issues
5. Check browser network tab for details

#### 401 Unauthorized errors

**Problem**: API returns 401 status

**Solutions**:
1. Clear localStorage and login again
2. Check if token is expired
3. Verify token is being sent in headers
4. Check backend authentication middleware

#### 404 Not Found errors

**Problem**: API endpoints return 404

**Solutions**:
1. Verify API endpoint URLs match backend routes
2. Check for typos in endpoint paths
3. Ensure backend routes are registered
4. Check API version compatibility

### Build Issues

#### Build fails with memory error

**Problem**: "JavaScript heap out of memory"

**Solution**:
```bash
# Increase Node memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Or add to package.json scripts:
"build": "NODE_OPTIONS='--max-old-space-size=4096' vite build"
```

#### Build succeeds but app doesn't work

**Problem**: Production build has errors

**Solutions**:
1. Test production build locally:
   ```bash
   npm run build
   npm run preview
   ```
2. Check browser console for errors
3. Verify environment variables are set
4. Check if assets are loading (network tab)
5. Ensure base URL is correct in vite.config.js

#### CSS not loading

**Problem**: Styles missing in production

**Solutions**:
1. Verify Tailwind is configured correctly
2. Check PostCSS configuration
3. Ensure CSS files are imported
4. Clear build cache: `rm -rf dist node_modules/.vite`

### Authentication Issues

#### Can't login

**Problem**: Login fails with valid credentials

**Solutions**:
1. Check backend is running
2. Verify API URL is correct
3. Check browser console for errors
4. Verify credentials in backend database
5. Check if backend authentication endpoint works:
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"owner@roarmma.com.au","password":"admin123"}'
   ```

#### Logged out unexpectedly

**Problem**: Session expires too quickly

**Solutions**:
1. Check token expiration time in backend
2. Implement token refresh mechanism
3. Increase session timeout
4. Check for token storage issues

#### Infinite redirect loop

**Problem**: App keeps redirecting between login and dashboard

**Solutions**:
1. Check AuthContext logic
2. Verify token validation
3. Clear localStorage and cookies
4. Check protected route configuration

### Component Issues

#### Modal not closing

**Problem**: Modal stays open when clicking outside

**Solutions**:
1. Check if onClose prop is passed
2. Verify click outside handler is working
3. Check z-index conflicts
4. Inspect event propagation

#### Form not submitting

**Problem**: Form submit doesn't work

**Solutions**:
1. Check if form has onSubmit handler
2. Verify preventDefault is called
3. Check validation logic
4. Inspect browser console for errors
5. Check if button type is "submit"

#### Dropdown not opening

**Problem**: Dropdown menu doesn't appear

**Solutions**:
1. Check z-index values
2. Verify positioning (absolute/relative)
3. Check if overflow is hidden on parent
4. Inspect click handler

### Performance Issues

#### Slow page load

**Problem**: App takes long to load

**Solutions**:
1. Check bundle size: `npm run build -- --analyze`
2. Implement code splitting
3. Lazy load components
4. Optimize images
5. Enable compression on server
6. Use CDN for static assets

#### Slow rendering

**Problem**: UI feels sluggish

**Solutions**:
1. Use React DevTools Profiler
2. Memoize expensive components
3. Use useMemo for expensive calculations
4. Implement virtualization for long lists
5. Reduce re-renders with useCallback

#### Memory leaks

**Problem**: Memory usage keeps increasing

**Solutions**:
1. Clean up useEffect subscriptions
2. Cancel pending requests on unmount
3. Remove event listeners
4. Clear intervals/timeouts
5. Use React DevTools to find leaks

### Data Issues

#### Data not loading

**Problem**: Components show loading state forever

**Solutions**:
1. Check API response in network tab
2. Verify React Query configuration
3. Check if queryKey is correct
4. Inspect error state
5. Verify data transformation logic

#### Stale data

**Problem**: Data doesn't update after mutation

**Solutions**:
1. Invalidate queries after mutation:
   ```javascript
   queryClient.invalidateQueries(['members']);
   ```
2. Use optimistic updates
3. Check cache time settings
4. Verify refetch logic

#### Duplicate requests

**Problem**: Same API called multiple times

**Solutions**:
1. Check if component renders multiple times
2. Use React Query's deduplication
3. Implement request cancellation
4. Check useEffect dependencies

### Styling Issues

#### Tailwind classes not working

**Problem**: Tailwind styles not applied

**Solutions**:
1. Verify Tailwind is configured
2. Check if class names are correct
3. Ensure content paths include all files
4. Restart dev server
5. Check for class name conflicts

#### Dark mode not working

**Problem**: Dark mode styles not applied

**Solutions**:
1. Check ThemeContext implementation
2. Verify dark: prefix in classes
3. Check if darkMode is enabled in tailwind.config.js
4. Inspect HTML class attribute

#### Responsive design broken

**Problem**: Mobile layout doesn't work

**Solutions**:
1. Check viewport meta tag in index.html
2. Verify responsive classes (sm:, md:, lg:)
3. Test in browser dev tools
4. Check for fixed widths
5. Inspect media queries

### Browser-Specific Issues

#### Works in Chrome but not Safari

**Solutions**:
1. Check for unsupported JavaScript features
2. Add polyfills if needed
3. Test with Safari dev tools
4. Check CSS compatibility

#### Works in Firefox but not Edge

**Solutions**:
1. Check for browser-specific APIs
2. Add vendor prefixes
3. Test with Edge dev tools
4. Check for ES6+ features

### Deployment Issues

#### 404 on page refresh

**Problem**: Direct URLs return 404

**Solution**:
Configure server for SPA routing (see DEPLOYMENT.md)

#### Environment variables not working

**Problem**: VITE_* variables undefined

**Solutions**:
1. Ensure variables start with VITE_
2. Restart dev server after changing .env
3. Check if .env is in .gitignore
4. Verify variables are set in hosting platform

#### Assets not loading

**Problem**: Images/fonts return 404

**Solutions**:
1. Check asset paths (use relative paths)
2. Verify public folder structure
3. Check base URL in vite.config.js
4. Ensure assets are included in build

## Getting More Help

### Debug Mode

Enable debug logging:
```javascript
import logger from './lib/logger';
logger.setLevel('DEBUG');
```

### Browser DevTools

1. **Console**: Check for JavaScript errors
2. **Network**: Inspect API calls
3. **Application**: Check localStorage/cookies
4. **Performance**: Profile rendering
5. **React DevTools**: Inspect component tree

### Useful Commands

```bash
# Check for outdated packages
npm outdated

# Update packages
npm update

# Audit for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Clear all caches
npm cache clean --force
rm -rf node_modules/.vite
rm -rf dist
```

### Still Stuck?

1. Search closed issues on GitHub
2. Check Stack Overflow
3. Ask in team chat
4. Create a detailed bug report
5. Contact support: support@roarmma.com.au

## Reporting Bugs

When reporting issues, include:

1. **Environment**:
   - Node version
   - npm version
   - OS and version
   - Browser and version

2. **Steps to reproduce**:
   - What you did
   - What you expected
   - What actually happened

3. **Error messages**:
   - Console errors
   - Network errors
   - Stack traces

4. **Screenshots/videos** if applicable

5. **Code samples** if relevant

---

**Remember**: Most issues have been encountered before. Search first, then ask!
