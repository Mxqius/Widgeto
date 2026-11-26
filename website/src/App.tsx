import { useEffect } from "react";
import Lenis from "lenis";
import { Nav } from "./components/Nav";
import { Footer } from "./components/Footer";
import { Hero } from "./sections/Hero";
import { Strip } from "./sections/Strip";
import { WidgetsSection } from "./sections/WidgetsSection";
import { IslandSection } from "./sections/IslandSection";
import { ArrangeSection } from "./sections/ArrangeSection";
import { FeaturesSection } from "./sections/FeaturesSection";
import { InsideSection } from "./sections/InsideSection";
import { DownloadSection } from "./sections/DownloadSection";
import { setLenis } from "./lib/scroll";

export default function App() {
  // buttery scrolling, unless the visitor asked for less motion
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    setLenis(lenis);
    let raf = 0;
    const tick = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Strip />
        <WidgetsSection />
        <IslandSection />
        <ArrangeSection />
        <FeaturesSection />
        <InsideSection />
        <DownloadSection />
      </main>
      <Footer />
    </>
  );
}
