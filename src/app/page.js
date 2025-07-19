import Layout from './components/Layout';
import Image from 'next/image';

export default function Home() {
  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Image 
              src="/images/Briq.png" 
              alt="Briq Logo" 
              width={120} 
              height={120}
              style={{ width: 'auto', height: 'auto' }}
              className="rounded"
              priority
            />
          </div>
          <h2 
            className="text-4xl text-zen-900 dark:text-cream-100 mb-4 transition-colors duration-300"
            style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
          >
            Briq
          </h2>
          <p className="text-lg text-zen-800 dark:text-cream-200 font-light font-lato transition-colors duration-300">Build here</p>
        </div>
      </div>
    </Layout>
  );
}
