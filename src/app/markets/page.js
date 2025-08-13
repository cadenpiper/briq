import Layout from '../components/Layout';
import MarketTable from '../components/MarketTable';

export default function Markets() {
  return (
    <Layout>
      <div className="flex justify-center py-6 sm:py-12">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6">
          
          {/* Markets Section */}
          <div className="mb-12 sm:mb-20">
            <h2 
              className="text-2xl sm:text-3xl text-zen-900 dark:text-cream-100 mb-6 sm:mb-8 transition-colors duration-300 text-center"
              style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
            >
              Markets
            </h2>
            <MarketTable />
          </div>

        </div>
      </div>
    </Layout>
  );
}
