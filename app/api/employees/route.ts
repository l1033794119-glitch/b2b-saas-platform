import { NextRequest, NextResponse } from "next/server";
import { getAllEmployees, getEmployeeById, getEmployeeByEmail, createEmployee, updateEmployee, deleteEmployee } from "@/lib/repository";

const MENU_PERMISSIONS = [
  { key: "dashboard", label: "仪表盘", labelEn: "Dashboard" },
  { key: "products", label: "产品管理", labelEn: "Products" },
  { key: "inventory", label: "库存管理", labelEn: "Inventory" },
  { key: "warehouse", label: "仓库管理", labelEn: "Warehouses" },
  { key: "agents", label: "代理商", labelEn: "Agents" },
  { key: "credit", label: "信用额度", labelEn: "Credit Limits" },
  { key: "orders", label: "订单管理", labelEn: "Orders" },
  { key: "shipping", label: "物流管理", labelEn: "Shipping" },
  { key: "finance", label: "财务中心", labelEn: "Finance" },
  { key: "analytics", label: "数据分析", labelEn: "Analytics" },
  { key: "notifications", label: "消息通知", labelEn: "Notifications" },
  { key: "employees", label: "员工管理", labelEn: "Employees" },
  { key: "audit_logs", label: "审计日志", labelEn: "Audit Logs" },
  { key: "settings", label: "系统设置", labelEn: "Settings" },
];

// GET - 获取所有员工或登录验证
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const password = searchParams.get("password");

    // 员工登录验证
    if (email && password) {
      const emp = await getEmployeeByEmail(email, password);
      if (!emp) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }
      return NextResponse.json(emp);
    }

    // 返回所有员工
    const employees = await getAllEmployees();
    return NextResponse.json(employees);
  } catch (error: any) {
    console.error("Employees GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch employees" }, { status: 500 });
  }
}

// POST - 创建员工
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const employees = await getAllEmployees();

    // 检查邮箱是否已被其他员工使用
    if (body.email && employees.find((e: any) => e.email === body.email)) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    const id = body.id || `emp_${Date.now()}`;
    const employee = {
      id,
      name: body.name || "",
      email: body.email || "",
      password: body.password || "admin123",
      permissions: body.permissions || Object.fromEntries(MENU_PERMISSIONS.map((m) => [m.key, true])),
      active: body.active !== false,
      createdAt: new Date().toISOString(),
    };

    const result = await createEmployee(employee);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Employees POST error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}

// PUT - 更新员工信息
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const employees = await getAllEmployees();
    const idx = employees.findIndex((e: any) => e.id === body.id);

    if (idx === -1) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.email !== undefined) updates.email = body.email;
    if (body.password !== undefined) updates.password = body.password;
    if (body.permissions !== undefined) updates.permissions = body.permissions;
    if (body.active !== undefined) updates.active = body.active;

    const result = await updateEmployee(body.id, updates);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Employees PUT error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}

// DELETE - 删除员工
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Employee ID required" }, { status: 400 });
    }

    const result = await deleteEmployee(id);
    if (!result.success) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Employees DELETE error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}
