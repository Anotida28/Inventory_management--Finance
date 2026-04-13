import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppFrame from "@/components/layout/AppFrame";
import StoreProvider from "@/services/store";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OMDS Inventory Operations",
  description: "Receiving, HQ stock control and branch transfer tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <StoreProvider>
          <AppFrame>{children}</AppFrame>
        </StoreProvider>
      </body>
    </html>
  );
}
