import { useEffect, useState } from 'react';

export const COMPACT_FACTORY_QUERY =
  '(max-width: 700px), (max-width: 1366px) and (pointer: coarse)';

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}
