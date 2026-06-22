import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      console.log("[UPLOAD ERROR] No file uploaded");
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    console.log("[UPLOAD] File received:", file.name, file.type, file.size);

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/svg+xml", "image/tiff", "image/ico"];
    if (!allowedTypes.includes(file.type)) {
      console.log("[UPLOAD ERROR] Invalid file type:", file.type);
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      console.log("[UPLOAD ERROR] File size exceeds limit:", file.size);
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log("[UPLOAD] File read successfully, buffer size:", buffer.length);

    const cwd = process.cwd();
    console.log("[UPLOAD] Current working directory:", cwd);
    
    const uploadDir = path.join(cwd, "public", "uploads");
    console.log("[UPLOAD] Upload directory:", uploadDir);
    
    if (!fs.existsSync(uploadDir)) {
      console.log("[UPLOAD] Creating upload directory:", uploadDir);
      fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
    }
    
    try {
      fs.chmodSync(uploadDir, 0o755);
    } catch (e) {
      console.log("[UPLOAD] Warning: Could not chmod upload directory:", e);
    }

    const timestamp = Date.now();
    const ext = file.type.split("/")[1];
    const fileName = `${timestamp}.${ext}`;
    const filePath = path.join(uploadDir, fileName);
    
    console.log("[UPLOAD] Writing file to:", filePath);
    
    fs.writeFileSync(filePath, buffer, { mode: 0o644 });
    
    try {
      fs.chmodSync(filePath, 0o644);
    } catch (e) {
      console.log("[UPLOAD] Warning: Could not chmod file:", e);
    }
    
    const fileExists = fs.existsSync(filePath);
    const fileStats = fileExists ? fs.statSync(filePath) : null;
    
    console.log("[UPLOAD] File exists:", fileExists);
    console.log("[UPLOAD] File stats:", fileStats);

    const url = `/uploads/${fileName}`;
    console.log("[UPLOAD SUCCESS] File uploaded:", url, "Size:", file.size);
    
    return NextResponse.json({ 
      url, 
      fileName, 
      filePath,
      fileSize: buffer.length,
      success: true 
    });
  } catch (error: any) {
    console.error("[UPLOAD ERROR] Exception:", error.message);
    console.error("[UPLOAD ERROR] Stack:", error.stack);
    return NextResponse.json({ error: error.message || "Failed to upload file" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get("fileName");

    if (!fileName) {
      return NextResponse.json({ error: "File name is required" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const filePath = path.join(uploadDir, fileName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "File not found" }, { status: 404 });
  } catch (error: any) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete file" }, { status: 500 });
  }
}