import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import Image from "next/image";

export default function Header() {
  return (
    <header className="w-full bg-gray-900 border-b border-gray-800">
      <div className="px-4 sm:px-8 lg:px-[100px]">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            {/* Briq Logo */}
            <div className="w-16 h-16 flex items-center justify-center mr-0">
              <Image 
                src="/images/Briq.png" 
                alt="Briq Logo" 
                width={64} 
                height={64}
                style={{ width: 'auto', height: 'auto' }}
                className="rounded"
                priority
              />
            </div>
            {/* App name */}
            <h1 className="-ml-1 text-3xl text-gray-100 font-[100] font-jetbrains-mono">Briq</h1>
          </div>
          
          {/* Navigation - Centered */}
          <nav className="hidden md:flex items-center space-x-12">
            <Link href="/dashboard" className="text-gray-300 hover:text-gray-100 transition-colors duration-200 font-medium">
              Dashboard
            </Link>
            <Link href="/markets" className="text-gray-300 hover:text-gray-100 transition-colors duration-200 font-medium">
              Markets
            </Link>
            <Link href="/portfolio" className="text-gray-300 hover:text-gray-100 transition-colors duration-200 font-medium">
              Portfolio
            </Link>
            <Link href="/ai-agent" className="text-gray-300 hover:text-gray-100 transition-colors duration-200 font-medium">
              AI Agent
            </Link>
          </nav>
          
          <div>
            <ConnectButton
              label="Connect"
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
