import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const AGENTS_FILE = path.join(DATA_DIR, "agents.json");
const CREDIT_FILE = path.join(DATA_DIR, "credit.json");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");

// 确保数据目录存在
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// 通用读取函数
function readJson<T>(filePath: string, defaultValue: T): T {
  ensureDir();
  if (!fs.existsSync(filePath)) {
    return defaultValue;
  }
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return defaultValue;
  }
}

// 通用写入函数
function writeJson<T>(filePath: string, data: T): void {
  ensureDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// 代理商操作
export function getAgents() {
  return readJson<any[]>(AGENTS_FILE, []);
}

export function saveAgents(agents: any[]) {
  writeJson(AGENTS_FILE, agents);
}

export function getAgentByEmail(email: string) {
  const agents = getAgents();
  return agents.find((a) => a.email === email);
}

export function getAgentById(id: string) {
  const agents = getAgents();
  return agents.find((a) => a.id === id);
}

export function addAgent(agent: any) {
  const agents = getAgents();
  agents.push(agent);
  saveAgents(agents);
  return agent;
}

export function updateAgent(id: string, updates: any) {
  const agents = getAgents();
  const index = agents.findIndex((a) => a.id === id);
  if (index !== -1) {
    agents[index] = { ...agents[index], ...updates };
    saveAgents(agents);
    return agents[index];
  }
  return null;
}

export function deleteAgent(id: string) {
  const agents = getAgents();
  const index = agents.findIndex((a) => a.id === id);
  if (index !== -1) {
    agents.splice(index, 1);
    saveAgents(agents);
    return true;
  }
  return false;
}

// 信用额度操作
export function getCredits() {
  return readJson<Record<string, any>>(CREDIT_FILE, {});
}

export function saveCredits(credits: Record<string, any>) {
  writeJson(CREDIT_FILE, credits);
}

export function getCreditByAgentId(agentId: string) {
  const credits = getCredits();
  return credits[agentId];
}

export function updateCredit(agentId: string, data: any) {
  const credits = getCredits();
  credits[agentId] = { ...credits[agentId], ...data };
  saveCredits(credits);
  return credits[agentId];
}

export function addCredit(agentId: string, data: any) {
  const credits = getCredits();
  credits[agentId] = data;
  saveCredits(credits);
  return credits[agentId];
}

// 产品操作
export function getProducts() {
  return readJson<any[]>(PRODUCTS_FILE, []);
}

export function saveProducts(products: any[]) {
  writeJson(PRODUCTS_FILE, products);
}
