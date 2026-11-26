import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RoboticCore } from './RoboticCore';
import { useCoreTheme } from './CoreThemeProvider';
export function StickyCore() {
  const [visible, setVisible] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const { t, reduced, compact } = useCoreTheme();
  useEffect(() => {
    const hero = document.getElementById('home');
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.intersectionRatio < 0.01 && entry.boundingClientRect.top < 0),
      { threshold: 0.01, rootMargin: '-100px 0px 0px 0px' },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!compact) return;
    const footer = document.querySelector('.footer');
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting));
    observer.observe(footer);
    return () => observer.disconnect();
  }, [compact]);
  if (compact && footerVisible) return null;
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          className="sticky-core"
          aria-label={t.top}
          title={t.top}
          onClick={() => window.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' })}
          initial={{ opacity: 0, y: reduced ? 0 : 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : 30 }}
        >
          <RoboticCore compact />
          <span aria-hidden="true">↑</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
