import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import invariant from 'tiny-invariant';
import { App } from './renderer/app';

const root = document.getElementById('root');
invariant(root, 'Root element not found');

createRoot(root).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
