import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export default function ResponsiveSidebar({ collapsed, onCollapse, children }) {
  const [mobile, setMobile] = useState(() => matchMedia('(max-width: 767px)').matches);
  const panel = useRef(null);
  const open = mobile && !collapsed;
  useEffect(() => {
    const query = matchMedia('(max-width: 767px)');
    const change = () => { setMobile(query.matches); onCollapse(true); };
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, [onCollapse]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current.querySelector('button')?.focus();
    const key = event => {
      if (event.key === 'Escape') { event.preventDefault(); onCollapse(true); }
      if (event.key !== 'Tab') return;
      const controls = [...panel.current.querySelectorAll('button, a[href], input, select, [tabindex="0"]')].filter(node => !node.disabled && node.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); if (previous?.isConnected) previous.focus(); };
  }, [open, onCollapse]);
  return <>
    {open && <button type="button" className="mobile-drawer-backdrop" aria-label="Close navigation" onClick={() => onCollapse(true)} tabIndex={-1} />}
    <div ref={panel} className="responsive-sidebar" data-open={open} role={open ? 'dialog' : undefined} aria-modal={open ? true : undefined} aria-label={open ? 'Navigation' : undefined} inert={mobile && !open ? true : undefined}
      onClick={event => { if (mobile && event.target.closest('nav button, nav a')) onCollapse(true); }}>
      {open && <button type="button" className="mobile-drawer-close" aria-label="Close navigation" onClick={() => onCollapse(true)}><X size={20} /></button>}
      {children}
    </div>
  </>;
}
