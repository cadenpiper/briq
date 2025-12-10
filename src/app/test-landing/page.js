import Layout from '../components/Layout';
import BrickStackingHero from './BrickStackingHero';

export default function TestLanding() {
  return (
    <Layout>
      <div className="flex justify-center py-6 sm:py-12">
        <div className="text-center max-w-6xl mx-auto px-4 sm:px-6">
          
          {/* Test Hero Section with Brick Stacking Animation */}
          <BrickStackingHero />

          {/* Placeholder sections to show full page context */}
          <div className="mt-20 glass-card p-8 max-w-4xl mx-auto">
            <h2 
              className="text-2xl sm:text-3xl text-foreground mb-6 text-center"
              style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
            >
              Test Landing Page
            </h2>
            <p className="text-foreground/80 text-lg text-center max-w-3xl mx-auto">
              This is a test page for experimenting with the brick stacking animation.
              The animation appears in the hero section above. Scroll down to see how it
              looks in context with other page elements.
            </p>
          </div>

          <div className="mt-12 glass-card p-8 max-w-4xl mx-auto">
            <h3 
              className="text-xl text-foreground mb-4 text-center"
              style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
            >
              Animation Controls
            </h3>
            <p className="text-foreground/80 text-center">
              Refresh the page to see the brick stacking animation again.
            </p>
          </div>

        </div>
      </div>
    </Layout>
  );
}
