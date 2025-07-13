import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Header() {
  return (
    <header className="w-full bg-white shadow-sm">
      <div className="px-4 sm:px-8 lg:px-[100px]">
        <div className="flex items-center h-20">
          <div className="flex items-center space-x-3">
            {/* Logo placeholder */}
            <div className="w-8 h-8 bg-gray-300 rounded flex items-center justify-center">
              <span className="text-gray-600 text-sm font-bold">L</span>
            </div>
            {/* App name */}
            <h1 className="text-xl font-bold text-gray-900">dapp template</h1>
          </div>
          <div className="ml-auto">
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}