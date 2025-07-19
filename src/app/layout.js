import { Geist, Geist_Mono } from "next/font/google";
import { JetBrains_Mono } from "next/font/google";
import { Lato } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import "@rainbow-me/rainbowkit/styles.css";
import { themeScript } from "./theme-script";
import { ThemeContextProvider } from "./context/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["100", "400", "700"],
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

export const metadata = {
  title: "Briq",
  description: "Briq - Web3 Application",
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript() }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} ${lato.variable} antialiased font-lato font-light`}>
        <ThemeContextProvider>
          <Providers>{children}</Providers>
        </ThemeContextProvider>
      </body>
    </html>
  );
}
