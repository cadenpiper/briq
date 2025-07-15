import Header from './Header';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header with navigation */}
      <Header />
      
      {/* Main content area - full width */}
      <main className="w-full">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
