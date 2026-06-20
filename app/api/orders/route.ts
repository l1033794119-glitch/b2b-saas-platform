import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");

interface OrderItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  image?: string;
}

interface Order {
  id: string;
  orderNo: string;
  agentId: string;
  items: OrderItem[];
  total: number;
  status: string;
  date: string;
  shippingAddress: string;
  postalCode?: string;
  country?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  notes?: string;
  trackingNumber?: string;
  company?: string;
  shippingFee?: number;
  shippedAt?: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  nameZh: string;
  category: string;
  brand: string;
  images: string[];
  description: string;
  descriptionZh: string;
  costPrice: number;
  wholesalePrice: number;
  retailPrice: number;
  stock: number;
  warehouse: string;
  status: "active" | "out_of_stock" | "disabled";
  levelAPrice: number;
  levelBPrice: number;
  levelCPrice: number;
}

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Read orders from file
async function getOrders(): Promise<Order[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(ORDERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Save orders to file
async function saveOrders(orders: Order[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

// Get products
async function getProducts(): Promise<Product[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(PRODUCTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Save products
async function saveProducts(products: Product[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId");
  const orders = await getOrders();
  
  if (agentId) {
    return NextResponse.json(orders.filter((o) => o.agentId === agentId));
  }
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, items, total, shippingAddress, postalCode, country, contactName, phone, email, note } = body;

    if (!agentId || !items || items.length === 0) {
      return NextResponse.json({ error: "Invalid order data" }, { status: 400 });
    }

    // Check and deduct stock first
    const products = await getProducts();
    const stockErrors: string[] = [];

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        stockErrors.push(`Product not found: ${item.name}`);
      } else if (product.stock < item.quantity) {
        stockErrors.push(`Insufficient stock for ${item.name} (available: ${product.stock})`);
      }
    }

    if (stockErrors.length > 0) {
      return NextResponse.json({ error: stockErrors.join("; ") }, { status: 400 });
    }

    // Deduct stock for all items
    for (const item of items) {
      const productIndex = products.findIndex((p) => p.id === item.productId);
      if (productIndex !== -1) {
        products[productIndex].stock -= item.quantity;
      }
    }
    await saveProducts(products);

    // Deduct from credit
    const creditRes = await fetch(`${req.headers.get("origin") || "http://localhost:3000"}/api/credit`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId,
        action: "deduct",
        amount: total,
        note: `Order ${body.orderNo || `ORD-${Date.now()}`}`,
      }),
    });

    if (!creditRes.ok) {
      // Rollback stock if credit deduction fails
      const rollbackProducts = await getProducts();
      for (const item of items) {
        const productIndex = rollbackProducts.findIndex((p) => p.id === item.productId);
        if (productIndex !== -1) {
          rollbackProducts[productIndex].stock += item.quantity;
        }
      }
      await saveProducts(rollbackProducts);

      const err = await creditRes.json();
      return NextResponse.json({ error: err.error || "Insufficient credit" }, { status: 400 });
    }

    const orders = await getOrders();
    
    const order: Order = {
      id: `ord_${Date.now()}`,
      orderNo: body.orderNo || `ORD-${Date.now()}`,
      agentId,
      items,
      total,
      status: "pending_review",
      date: new Date().toISOString(),
      shippingAddress: shippingAddress || "",
      postalCode: postalCode || "",
      country: country || "",
      contactName: contactName || "",
      phone: phone || "",
      email: email || "",
      notes: note || "",
    };

    orders.unshift(order);
    await saveOrders(orders);
    
    return NextResponse.json(order, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
