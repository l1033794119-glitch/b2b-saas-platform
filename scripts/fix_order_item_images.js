/**
 * 一次性修复脚本：把 orders 表每条订单 items JSON 里的历史快照图片 URL，
 * 全部替换为 products 表对应 productId 的最新 images[0]。
 *
 * 解决场景：管理员改了产品图 / 删除了旧图，但历史订单 items.image 仍引用
 * 旧的 /uploads/xxx.png，导致物流管理 / 仪表盘 / 代理订单等页面继续 404。
 *
 * 使用：在项目根目录执行
 *   node scripts/fix_order_item_images.js
 */
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

// 从 .env.local / .env 读 DATABASE_URL（兼容 Next.js 一般写法）
function loadEnv() {
  const candidates = [".env.local", ".env"];
  for (const name of candidates) {
    const p = path.join(process.cwd(), name);
    if (!fs.existsSync(p)) continue;
    const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
    for (const line of lines) {
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const k = line.slice(0, eq).trim();
      let v = line.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!(k in process.env)) process.env[k] = v;
    }
  }
}
loadEnv();

if (!process.env.DATABASE_URL) {
  console.error("❌ 没找到 DATABASE_URL（.env.local / .env）");
  process.exit(1);
}

const url = new URL(process.env.DATABASE_URL);
const hostname = url.hostname === "localhost" ? "127.0.0.1" : url.hostname;
const dbConfig = {
  host: hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  multipleStatements: false,
};

(async () => {
  const conn = await mysql.createConnection(dbConfig);
  try {
    console.log(`✅ 已连接数据库：${dbConfig.host}/${dbConfig.database}`);

    // 1. 查所有订单（只取必要字段）
    const [orders] = await conn.query(
      "SELECT id, items FROM orders WHERE items IS NOT NULL AND items <> ''",
    );
    console.log(`📦 共找到 ${orders.length} 条订单，开始匹配产品最新图片…\n`);

    // 2. 先建 productId -> 最新图 的缓存
    const [products] = await conn.query(
      "SELECT id, images FROM products WHERE images IS NOT NULL AND images <> ''",
    );
    const productImgMap = new Map(); // productId -> latestImageUrl
    for (const p of products) {
      let images = [];
      try {
        images = typeof p.images === "string" ? JSON.parse(p.images) : p.images;
      } catch {
        images = [];
      }
      if (Array.isArray(images) && images[0] && typeof images[0] === "string") {
        productImgMap.set(String(p.id), images[0]);
      }
    }
    console.log(`🔖 产品最新图缓存：${productImgMap.size} 条\n`);

    let updatedOrders = 0;
    let updatedItems = 0;
    let skippedMissing = 0;
    const changedSamples = [];

    for (const order of orders) {
      let items;
      try {
        items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
      } catch {
        continue;
      }
      if (!Array.isArray(items)) continue;

      let orderChanged = false;
      for (const it of items) {
        if (!it || typeof it !== "object") continue;
        const pid = it.productId ? String(it.productId) : null;
        if (!pid) continue;
        const latestImg = productImgMap.get(pid);
        if (!latestImg) {
          skippedMissing++;
          continue;
        }
        if (it.image !== latestImg) {
          if (changedSamples.length < 10) {
            changedSamples.push({
              orderId: order.id,
              productId: pid,
              before: it.image || null,
              after: latestImg,
            });
          }
          it.image = latestImg;
          orderChanged = true;
          updatedItems++;
        }
      }

      if (orderChanged) {
        await conn.query("UPDATE orders SET items = ? WHERE id = ?", [
          JSON.stringify(items),
          order.id,
        ]);
        updatedOrders++;
      }
    }

    console.log(`✅ 完成！
  受影响订单：${updatedOrders} 条
  被替换图片：${updatedItems} 个订单项
  产品表里找不到图跳过：${skippedMissing} 个订单项`);

    if (changedSamples.length > 0) {
      console.log(`\n🔍 变更样例（前 10 条）：`);
      for (const s of changedSamples) {
        console.log(
          `  - 订单 ${s.orderId} / 产品 ${s.productId}: ${s.before || "(空)"}  →  ${s.after}`,
        );
      }
    }

    console.log(`\n⚠️  如果你的 Next.js 进程还没重新 build 并重启缓存，记得：
      pm2 restart b2b-platform`);
  } catch (e) {
    console.error("❌ 执行失败：", e);
    process.exitCode = 1;
  } finally {
    await conn.end().catch(() => {});
  }
})();
