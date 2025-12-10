import Layout from './components/Layout';
import BrickStackingHero from './components/BrickStackingHero';
import HowItWorks from './components/HowItWorks';
import AboutBriq from './components/AboutBriq';
import SupportedEcosystem from './components/SupportedEcosystem';

export default function Home() {
  return (
    <Layout>
      <div className="flex flex-col">

        {/* Hero Section with Brick Animation */}
        <BrickStackingHero />

        {/* Rest of Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">

          {/* About Briq Section */}
          <AboutBriq />

          {/* How It Works Section */}
          <HowItWorks />

          {/* Supported Ecosystem */}
          <SupportedEcosystem />

        </div>
      </div>
    </Layout>
  );
}
