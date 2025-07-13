import Header from './components/Header';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="flex items-center justify-center min-h-[calc(100vh-5rem)]">
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-4">Dapp Template Project</h2>
          <p className="text-lg text-gray-600">Build here</p>
        </div>
      </main>
    </div>
  );
}
