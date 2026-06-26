export interface Product {
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

export interface Agent {
  id: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  country: string;
  status: "active" | "pending" | "disabled";
  level: "A" | "B" | "C";
  creditLimit: number;
  outstanding: number;
  joinDate: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  orderNo: string;
  agentId: string;
  agent: string;
  company: string;
  items: OrderItem[];
  total: number;
  status: "submitted" | "pending_qrcode" | "qrcode_uploaded" | "pending_waybill" | "waybill_uploaded" | "pending_shipment" | "pending_payment" | "shipped" | "completed" | "cancelled";
  date: string;
  shippingAddress: string;
  trackingNumber?: string;
  trackingImage?: string;
  qrCode?: string;
  waybillImage?: string;
  warehouseId?: string;
  warehouse?: string;
  carrier?: string;
  notes?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  manager: string;
  stock: number;
  value: number;
}

export interface AuditEntry {
  id: string;
  user: string;
  action: string;
  time: string;
  ip: string;
}

export interface NotificationItem {
  id: string;
  type: "new_order" | "shipment" | "low_stock" | "payment" | "system";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const image = (seed: string) =>
  `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=800&q=70`;

export const products: Product[] = [
  {
    id: "p1",
    sku: "SKU-0001",
    name: "Premium Wireless Headphones",
    nameZh: "高级无线耳机",
    category: "Electronics",
    brand: "AudioPro",
    images: [image("photo-1505740420928-5e560c06d30e")],
    description: "Professional over-ear wireless headphones with noise cancellation.",
    descriptionZh: "专业头戴式无线降噪耳机。",
    costPrice: 35,
    wholesalePrice: 75,
    retailPrice: 149,
    stock: 342,
    warehouse: "UK Warehouse",
    status: "active",
    levelAPrice: 68,
    levelBPrice: 72,
    levelCPrice: 75,
  },
  {
    id: "p2",
    sku: "SKU-0002",
    name: "Smart Fitness Watch",
    nameZh: "智能运动手表",
    category: "Electronics",
    brand: "FitTech",
    images: [image("photo-1523275335684-37898b6baf30")],
    description: "Advanced smartwatch with health tracking.",
    descriptionZh: "带健康追踪功能的高级智能手表。",
    costPrice: 48,
    wholesalePrice: 99,
    retailPrice: 199,
    stock: 187,
    warehouse: "UK Warehouse",
    status: "active",
    levelAPrice: 89,
    levelBPrice: 95,
    levelCPrice: 99,
  },
  {
    id: "p3",
    sku: "SKU-0003",
    name: "Organic Cotton T-Shirt",
    nameZh: "有机棉T恤",
    category: "Apparel",
    brand: "EcoWear",
    images: [image("photo-1521572163474-6864f9cf17ab")],
    description: "Unisex organic cotton tee, available in multiple colors.",
    descriptionZh: "男女通用有机棉T恤，多色可选。",
    costPrice: 6,
    wholesalePrice: 14,
    retailPrice: 29,
    stock: 2100,
    warehouse: "Australia Warehouse",
    status: "active",
    levelAPrice: 12,
    levelBPrice: 13,
    levelCPrice: 14,
  },
  {
    id: "p4",
    sku: "SKU-0004",
    name: "Stainless Steel Water Bottle",
    nameZh: "不锈钢保温瓶",
    category: "Home & Living",
    brand: "HydroLife",
    images: [image("photo-1602143407151-7111c45d4282")],
    description: "Double-walled insulated 750ml bottle.",
    descriptionZh: "双层真空保温，750毫升。",
    costPrice: 5,
    wholesalePrice: 12,
    retailPrice: 24,
    stock: 870,
    warehouse: "USA Warehouse",
    status: "active",
    levelAPrice: 10,
    levelBPrice: 11,
    levelCPrice: 12,
  },
  {
    id: "p5",
    sku: "SKU-0005",
    name: "LED Desk Lamp",
    nameZh: "LED 台灯",
    category: "Home & Living",
    brand: "BrightOne",
    images: [image("photo-1507473885765-e6ed057f782c")],
    description: "Adjustable LED desk lamp with USB charging.",
    descriptionZh: "可调节LED台灯，带USB充电。",
    costPrice: 12,
    wholesalePrice: 28,
    retailPrice: 59,
    stock: 65,
    warehouse: "UK Warehouse",
    status: "active",
    levelAPrice: 24,
    levelBPrice: 26,
    levelCPrice: 28,
  },
  {
    id: "p6",
    sku: "SKU-0006",
    name: "Ergonomic Office Chair",
    nameZh: "人体工学办公椅",
    category: "Furniture",
    brand: "ErgoChair",
    images: [image("photo-1580480055370-58b503a7a790")],
    description: "Lumbar support breathable mesh chair.",
    descriptionZh: "带腰部支撑的透气网布椅。",
    costPrice: 110,
    wholesalePrice: 220,
    retailPrice: 459,
    stock: 42,
    warehouse: "USA Warehouse",
    status: "active",
    levelAPrice: 199,
    levelBPrice: 210,
    levelCPrice: 220,
  },
  {
    id: "p7",
    sku: "SKU-0007",
    name: "Bluetooth Speaker Mini",
    nameZh: "迷你蓝牙音箱",
    category: "Electronics",
    brand: "AudioPro",
    images: [image("photo-1608043152269-423dbba4e7e1")],
    description: "Portable Bluetooth speaker with 12h battery.",
    descriptionZh: "便携蓝牙音箱，12小时续航。",
    costPrice: 15,
    wholesalePrice: 32,
    retailPrice: 69,
    stock: 8,
    warehouse: "Australia Warehouse",
    status: "out_of_stock",
    levelAPrice: 28,
    levelBPrice: 30,
    levelCPrice: 32,
  },
  {
    id: "p8",
    sku: "SKU-0008",
    name: "Yoga Mat Premium",
    nameZh: "高级瑜伽垫",
    category: "Sports",
    brand: "ZenFit",
    images: [image("photo-1601925260368-ae2f89cf1488")],
    description: "Non-slip eco-friendly yoga mat.",
    descriptionZh: "防滑环保瑜伽垫。",
    costPrice: 8,
    wholesalePrice: 19,
    retailPrice: 39,
    stock: 520,
    warehouse: "UK Warehouse",
    status: "active",
    levelAPrice: 17,
    levelBPrice: 18,
    levelCPrice: 19,
  },
];

export const agents: Agent[] = [
  { id: "a1", company: "ABC Trading Ltd", contact: "John Smith", email: "agent@demo.com", phone: "+44 20 1234 5678", country: "United Kingdom", status: "active", level: "A", creditLimit: 50000, outstanding: 12500, joinDate: "2024-03-12" },
  { id: "a2", company: "Downunder Pty", contact: "Jane Doe", email: "agent2@demo.com", phone: "+61 4 1234 5678", country: "Australia", status: "active", level: "B", creditLimit: 25000, outstanding: 3200, joinDate: "2024-05-08" },
  { id: "a3", company: "Pacific Rim Distributors", contact: "Michael Lee", email: "michael@pacific.com", phone: "+1 415 555 0123", country: "United States", status: "pending", level: "C", creditLimit: 10000, outstanding: 0, joinDate: "2025-01-18" },
  { id: "a4", company: "EuroGoods GmbH", contact: "Anna Müller", email: "anna@eurogoods.de", phone: "+49 30 123456", country: "Germany", status: "active", level: "B", creditLimit: 30000, outstanding: 8750, joinDate: "2023-11-22" },
  { id: "a5", company: "Maple Leaf Traders", contact: "David Chen", email: "david@mapleleaf.ca", phone: "+1 604 555 0199", country: "Canada", status: "active", level: "A", creditLimit: 45000, outstanding: 15800, joinDate: "2024-08-15" },
  { id: "a6", company: "Nordic Supplies", contact: "Erik Johansson", email: "erik@nordic.se", phone: "+46 8 123 45 67", country: "Sweden", status: "disabled", level: "C", creditLimit: 8000, outstanding: 0, joinDate: "2023-06-30" },
];

export const warehouses: Warehouse[] = [
  { id: "w1", name: "UK Warehouse", location: "London, UK", manager: "Sarah Johnson", stock: 1820, value: 285400 },
  { id: "w2", name: "Australia Warehouse", location: "Sydney, Australia", manager: "Mark Wilson", stock: 980, value: 142300 },
  { id: "w3", name: "USA Warehouse", location: "Los Angeles, USA", manager: "James Brown", stock: 2410, value: 398700 },
];

export const orders: Order[] = [
  {
    id: "o1",
    orderNo: "ORD-20250618-001",
    agentId: "a1",
    agent: "John Smith",
    company: "ABC Trading Ltd",
    items: [
      { productId: "p1", productName: "Premium Wireless Headphones", sku: "SKU-0001", qty: 20, price: 68 },
      { productId: "p2", productName: "Smart Fitness Watch", sku: "SKU-0002", qty: 15, price: 89 },
    ],
    total: 2695,
    status: "shipped",
    date: "2025-06-18",
    shippingAddress: "123 Oxford Street, London, W1D 1BS, United Kingdom",
    trackingNumber: "RM123456789GB",
    carrier: "Royal Mail",
  },
  {
    id: "o2",
    orderNo: "ORD-20250617-002",
    agentId: "a2",
    agent: "Jane Doe",
    company: "Downunder Pty",
    items: [
      { productId: "p3", productName: "Organic Cotton T-Shirt", sku: "SKU-0003", qty: 200, price: 13 },
      { productId: "p8", productName: "Yoga Mat Premium", sku: "SKU-0008", qty: 50, price: 18 },
    ],
    total: 3500,
    status: "pending_qrcode",
    date: "2025-06-17",
    shippingAddress: "456 George Street, Sydney, NSW 2000, Australia",
  },
  {
    id: "o3",
    orderNo: "ORD-20250616-003",
    agentId: "a5",
    agent: "David Chen",
    company: "Maple Leaf Traders",
    items: [
      { productId: "p6", productName: "Ergonomic Office Chair", sku: "SKU-0006", qty: 10, price: 199 },
    ],
    total: 1990,
    status: "pending_payment",
    date: "2025-06-16",
    shippingAddress: "789 Granville Street, Vancouver, BC V6C 1T1, Canada",
  },
  {
    id: "o4",
    orderNo: "ORD-20250615-004",
    agentId: "a4",
    agent: "Anna Müller",
    company: "EuroGoods GmbH",
    items: [
      { productId: "p1", productName: "Premium Wireless Headphones", sku: "SKU-0001", qty: 30, price: 68 },
      { productId: "p4", productName: "Stainless Steel Water Bottle", sku: "SKU-0004", qty: 100, price: 10 },
    ],
    total: 3040,
    status: "shipped",
    date: "2025-06-15",
    shippingAddress: "101 Unter den Linden, Berlin, 10117, Germany",
    trackingNumber: "DHL1234567890",
    carrier: "DHL",
  },
  {
    id: "o5",
    orderNo: "ORD-20250614-005",
    agentId: "a1",
    agent: "John Smith",
    company: "ABC Trading Ltd",
    items: [
      { productId: "p5", productName: "LED Desk Lamp", sku: "SKU-0005", qty: 25, price: 24 },
    ],
    total: 600,
    status: "completed",
    date: "2025-06-14",
    shippingAddress: "123 Oxford Street, London, W1D 1BS, United Kingdom",
    trackingNumber: "EVR9876543210",
    carrier: "Evri",
  },
  {
    id: "o6",
    orderNo: "ORD-20250613-006",
    agentId: "a3",
    agent: "Michael Lee",
    company: "Pacific Rim Distributors",
    items: [
      { productId: "p2", productName: "Smart Fitness Watch", sku: "SKU-0002", qty: 50, price: 95 },
    ],
    total: 4750,
    status: "submitted",
    date: "2025-06-13",
    shippingAddress: "200 Market Street, San Francisco, CA 94105, USA",
  },
  {
    id: "o7",
    orderNo: "ORD-20250612-007",
    agentId: "a2",
    agent: "Jane Doe",
    company: "Downunder Pty",
    items: [
      { productId: "p8", productName: "Yoga Mat Premium", sku: "SKU-0008", qty: 100, price: 17 },
      { productId: "p4", productName: "Stainless Steel Water Bottle", sku: "SKU-0004", qty: 80, price: 11 },
    ],
    total: 2580,
    status: "completed",
    date: "2025-06-12",
    shippingAddress: "456 George Street, Sydney, NSW 2000, Australia",
    trackingNumber: "AUP1234567890",
    carrier: "UPS",
  },
  {
    id: "o8",
    orderNo: "ORD-20250611-008",
    agentId: "a5",
    agent: "David Chen",
    company: "Maple Leaf Traders",
    items: [
      { productId: "p3", productName: "Organic Cotton T-Shirt", sku: "SKU-0003", qty: 300, price: 12 },
    ],
    total: 3600,
    status: "cancelled",
    date: "2025-06-11",
    shippingAddress: "789 Granville Street, Vancouver, BC V6C 1T1, Canada",
  },
];

export const salesTrend = [
  { date: "Jun 12", orders: 18, revenue: 2450 },
  { date: "Jun 13", orders: 24, revenue: 3820 },
  { date: "Jun 14", orders: 15, revenue: 1980 },
  { date: "Jun 15", orders: 32, revenue: 5410 },
  { date: "Jun 16", orders: 28, revenue: 4650 },
  { date: "Jun 17", orders: 35, revenue: 5980 },
  { date: "Jun 18", orders: 42, revenue: 6840 },
];

export const monthlyRevenue = [
  { month: "Jan", revenue: 82000 },
  { month: "Feb", revenue: 95000 },
  { month: "Mar", revenue: 112000 },
  { month: "Apr", revenue: 98000 },
  { month: "May", revenue: 128000 },
  { month: "Jun", revenue: 142000 },
];

export const auditLogs: AuditEntry[] = [
  { id: "1", user: "admin@company.com", action: "Signed in to dashboard", time: "2025-06-18 09:42:11", ip: "192.168.1.20" },
  { id: "2", user: "warehouse@company.com", action: "Stock in: 50x SKU-0001", time: "2025-06-18 09:30:02", ip: "192.168.1.21" },
  { id: "3", user: "admin@company.com", action: "Created product: SKU-0009", time: "2025-06-18 08:55:41", ip: "192.168.1.20" },
  { id: "4", user: "finance@company.com", action: "Approved invoice INV-2025-0618", time: "2025-06-18 08:12:18", ip: "192.168.1.22" },
  { id: "5", user: "ops@company.com", action: "Updated order ORD-20250618-001 to processing", time: "2025-06-17 17:42:09", ip: "192.168.1.23" },
  { id: "6", user: "admin@company.com", action: "Approved agent Pacific Rim Distributors", time: "2025-06-17 14:22:10", ip: "192.168.1.20" },
  { id: "7", user: "agent@demo.com", action: "Submitted new order ORD-20250618-001", time: "2025-06-17 11:08:51", ip: "82.12.44.10" },
  { id: "8", user: "support@company.com", action: "Responded to ticket #4821", time: "2025-06-17 10:15:00", ip: "192.168.1.24" },
];

export const notifications: NotificationItem[] = [
  { id: "n1", type: "new_order", title: "New order received", message: "Order ORD-20250618-001 from ABC Trading Ltd", time: "10 minutes ago", read: false },
  { id: "n2", type: "low_stock", title: "Low stock alert", message: "Bluetooth Speaker Mini has only 8 units left", time: "25 minutes ago", read: false },
  { id: "n3", type: "shipment", title: "Shipment delivered", message: "Order ORD-20250614-005 has been delivered", time: "1 hour ago", read: false },
  { id: "n4", type: "payment", title: "Payment reminder", message: "Agent Maple Leaf Traders has overdue amount of £15,800", time: "3 hours ago", read: true },
  { id: "n5", type: "new_order", title: "Order pending review", message: "Order ORD-20250613-006 is awaiting your approval", time: "Yesterday", read: true },
  { id: "n6", type: "system", title: "System maintenance", message: "Scheduled maintenance on Saturday 01:00 UTC", time: "Yesterday", read: true },
];
