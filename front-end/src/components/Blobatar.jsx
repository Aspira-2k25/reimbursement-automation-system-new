import { useEffect, useRef, useState } from 'react';
import { Blobatar as Avatar } from '@blobatar/react';
import { gaze } from 'blobatar/gaze';
import { idle, happy, sad, mad, surprised, wink, sleepy, smug, unsure, scared, love, shy, sick, thinking } from 'blobatar/expression';
import 'blobatar/motion.css';
import 'blobatar/gaze.css';
import './Blobatar.css';

const reactions = { idle, happy, sad, mad, surprised, wink, sleepy, smug, unsure, scared, love, shy, sick, thinking };
const names = Object.keys(reactions).filter(name => name !== 'idle');
const traits = { shape: 0.25 };
export default function Blobatar() {
  const [reaction, setReaction] = useState('idle');
  const host = useRef(null);
  const resetTimer = useRef(null);
  const nextReaction = useRef(0);
  useEffect(() => () => clearTimeout(resetTimer.current), []);
  useEffect(() => {
    const element = host.current;
    const svg = element.querySelector('svg');
    let visible = false, driver = null;
    svg.style.setProperty('--mo-track-travel', '3px');
    const sync = () => {
      const active = visible && !document.hidden;
      element.dataset.active = String(active);
      if (active && !driver) driver = gaze(svg, { target: 'pointer' });
      if (!active && driver) { driver.stop(); driver = null; }
    };
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); });
    observer.observe(element);
    document.addEventListener('visibilitychange', sync);
    return () => {
      observer.disconnect(); document.removeEventListener('visibilitychange', sync);
      driver?.stop();
    };
  }, [reaction]);
  const cycle = () => {
    clearTimeout(resetTimer.current);
    setReaction(names[nextReaction.current]);
    nextReaction.current = (nextReaction.current + 1) % names.length;
    resetTimer.current = setTimeout(() => setReaction('idle'), 1800);
  };
  return <div ref={host} className="blobatar" data-reaction={reaction} data-active="false">
    <div className="blobatar-halo" aria-hidden="true" />
    <button type="button" className="blobatar-character" onClick={cycle}
      aria-label={`Blobatar feeling ${reaction}. Activate for another reaction.`}>
      <Avatar name="apsit-reimbursement-companion" hue={157} tone={0.55} traits={traits}
        animate="always" expression={reactions[reaction]} aria-hidden="true" />
    </button>
    <div className="blobatar-caption"><span className="blobatar-badge">Your reimbursement companion</span>
      <p>Follow my eyes. Tap for a reaction.</p>
    </div>
  </div>;
}
