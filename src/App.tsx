import { lazy, Suspense } from 'react';
import { MotionConfig } from 'motion/react';
import { CoreThemeProvider, useCoreTheme } from './components/core/CoreThemeProvider';
import { Navbar } from './components/layout/Navbar';
import { StickyCore } from './components/core/StickyCore';
import { HeroSection } from './components/sections/HeroSection';
import { ProjectsSection } from './components/sections/ProjectsSection';
import { CapabilitiesSection } from './components/sections/CapabilitiesSection';
import { PortalInteraction } from './components/sections/PortalInteraction';
import { AboutSection } from './components/sections/AboutSection';
import { ContactSection } from './components/sections/ContactSection';
import { LaboratoryAtmosphere } from './components/effects/LaboratoryAtmosphere';
import { useCameraStudioActivation } from './components/sections/factory/studio/session';

const CameraStudio = import.meta.env.DEV
  ? lazy(() => import('./components/sections/factory/studio/CameraStudio'))
  : null;

function Portfolio() {
  const { t, reduced, compact } = useCoreTheme();
  const studio = import.meta.env.DEV ? useCameraStudioActivation() : null;
  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
      <LaboratoryAtmosphere />
      <a className="skip-link" href="#main">
        {t.skip}
      </a>
      <Navbar />
      <main id="main" data-compact={compact}>
        <HeroSection />
        <ProjectsSection />
        <CapabilitiesSection />
        <PortalInteraction />
        <AboutSection />
        <ContactSection />
      </main>
      <StickyCore />
      {CameraStudio && studio?.[0] && (
        <Suspense fallback={null}>
          <CameraStudio onClose={() => studio[1](false)} />
        </Suspense>
      )}
    </MotionConfig>
  );
}
export default function App() {
  return (
    <CoreThemeProvider>
      <Portfolio />
    </CoreThemeProvider>
  );
}
