import Layout from '../components/Layout';
import MarketTable from '../components/MarketTable';
import AnimatedBackground from '../components/AnimatedBackground';

export default function Markets() {
  return (
    <Layout>
      <AnimatedBackground />
      <div className="flex justify-center py-6 sm:py-12">
        <div className="text-center max-w-6xl mx-auto px-4 sm:px-6">
          
          {/* Hero Section */}
          <div className="mb-16 sm:mb-20 lg:mb-24">
            <h1 className="text-3xl sm:text-4xl md:text-5xl text-foreground font-light mb-4 sm:mb-6 transition-colors duration-300 leading-tight"
                style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}>
              Markets
            </h1>
          </div>

          {/* Markets Table Section */}
          <div className="mb-16 sm:mb-20 lg:mb-24">
            <div className="glass-card p-6 sm:p-8">
              <MarketTable />
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
