import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MiniAppProvider } from "@/lib/MiniAppProvider";
import { Web3Provider } from "@/lib/Web3Provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Conviction Vault",
  description: "Show your conviction for creator coins. Stake, lock, and earn exclusive badges.",
  openGraph: {
    title: "Conviction Vault",
    description: "Show your conviction for creator coins",
    images: ["/og-image.svg"],
  },
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": "https://conviction-vault.vercel.app/og-image.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Web3Provider>
          <MiniAppProvider>
            {children}
          </MiniAppProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
