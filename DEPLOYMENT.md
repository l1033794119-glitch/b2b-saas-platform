# ============================================================================
# 项目部署配置文件 - 数据库与数据迁移说明
# ============================================================================

# 项目名称：Admin & Agent 后台管理系统
# 数据存储：本地 JSON 文件 / Supabase 数据库（可切换）
# 核心数据：产品（products）、仓库（warehouses）、代理商（agents）、
#          订单（orders）、信用额度（credit_records）、库存日志（inventory_logs）、
#          员工（employees）

# ============================================================================
# 【快速开始：本地 JSON 模式（默认，无需配置）】
# ============================================================================

# 1. 不设置任何 Supabase 环境变量
# 2. 运行：npm run dev
# 3. 系统会自动使用 /data 目录下的 JSON 文件

# ============================================================================
# 【生产部署：Supabase 数据库模式】
# ============================================================================

# 步骤 1：创建 Supabase 项目
# - 访问 https://supabase.com
# - 创建新的项目（PostgreSQL 数据库）
# - 获取以下信息：
#   * Project URL (NEXT_PUBLIC_SUPABASE_URL)
#   * anon public key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
#   * service_role secret key (SUPABASE_SERVICE_ROLE_KEY)

# 步骤 2：配置环境变量
# 创建 .env 文件，包含：

NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...（从 Supabase 控制台获取）
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...（从 Supabase 控制台获取）
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 步骤 3：运行数据库架构脚本
# 在 Supabase SQL 编辑器中运行：scripts/schema.sql
# 或者使用命令行：
# npx supabase db reset （如果你已安装 Supabase CLI）

# 步骤 4：迁移现有数据
# 从 JSON 文件导入数据到 Supabase：

npm run migrate

# 这个命令会执行 scripts/migrate-data.ts，从 /data/*.json 读取数据并导入到数据库

# 步骤 5：启动生产服务器

npm run build
npm start

# 或者部署到 Vercel：
# vercel

# ============================================================================
# 【数据迁移说明】
# ============================================================================

# 迁移工具：scripts/migrate-data.ts

# 迁移顺序（依赖关系）：
# 1. warehouses     → 仓库（无依赖）
# 2. products       → 产品（依赖仓库）
# 3. agents         → 代理商（无依赖）
# 4. credit_records → 信用额度（依赖代理商）
# 5. orders         → 订单（依赖代理商和产品）
# 6. inventory_logs → 库存日志（依赖产品）
# 7. employees      → 员工（无依赖）

# 迁移验证：迁移完成后，每个表的记录数量会在终端输出

# 如果需要从数据库导出数据：
# npx ts-node scripts/export-data.ts

# 如果需要清空数据库重新迁移：
# 1. 在 Supabase SQL 编辑器中：TRUNCATE TABLE products CASCADE; TRUNCATE TABLE warehouses CASCADE; ...
# 2. 然后重新运行迁移

# ============================================================================
# 【数据库备份与恢复】
# ============================================================================

# 备份数据库：
# pg_dump -h db.your-project-ref.supabase.co -U postgres -d postgres > backup.sql

# 恢复数据库：
# psql -h db.your-project-ref.supabase.co -U postgres -d postgres < backup.sql

# Supabase 自动备份：
# - Supabase 默认启用每日自动备份
# - 可以在项目的 Database → Backups 中查看和恢复

# ============================================================================
# 【Vercel 部署配置】
# ============================================================================

# vercel.json（如果需要）：
# {
#   "framework": "nextjs",
#   "buildCommand": "npm run build",
#   "devCommand": "npm run dev",
#   "installCommand": "npm install"
# }

# 在 Vercel 项目设置中添加环境变量：
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - NEXT_PUBLIC_SITE_URL

# ============================================================================
# 【开发与测试】
# ============================================================================

# 本地开发：
# npm run dev

# 构建检查：
# npm run build

# 环境检查脚本：
# npx ts-node scripts/supabase-setup.ts

# 验证 Supabase 连接：
# 在浏览器中访问 /api/health 或运行 curl http://localhost:3000/api/health

# ============================================================================
# 【注意事项】
# ============================================================================

# 1. 安全性：
#    - SUPABASE_SERVICE_ROLE_KEY 是敏感信息，不要提交到 Git 仓库
#    - 确保 .env 文件在 .gitignore 中
#    - Supabase 项目 URL 和密钥需要正确配置 Row Level Security (RLS)

# 2. 数据库权限：
#    - service_role key 拥有绕过 RLS 的权限，仅用于服务端
#    - anon key 仅用于客户端，受 RLS 策略限制

# 3. 数据一致性：
#    - 迁移前请确保 JSON 数据格式正确
#    - 生产环境建议先在 staging 环境测试迁移
#    - 数据库表之间有外键约束，删除操作会级联

# 4. 性能优化：
#    - 大量数据（万级以上）建议分批导入
#    - 迁移前可暂时禁用触发器，迁移后重建索引

# ============================================================================
# 【故障排查】
# ============================================================================

# 问题：API 调用返回 Supabase 错误
# 检查：
#   1. .env 文件中的 URL 和 key 是否正确
#   2. Supabase 项目是否已激活
#   3. 数据库表是否已创建（运行 schema.sql）
#   4. 网络连接是否正常

# 问题：数据迁移失败
# 检查：
#   1. JSON 文件是否存在且格式正确
#   2. 是否有重复的主键或唯一索引冲突
#   3. 数据类型是否匹配数据库 schema

# 问题：构建失败
# 运行：
#   rm -rf node_modules
#   rm -rf .next
#   npm install
#   npm run build

# ============================================================================
# 【联系与支持】
# ============================================================================

# Supabase 文档：https://supabase.com/docs
# Next.js 文档：https://nextjs.org/docs
# 项目仓库：请参考 package.json 的 repository 字段
