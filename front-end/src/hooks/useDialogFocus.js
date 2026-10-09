import { useEffect } from 'react';

// Keep keyboard focus in the visible dialog and return it to its trigger.
export default function useDialogFocus() {
  useEffect(() => {
    let active = null;
    let trigger = null;
    const visible = element => element.getClientRects().length && !element.disabled;
    const controls = dialog => [...dialog.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')].filter(visible);
    const synchronize = () => {
      const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(visible);
      const next = dialogs.at(-1) || null;
      if (next === active) return;
      if (active && !next && trigger?.isConnected) trigger.focus();
      if (next) {
        trigger = document.activeElement;
        next.tabIndex = -1;
        (controls(next)[0] || next).focus();
      }
      active = next;
    };
    const onKey = event => {
      if (!active) return;
      const items = controls(active);
      if (event.key === 'Escape') {
        const close = items.find(item => /^(close|cancel|back)$/i.test(item.getAttribute('aria-label') || item.title || item.textContent.trim()));
        if (close) { event.preventDefault(); close.click(); }
      }
      if (event.key === 'Tab') {
        const index = items.indexOf(document.activeElement);
        if (!items.length) { event.preventDefault(); active.focus(); }
        else if (event.shiftKey && index <= 0) { event.preventDefault(); items.at(-1).focus(); }
        else if (!event.shiftKey && (index === items.length - 1 || index < 0)) { event.preventDefault(); items[0].focus(); }
      }
    };
    const observer = new MutationObserver(synchronize);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('keydown', onKey);
    synchronize();
    return () => { observer.disconnect(); document.removeEventListener('keydown', onKey); };
  }, []);
}
