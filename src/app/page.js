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
          <h2 className="text-4xl text-gray-100 font-[100] font-jetbrains-mono mb-4">Briq</h2>
          <p className="text-lg text-gray-400">Build here</p>
        </div>
      </div>
    </Layout>
  );
}
