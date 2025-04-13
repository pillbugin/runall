import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import invariant from 'tiny-invariant';

const root = document.getElementById('root');
invariant(root, 'Root element not found');

createRoot(root).render(
  <StrictMode>
    Olá, react!
  </StrictMode>,
);
