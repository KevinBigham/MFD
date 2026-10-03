import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import '@mfd/design-system/tokens';
import './app/a11y.css';
import { recoverIncompleteCombinedImport } from './lib/combined-import-journal';
import { useUiStore } from './app/store/ui-store';
import { applyTextSize } from './lib/text-size';

// Apply the saved text size before anything renders, and keep <html> in sync with Settings.
applyTextSize(useUiStore.getState().textSize);
useUiStore.subscribe((state, previous) => {
  if (state.textSize !== previous.textSize) applyTextSize(state.textSize);
});

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
