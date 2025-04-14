// Styles
import './app.css';
import '@xterm/xterm/css/xterm.css';

// Icons and React utilities
import { LogsIcon } from 'lucide-react';
import { Fragment, useRef, useState } from 'react';

// Custom components
import { ThemeSelector } from './theme-selector';
import { Xterm } from './xterm';

export function App() {
	// DOM reference for buttons rendering
	const portalEl = useRef(null);

	// User setting: whether to set terminal log colors by name
	const [sortedColors, setSortedColors] = useState(
		JSON.parse(window.localStorage.getItem('sortedColors') || 'false'),
	);

	return (
		<div className="h-screen w-screen overflow-hidden">
			{/* Tab layout container */}
			<div className="tabs tabs-lift flex rounded-none pt-1 bg-base-300 relative w-full h-[calc(100%-10vh)]">
				{/* Placeholder div for alignment/styling */}
				<div className="title-bar min-w-50 grow" />

				{/* One tab + terminal per command */}
				{window.api.terminals.map((terminal) => (
					<Fragment key={terminal.id}>
						<input
							type="radio"
							name="tab"
							className="tab border-none"
							aria-label={terminal.name}
						/>
						<div className="tab-content size-full border-none bg-base-100 border-base-300 p-6 rounded-none">
							<Xterm terminals={[terminal]} portalEl={portalEl} />
						</div>
					</Fragment>
				))}

				{/* Global "All" tab that aggregates all terminal logs */}
				<label className="tab border-none mr-1">
					<input type="radio" name="tab" defaultChecked />
					<LogsIcon size={15} className="mr-1" />
					All
				</label>
				<div className="tab-content size-full border-none bg-base-100 border-base-300 p-6 rounded-none">
					<Xterm
						terminals={window.api.terminals} // All terminals passed in
						portalEl={portalEl}
						sortedColors={sortedColors}
						setSortedColors={setSortedColors}
						aggregated // Special behavior for global log view
					/>
				</div>
			</div>

			{/* Bottom bar with theme selector and portal mount point */}
			<div className="flex py-1 justify-between items-center bg-base-300 px-2 h-auto absolute bottom-0 w-full">
				<div ref={portalEl} />
				<ThemeSelector />
			</div>
		</div>
	);
}
