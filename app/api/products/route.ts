import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const WAREHOUSES_FILE = path.join(DATA_DIR, "warehouses.json");

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
  warehouseId: string;
  status: string;
  levelAPrice: number;
  levelBPrice: number;
  levelCPrice: number;
}

interface Warehouse {
  id: string;
  name: string;
  location: string;
  manager: string;
}

async function getProducts(): Promise<Product[]> {
  try {
    const data = await fs.readFile(PRODUCTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveProducts(products: Product[]): Promise<void> {
  await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

async function getWarehouses(): Promise<Warehouse[]> {
  try {
    const data = await fs.readFile(WAREHOUSES_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// 数据迁移：为没有 warehouseId 的老产品补齐 warehouseId
async function migrateProducts(): Promise<Product[]> {
  const products = await getProducts();
  const warehouses = await getWarehouses();
  let changed = false;

  const nameToId = new Map(warehouses.map(w => [w.name, w.id]));

  for (const p of products) {
    if (!(p as any).warehouseId && p.warehouse) {
      const id = nameToId.get(p.warehouse);
      if (id) {
        (p as any).warehouseId = id;
        changed = true;
      } else {
        (p as any).warehouseId = "";
        changed = true;
      }
    }
  }

  if (changed) {
    await saveProducts(products);
  }
  return products;
}

export async function GET(req: NextRequest) {
  const products = await migrateProducts();
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const products = await migrateProducts();
    const warehouses = await getWarehouses();
    const id = body.id || `p${Date.now()}`;
    const exists = products.find((p: any) => p.id === id);

    let warehouseId = body.warehouseId || "";
    let warehouseName = body.warehouse || "";

    if (warehouseId) {
      const wh = warehouses.find(w => w.id === warehouseId);
      if (wh) warehouseName = wh.name;
    } else if (warehouseName) {
      const wh = warehouses.find(w => w.name === warehouseName);
      if (wh) warehouseId = wh.id;
    }

    if (!warehouseId && warehouses.length > 0) {
      warehouseId = warehouses[0].id;
      warehouseName = warehouses[0].name;
    } else if (!warehouseId) {
      warehouseName = warehouseName || "UK Warehouse";
    }

    if (exists) {
      const idx = products.findIndex((p: any) => p.id === id);
      products[idx] = {
        ...exists,
        ...body,
        id,
        warehouse: warehouseName,
        warehouseId: warehouseId,
      };
      await saveProducts(products);
      return NextResponse.json(products[idx]);
    } else {
      const newProduct: any = {
        id,
        sku: body.sku || `SKU-${Date.now()}`,
        name: body.name || "New Product",
        nameZh: body.nameZh || "新产品",
        category: body.category || "General",
        brand: body.brand || "Generic",
        images: body.images || [],
        description: body.description || "",
        descriptionZh: body.descriptionZh || "",
        costPrice: body.costPrice || 0,
        wholesalePrice: body.wholesalePrice || 0,
        retailPrice: body.retailPrice || 0,
        stock: body.stock || 0,
        warehouse: warehouseName,
        warehouseId: warehouseId,
        status: body.status || "active",
        levelAPrice: body.levelAPrice || body.wholesalePrice || 0,
        levelBPrice: body.levelBPrice || body.wholesalePrice || 0,
        levelCPrice: body.levelCPrice || body.wholesalePrice || 0,
      };
      products.unshift(newProduct);
      await saveProducts(products);
      return NextResponse.json(newProduct, { status: 201 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
