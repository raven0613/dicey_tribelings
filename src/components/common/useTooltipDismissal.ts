import { useLayoutEffect, type RefObject } from 'react';

const coveringLayers = '.modal-overlay, .preparation-panel-viewport, .story-overlay, dialog[open], [aria-modal="true"]';
const inactive = '[inert], [hidden], [aria-hidden="true"]';

/** A portal must close when its source loses its place in the active interface. */
export function useTooltipDismissal(source: HTMLElement | null, dismiss: () => void, panel?: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    if (!source) return;
    const root = source.closest('#game-stage') ?? document.body;
    const unavailable = () => !source.isConnected || Boolean(source.closest(inactive))
      || !source.getClientRects().length || getComputedStyle(source).visibility !== 'visible';
    const layers = () => new Set([...root.querySelectorAll<HTMLElement>(coveringLayers)]
      .filter(layer => !layer.closest(inactive) && layer.getClientRects().length > 0));
    if (unavailable()) { dismiss(); return; }
    let previousLayers = layers();
    const observer = new MutationObserver(records => {
      const relevant = records.some(record => record.type === 'childList'
        || record.target instanceof Element && (record.target.contains(source) || record.target.matches(coveringLayers)));
      if (!relevant) return;
      const currentLayers = layers();
      if (unavailable() || [...currentLayers].some(layer => !previousLayers.has(layer) && !layer.contains(source))) dismiss();
      previousLayers = currentLayers;
    });
    observer.observe(root, { subtree: true, childList: true, attributes: true,
      attributeFilter: ['inert', 'hidden', 'aria-hidden', 'aria-modal', 'open', 'class', 'style'] });
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss(); };
    const scroll = (event: Event) => {
      if (event.target instanceof Node && panel?.current?.contains(event.target)) return;
      dismiss();
    };
    window.addEventListener('keydown', escape);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', scroll, true);
    window.addEventListener('blur', dismiss);
    return () => {
      observer.disconnect();
      window.removeEventListener('keydown', escape);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', scroll, true);
      window.removeEventListener('blur', dismiss);
    };
  }, [source, dismiss, panel]);
}
