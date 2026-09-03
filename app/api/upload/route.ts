import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * 绝对定位上传目录，不依赖 process.cwd()
 * - 避免 Next.js 在 standalone / NFT trace 模式下切换 cwd 导致写入路径与静态暴露目录不一致
 * - 优先使用环境变量 UPLOAD_DIR；否则回落到 {项目根}/public/uploads
 * - 项目根：取当前文件向上找到包含 package.json 的目录
 */
let _cachedUploadDir: string | null = null;
function resolveUploadDir(): string {
  if (_cachedUploadDir) return _cachedUploadDir;
  if (process.env.UPLOAD_DIR) {
    _cachedUploadDir = path.resolve(process.env.UPLOAD_DIR);
    if (!fs.existsSync(_cachedUploadDir)) fs.mkdirSync(_cachedUploadDir, { recursive: true });
    return _cachedUploadDir;
  }
  // 从当前 route.ts 的 app/api/upload/route.ts 向上定位项目根
  // next/server 编译后目录变化大，改用向上查找 package.json
  let dir = process.cwd();
  const maxDepth = 10;
  for (let i = 0; i < maxDepth; i++) {
    if (fs.existsSync(path.join(dir, "package.json"))) break;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  const uploadDir = path.join(dir, "public", "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  _cachedUploadDir = uploadDir;
  return _cachedUploadDir;
}

// POST - 上传文件（需登录）
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/svg+xml", "image/tiff", "image/ico", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = resolveUploadDir();
    const timestamp = Date.now();
    const ext = (file.type.split("/")[1] || "png").replace(/[^a-zA-Z0-9]/g, "");
    const fileName = `${timestamp}.${ext}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, buffer);

    const url = `/uploads/${fileName}`;
    return NextResponse.json({ url, fileName });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload file" }, { status: 500 });
  }
}

// DELETE - 删除文件（仅管理员）—— 幂等语义：文件不存在也返回 200，避免前端误判成路由/网络错误
export async function DELETE(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get("fileName");

    if (!fileName) {
      return NextResponse.json({ error: "File name is required" }, { status: 400 });
    }

    // 防止路径遍历：只允许文件名，不允许路径分隔符
    if (fileName.includes("/") || fileName.includes("..") || fileName.includes("\\")) {
      return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
    }

    const uploadDir = resolveUploadDir();
    const filePath = path.join(uploadDir, fileName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    // 幂等：不管文件是否存在，一律返回 200（已删除/本来就没有，结果一致）
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete error:", error);
    // 删除失败也不要把前端搞挂：500 还是要返回，但前端要处理 catch
    return NextResponse.json(
      { error: error.message || "Failed to delete file", success: false },
      { status: 500 }
    );
  }
}