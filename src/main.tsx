import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider } from 'convex/react'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './ErrorBoundary.tsx'
import { convexClient } from './convexClient.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ConvexProvider client={convexClient}>
        <App />
      </ConvexProvider>
    </ErrorBoundary>
  </StrictMode>,
)

// ============================================================================
// DO NOT REMOVE: Debug infrastructure for parent window communication
// This forwards console logs, errors, and HMR events to the parent IDE.
// Without this, the agent's getBrowserLog tool will not work.
// ============================================================================
if (typeof window !== 'undefined' && window.parent !== window) {
  // Forward console messages to parent
  const originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  const forwardToParent = (level: string, ...args: unknown[]) => {
    try {
      window.parent.postMessage({
        type: 'IFRAME_CONSOLE',
        level,
        message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
      }, '*');
    } catch {}
  };

  console.log = (...args) => { originalConsole.log(...args); forwardToParent('log', ...args); };
  console.warn = (...args) => { originalConsole.warn(...args); forwardToParent('warn', ...args); };
  console.error = (...args) => { originalConsole.error(...args); forwardToParent('error', ...args); };

  // Forward uncaught errors
  window.addEventListener('error', (e) => {
    window.parent.postMessage({
      type: 'IFRAME_ERROR',
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
    }, '*');
  });

  // Forward unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    window.parent.postMessage({
      type: 'IFRAME_ERROR',
      message: 'Unhandled Promise Rejection: ' + String(e.reason),
    }, '*');
  });

  // Listen for Vite HMR events
  if (import.meta.hot) {
    import.meta.hot.on('vite:beforeUpdate', () => {
      window.parent.postMessage({ type: 'VITE_HMR', event: 'beforeUpdate' }, '*');
    });
    import.meta.hot.on('vite:afterUpdate', () => {
      window.parent.postMessage({ type: 'VITE_HMR', event: 'afterUpdate' }, '*');
    });
    import.meta.hot.on('vite:error', (err) => {
      window.parent.postMessage({ type: 'VITE_HMR', event: 'error', error: err }, '*');
    });
    import.meta.hot.on('vite:ws:connect', () => {
      window.parent.postMessage({ type: 'VITE_HMR', event: 'connected' }, '*');
    });
    import.meta.hot.on('vite:ws:disconnect', () => {
      window.parent.postMessage({ type: 'VITE_HMR', event: 'disconnected' }, '*');
    });
    // Signal that HMR module is loaded
    window.parent.postMessage({ type: 'VITE_HMR', event: 'hmrModuleLoaded' }, '*');
  } else {
    window.parent.postMessage({ type: 'VITE_HMR', event: 'hmrNotAvailable' }, '*');
  }
}

// HTML Snapshot Capture for Project Thumbnails
// DO NOT REMOVE: This code enables automatic thumbnail generation
// It sends the rendered HTML to the parent window for snapshot capture
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    console.log('📸 Page loaded, will send HTML snapshot in 500ms...');
    setTimeout(() => {
      try {
        const html = document.documentElement.outerHTML;
        console.log('📸 Sending HTML snapshot to parent...', html.length, 'bytes');
        window.parent.postMessage(
          {
            type: 'HTML_SNAPSHOT',
            html: html,
          },
          '*'
        );
        console.log('✅ HTML snapshot sent!');
      } catch (e) {
        console.error('❌ Could not send HTML snapshot:', e);
      }
    }, 500); // Wait 500ms after load for rendering to complete
  });
}
