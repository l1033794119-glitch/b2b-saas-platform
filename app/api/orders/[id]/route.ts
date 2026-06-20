import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

interface Order {
  id: string;
  orderNo: string;
  agentId: string;
  items: any[];
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
  trackingImage?: string;
  company?: string;
  shippingFee?: number;
  shippedAt?: string;
}

async function getOrders(): Promise<Order[]> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const data = await fs.readFile(ORDERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveOrders(orders: Order[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const orders = await getOrders();
  const order = orders.find((o) => o.id === params.id);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json(order);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const orders = await getOrders();
    const index = orders.findIndex((o) => o.id === params.id);

    if (index === -1) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update order fields
    orders[index] = {
      ...orders[index],
      ...body,
      // Ensure critical fields are not overwritten
      id: orders[index].id,
      orderNo: orders[index].orderNo,
      agentId: orders[index].agentId,
      date: orders[index].date,
    };

    await saveOrders(orders);
    return NextResponse.json(orders[index]);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orders = await getOrders();
    const filtered = orders.filter((o) => o.id !== params.id);
    await saveOrders(filtered);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
