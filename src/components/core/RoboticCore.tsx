import { useId } from 'react';
import { motion } from 'motion/react';
import { usePointerTracking } from '../../hooks/usePointerTracking';
import { useCoreTheme } from './CoreThemeProvider';

export function RoboticCore({ compact = false }: { compact?: boolean }) {
  const id = useId().replace(/:/g, '');
  const { theme, switching, t } = useCoreTheme();
  const { ref, x, y, pupilScale, lid, rotate, rotateX, rotateY, reduced, active, reaction, react } =
    usePointerTracking();
  const fill = (name: string) => `url(#${id}-${name})`;
  const artwork = (
    <motion.div
      className="core-float"
      animate={active ? { y: [0, theme === 'blue' ? -10 : -5, 0] } : { y: 0 }}
      transition={{ duration: theme === 'blue' ? 4.6 : 7, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.div
        data-core-body
        className="core-body"
        style={{ rotate, rotateX, rotateY, transformPerspective: 850 }}
      >
        <svg viewBox="0 0 520 520" aria-hidden="true">
          <defs>
            <linearGradient id={`${id}-shell`} x1="0" y1="0" x2=".8" y2="1">
              <stop stopColor="#fffef5" />
              <stop offset=".75" stopColor="#dce1d9" />
              <stop offset="1" stopColor="#aab8b2" />
            </linearGradient>
            <radialGradient id={`${id}-light`}>
              <stop stopColor="#fff" />
              <stop offset=".3" stopColor="var(--core-light)" />
              <stop offset=".68" stopColor="var(--accent)" />
              <stop offset="1" stopColor="var(--accent-deep)" />
            </radialGradient>
            <filter id={`${id}-glow`} x="-70%" y="-70%" width="240%" height="240%">
              <feGaussianBlur stdDeviation="10" />
            </filter>
            <clipPath id={`${id}-face`}>
              <circle cx="260" cy="260" r="123" />
            </clipPath>
          </defs>
          <g
            className="core-handles"
            style={{
              transformOrigin: '260px 260px',
              transform: `rotate(${theme === 'blue' ? -22 : 0}deg)`,
            }}
          >
            <path
              d="M122 153 93 139q-12-7-18 7l-18 44q-5 13 8 19l34 13M398 153l29-14q12-7 18 7l18 44q5 13-8 19l-34 13"
              fill="none"
              stroke="#111b22"
              strokeWidth="17"
              strokeLinejoin="round"
            />
            <path
              d="M122 153 93 139q-12-7-18 7l-18 44q-5 13 8 19l34 13M398 153l29-14q12-7 18 7l18 44q5 13-8 19l-34 13"
              fill="none"
              stroke="#e7ece4"
              strokeWidth="9"
              strokeLinejoin="round"
            />
          </g>
          <circle cx="260" cy="267" r="190" fill="#0a141c" />
          <circle cx="260" cy="256" r="190" fill={fill('shell')} />
          <path
            d="M139 115q37-35 87-42l9 58M381 115q-37-35-87-42l-9 58M135 398q50 42 101 46l7-57M385 398q-50 42-101 46l-7-57"
            fill="none"
            stroke="#61716d"
            strokeWidth="3"
          />
          <path
            d="M115 201q-12 54 0 101M405 201q12 54 0 101"
            fill="none"
            stroke="#fafff2"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path d="M246 80h28M246 427h28" stroke="#1a292d" strokeWidth="8" strokeLinecap="round" />
          <circle cx="260" cy="256" r="143" fill="#0b1820" />
          <path d="M162 157a139 139 0 0 1 196 0" fill="none" stroke="#81928e" strokeWidth="3" />
          <circle cx="260" cy="260" r="124" fill="#03090e" />
          <g clipPath={fill('face')}>
            <motion.g data-eyelid style={{ scaleY: lid, originX: '260px', originY: '260px' }}>
              <circle cx="260" cy="260" r="112" fill="var(--accent)" opacity=".055" />
              <motion.g data-pupil style={{ x, y }}>
                <motion.g style={{ scale: pupilScale, originX: '260px', originY: '260px' }}>
                  <circle
                    cx="260"
                    cy="260"
                    r="60"
                    fill="var(--accent)"
                    opacity=".55"
                    filter={fill('glow')}
                  />
                  <motion.circle
                    cx="260"
                    cy="260"
                    fill={fill('light')}
                    initial={{ r: theme === 'blue' ? 54 : 40 }}
                    animate={{ r: theme === 'blue' ? 54 : 40 }}
                    transition={{ duration: reduced ? 0 : 0.8 }}
                  />
                  <circle cx="260" cy="260" r="21" fill="#f2fdff" />
                  <circle cx="260" cy="260" r="10" fill="#fff" />
                  <path
                    d="M238 230q22-14 42 0"
                    stroke="#fff"
                    strokeWidth="4"
                    fill="none"
                    opacity=".8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M260 195v10M260 315v10M195 260h10M315 260h10"
                    stroke="var(--accent)"
                    strokeWidth="3"
                    opacity=".9"
                  />
                </motion.g>
              </motion.g>
            </motion.g>
          </g>
          <motion.path
            d="M180 172q80-47 160 0"
            stroke="#0b1820"
            strokeWidth="17"
            fill="none"
            animate={{ y: theme === 'blue' ? -8 : 8 }}
            transition={{ duration: reduced ? 0 : 0.8 }}
          />
          <path d="M233 405h54" stroke="#7a8982" strokeWidth="2" />
          <path d="M245 414h30" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </motion.div>
    </motion.div>
  );
  return (
    <div
      ref={ref}
      className={`robotic-core ${compact ? 'compact' : ''} ${active ? 'is-active' : ''}`}
      data-testid={compact ? 'sticky-eye' : 'hero-eye'}
      data-personality={theme}
      data-transitioning={switching}
      data-reaction={reaction}
    >
      {compact ? (
        artwork
      ) : (
        <button type="button" className="core-trigger" onClick={react} aria-label={t.wakeCore}>
          {artwork}
        </button>
      )}
      {!compact && (
        <span className="core-speech" aria-live="polite">
          {reaction === 'delighted' ? (theme === 'blue' ? t.coreHello : t.coreAmber) : ''}
        </span>
      )}
    </div>
  );
}
