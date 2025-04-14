import invariant from 'tiny-invariant';
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { App } from './renderer/app';

const root = document.getElementById('root');
invariant(root, 'Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
