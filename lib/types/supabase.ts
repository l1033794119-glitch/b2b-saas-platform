// 数据库类型定义
export interface Database {
  public: {
    Tables: {
      warehouses: {
        Row: {
          id: string;
          name: string;
          location: string;
          manager: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          location: string;
          manager: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          location?: string;
          manager?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          sku: string;
          name: string;
          name_zh: string;
          category: string;
          brand: string;
          images: string[];
          description: string;
          description_zh: string;
          cost_price: number;
          wholesale_price: number;
          retail_price: number;
          stock: number;
          warehouse_id: string | null;
          warehouse_name: string;
          status: string;
          level_a_price: number;
          level_b_price: number;
          level_c_price: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sku: string;
          name: string;
          name_zh?: string;
          category?: string;
          brand?: string;
          images?: string[];
          description?: string;
          description_zh?: string;
          cost_price?: number;
          wholesale_price?: number;
          retail_price?: number;
          stock?: number;
          warehouse_id?: string | null;
          warehouse_name?: string;
          status?: string;
          level_a_price?: number;
          level_b_price?: number;
          level_c_price?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sku?: string;
          name?: string;
          name_zh?: string;
          category?: string;
          brand?: string;
          images?: string[];
          description?: string;
          description_zh?: string;
          cost_price?: number;
          wholesale_price?: number;
          retail_price?: number;
          stock?: number;
          warehouse_id?: string | null;
          warehouse_name?: string;
          status?: string;
          level_a_price?: number;
          level_b_price?: number;
          level_c_price?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      agents: {
        Row: {
          id: string;
          company: string;
          contact: string;
          email: string;
          password: string;
          phone: string;
          country: string;
          level: string;
          status: string;
          credit_limit: number;
          outstanding: number;
          join_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company: string;
          contact?: string;
          email: string;
          password: string;
          phone?: string;
          country?: string;
          level?: string;
          status?: string;
          credit_limit?: number;
          outstanding?: number;
          join_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company?: string;
          contact?: string;
          email?: string;
          password?: string;
          phone?: string;
          country?: string;
          level?: string;
          status?: string;
          credit_limit?: number;
          outstanding?: number;
          join_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          order_no: string;
          agent_id: string;
          items: any[];
          total: number;
          status: string;
          date: string;
          shipping_address: string;
          postal_code: string;
          country: string;
          contact_name: string;
          phone: string;
          email: string;
          notes: string;
          tracking_number: string | null;
          company: string | null;
          shipping_fee: number | null;
          shipped_at: string | null;
          tracking_image: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_no: string;
          agent_id: string;
          items?: any[];
          total: number;
          status?: string;
          date?: string;
          shipping_address?: string;
          postal_code?: string;
          country?: string;
          contact_name?: string;
          phone?: string;
          email?: string;
          notes?: string;
          tracking_number?: string | null;
          company?: string | null;
          shipping_fee?: number | null;
          shipped_at?: string | null;
          tracking_image?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_no?: string;
          agent_id?: string;
          items?: any[];
          total?: number;
          status?: string;
          date?: string;
          shipping_address?: string;
          postal_code?: string;
          country?: string;
          contact_name?: string;
          phone?: string;
          email?: string;
          notes?: string;
          tracking_number?: string | null;
          company?: string | null;
          shipping_fee?: number | null;
          shipped_at?: string | null;
          tracking_image?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      credit_transactions: {
        Row: {
          id: string;
          agent_id: string;
          type: string;
          amount: number;
          balance: number;
          note: string;
          time: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          type: string;
          amount: number;
          balance: number;
          note?: string;
          time?: string;
        };
      };
      inventory_logs: {
        Row: {
          id: string;
          type: string;
          product_id: string;
          product_name: string;
          sku: string;
          warehouse: string | null;
          qty: number;
          stock_before: number;
          stock_after: number;
          operator: string;
          time: string;
          note: string;
          from_warehouse: string | null;
          to_warehouse: string | null;
        };
        Insert: {
          id?: string;
          type: string;
          product_id: string;
          product_name?: string;
          sku?: string;
          warehouse?: string | null;
          qty: number;
          stock_before: number;
          stock_after: number;
          operator?: string;
          time?: string;
          note?: string;
          from_warehouse?: string | null;
          to_warehouse?: string | null;
        };
      };
      employees: {
        Row: {
          id: string;
          name: string;
          email: string;
          password: string;
          permissions: Record<string, boolean>;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          password: string;
          permissions?: Record<string, boolean>;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          password?: string;
          permissions?: Record<string, boolean>;
          active?: boolean;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// 业务逻辑层使用的类型（对外暴露的数据结构）
export interface Warehouse {
  id: string;
  name: string;
  location: string;
  manager: string;
  stock: number;
  value: number;
}

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
  warehouseId: string;
  status: string;
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
  level: string;
  status: string;
  creditLimit: number;
  outstanding: number;
  availableCredit: number;
  joinDate: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface Order {
  id: string;
  orderNo: string;
  agentId: string;
  items: OrderItem[];
  total: number;
  status: string;
  date: string;
  shippingAddress: string;
  postalCode: string;
  country: string;
  contactName: string;
  phone: string;
  email: string;
  notes: string;
  trackingNumber: string | null;
  company: string | null;
  shippingFee: number | null;
  shippedAt: string | null;
  trackingImage: string | null;
  qrCode: string | null;
  warehouseId: string | null;
  warehouse: string | null;
}

export interface CreditRecord {
  agentId: string;
  company: string;
  creditLimit: number;
  outstanding: number;
  available: number;
  transactions: CreditTransaction[];
}

export interface CreditTransaction {
  id: string;
  type: string;
  amount: number;
  balance: number;
  note: string;
  time: string;
}

export interface InventoryLog {
  id: string;
  type: "stock_in" | "stock_out" | "adjustment" | "transfer";
  productId: string;
  productName: string;
  sku: string;
  warehouse: string | null;
  qty: number;
  stockBefore: number;
  stockAfter: number;
  operator: string;
  time: string;
  note: string;
  fromWarehouse?: string;
  toWarehouse?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  permissions: Record<string, boolean>;
  active: boolean;
  createdAt: string;
}
