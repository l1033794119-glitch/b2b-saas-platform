import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const EMPLOYEES_FILE = path.join(DATA_DIR, "employees.json");

// 菜单权限定义：key 必须与 AdminSidebar 中的 menuKey 一致
export const MENU_PERMISSIONS = [
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

interface Employee {
  id: string;
  name: string;
  email: string;
  password: string;
  // 菜单权限：key 为菜单项标识，true = 有权限
  permissions: Record<string, boolean>;
  active: boolean;
  createdAt: string;
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readEmployees(): Employee[] {
  ensureDir();
  if (!fs.existsSync(EMPLOYEES_FILE)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(EMPLOYEES_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeEmployees(employees: Employee[]) {
  ensureDir();
  fs.writeFileSync(EMPLOYEES_FILE, JSON.stringify(employees, null, 2), "utf-8");
}

// 首次运行时初始化默认管理员账号
function initDefaultAdmin() {
  const employees = readEmployees();
  if (employees.length === 0) {
    const defaultAdmin: Employee = {
      id: "emp_admin",
      name: "Administrator",
      email: "admin@company.com",
      password: "admin123",
      permissions: Object.fromEntries(MENU_PERMISSIONS.map((m) => [m.key, true])),
      active: true,
      createdAt: new Date().toISOString(),
    };
    writeEmployees([defaultAdmin]);
  }
}

initDefaultAdmin();

// GET - 获取所有员工（不含密码）或登录验证
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const password = searchParams.get("password");

  // 员工登录验证
  if (email && password) {
    const employees = readEmployees();
    const emp = employees.find(
      (e) => e.email.toLowerCase() === email.toLowerCase()
    );
    if (!emp || emp.password !== password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    if (!emp.active) {
      return NextResponse.json({ error: "Account disabled" }, { status: 403 });
    }
    const { password: _, ...safeEmp } = emp;
    return NextResponse.json(safeEmp);
  }

  // 返回所有员工（不含密码）
  const employees = readEmployees();
  const safeEmployees = employees.map(({ password: _, ...emp }) => emp);
  return NextResponse.json(safeEmployees);
}

// POST - 创建或更新员工
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const employees = readEmployees();

    const id = body.id || `emp_${Date.now()}`;
    const email = (body.email || "").trim().toLowerCase();
    const password = (body.password || "admin123").trim();
    const name = (body.name || "").trim();
    const permissions = body.permissions || {};
    const active = body.active !== false;

    // 检查邮箱是否已被其他员工使用
    const existingIdx = employees.findIndex(
      (e) => e.email.toLowerCase() === email && e.id !== id
    );
    if (existingIdx >= 0) {
      return NextResponse.json(
        { error: "Email already in use by another employee" },
        { status: 400 }
      );
    }

    // 更新现有员工
    const editIdx = employees.findIndex((e) => e.id === id);
    if (editIdx >= 0) {
      // 如果传了新密码则更新，否则保留原密码
      const newPassword = body.password ? password : employees[editIdx].password;
      employees[editIdx] = {
        ...employees[editIdx],
        name,
        email,
        password: newPassword,
        permissions,
        active,
      };
      writeEmployees(employees);
      const { password: _, ...safeEmp } = employees[editIdx];
      return NextResponse.json(safeEmp);
    }

    // 创建新员工
    const newEmp: Employee = {
      id,
      name,
      email,
      password,
      permissions,
      active,
      createdAt: new Date().toISOString(),
    };
    employees.push(newEmp);
    writeEmployees(employees);
    const { password: _, ...safeEmp } = newEmp;
    return NextResponse.json(safeEmp, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

// DELETE - 删除员工
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Employee ID required" }, { status: 400 });
  }

  const employees = readEmployees();
  const idx = employees.findIndex((e) => e.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // 防止删除最后一个管理员
  if (employees.length === 1) {
    return NextResponse.json(
      { error: "Cannot delete the last employee" },
      { status: 400 }
    );
  }

  employees.splice(idx, 1);
  writeEmployees(employees);
  return NextResponse.json({ success: true });
}
