import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/components/AppProvider";
import { CartProvider } from "@/lib/cart";

export const metadata: Metadata = {
  title: "B2B Platform — Inventory, Warehouse & Agent Ordering",
  description: "Professional B2B inventory management, warehouse management, agent ordering and business operations platform.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <CartProvider>{children}</CartProvider>
        </AppProvider>
      </body>
    </html>
  );
}
