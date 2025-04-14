import { createPortal } from 'react-dom';

type Props = {
	container: Element | DocumentFragment;
	children: React.ReactNode;
};

export function Portal({ container, children }: Props) {
	if (!container) {
		return null;
	}

	return createPortal(children, container);
}
