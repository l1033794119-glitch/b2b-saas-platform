import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/components/AppProvider";
import { CartProvider } from "@/lib/cart";

export const metadata: Metadata = {
  title: "B2B Platform — Inventory, Warehouse & Agent Ordering",
  description: "Professional B2B inventory management, warehouse management, agent ordering and business operations platform.",
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
