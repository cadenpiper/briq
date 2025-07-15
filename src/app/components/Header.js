import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Header() {
  return (
    <header className="w-full bg-gray-900 border-b border-gray-800">
      <div className="px-4 sm:px-8 lg:px-[100px]">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-3">
            {/* Logo placeholder */}
            <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center">
              <span className="text-gray-300 text-sm font-bold">L</span>
            </div>
            {/* App name */}
            <h1 className="text-xl font-bold text-gray-100">dapp template</h1>
          </div>
          
          {/* Navigation - Centered */}
          <nav className="hidden md:flex items-center space-x-12">
            <div className="text-gray-300 hover:text-gray-100 cursor-pointer transition-colors duration-200 font-medium">
              Dashboard
            </div>
            <div className="text-gray-300 hover:text-gray-100 cursor-pointer transition-colors duration-200 font-medium">
              Markets
            </div>
            <div className="text-gray-300 hover:text-gray-100 cursor-pointer transition-colors duration-200 font-medium">
              Portfolio
            </div>
            <div className="text-gray-300 hover:text-gray-100 cursor-pointer transition-colors duration-200 font-medium">
              AI Agent
            </div>
          </nav>
          
          <div>
            <ConnectButton
              accountStatus={{
                smallScreen: "avatar",
                largeScreen: "full",
              }}
              showBalance={{
                smallScreen: "false",
                largeScreen: "true",
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
