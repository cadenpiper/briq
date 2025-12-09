import Layout from './components/Layout';
import Image from 'next/image';
import Link from 'next/link';
import HowItWorks from './components/HowItWorks';
import AboutBriq from './components/AboutBriq';
import SupportedEcosystem from './components/SupportedEcosystem';

export default function Home() {
  return (
    <Layout>
      <div className="flex justify-center py-6 sm:py-12">
        <div className="text-center max-w-6xl mx-auto px-4 sm:px-6">
          
          {/* Hero Section */}
          <div className="mb-12 sm:mb-16 lg:mb-20">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-foreground font-light mb-4 sm:mb-6 transition-colors duration-300 leading-tight"
                style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}>
              AI-Powered Yield Optimization
            </h1>
          </div>

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
