import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import '@mfd/design-system/tokens';
import './app/a11y.css';
import { recoverIncompleteCombinedImport } from './lib/combined-import-journal';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

function renderApp(): void {
  createRoot(root!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void recoverIncompleteCombinedImport()
  .catch((error: unknown) => {
    console.error('Combined backup recovery failed; current dynasty was not hydrated.', error);
    throw error;
  })
  .then(renderApp);
