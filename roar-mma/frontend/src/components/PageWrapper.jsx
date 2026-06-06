import { useEffect } from 'react';
import { PageErrorBoundary } from './Shared/ErrorBoundary';

export default function PageWrapper({ title, children }) {
  useEffect(() => {
    if (title) {
      document.title = `${title} | Mixed Martial Arts`;
    }
  }, [title]);

  return (
    <PageErrorBoundary pageName={title || 'Page'}>
      {children}
    </PageErrorBoundary>
  );
}
