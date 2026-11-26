import type { ProjectScreenshot as Screenshot } from '../../data/projects';
import type { Locale } from '../../lib/behavior';

export function ProjectScreenshot({
  image,
  locale,
  sizes,
  className,
}: {
  image: Screenshot;
  locale: Locale;
  sizes: string;
  className?: string;
}) {
  return (
    <img
      className={className}
      src={image.src}
      srcSet={image.srcSet}
      sizes={image.srcSet ? sizes : undefined}
      width={image.width}
      height={image.height}
      alt={image.alt[locale]}
      loading="lazy"
      decoding="async"
    />
  );
}
