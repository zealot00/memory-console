import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const MEMORY_FILE = "/home/zealot/.openclaw/workspace/memory-console-data.json";

// Aliyun server config
const ALIYUN_HOST = "8.140.195.192";
const ALIYUN_USER = "zealot";
const ALIYUN_KEY = "/home/zealot/keys/aliyun/id_rsa";
const ALIYUN_PATH = "/home/zealot/.openclaw/workspace/memory-console-data.json";

interface Memory {
  _id: string;
  title: string;
  content: string;
  source: string;
  owner: "ai" | "human";
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

function loadMemories(): Memory[] {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const data = fs.readFileSync(MEMORY_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error loading memories:", e);
  }
  return [];
}

function saveMemories(memories: Memory[]) {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2));
  } catch (e) {
    console.error("Error saving memories:", e);
  }
}

// GET /api/memories - 获取所有记忆
export async function GET() {
  const memories = loadMemories();
  return NextResponse.json(memories);
}

// POST /api/memories - 添加记忆
export async function POST(request: NextRequest) {
  const body = await request.json();
  const memories = loadMemories();
  const now = Date.now();
  
  const newMemory: Memory = {
    _id: `mem_${now}`,
    title: body.title,
    content: body.content,
    source: body.source,
    owner: body.owner,
    tags: body.tags,
    createdAt: now,
    updatedAt: now,
  };
  
  memories.push(newMemory);
  saveMemories(memories);
  
  return NextResponse.json({ _id: newMemory._id });
}

// PUT /api/memories - 更新记忆
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const memories = loadMemories();
  const index = memories.findIndex((m) => m._id === body.id);
  
  if (index !== -1) {
    memories[index] = {
      ...memories[index],
      title: body.title,
      content: body.content,
      tags: body.tags,
      updatedAt: Date.now(),
    };
    saveMemories(memories);
  }
  
  return NextResponse.json({ success: true });
}

// DELETE /api/memories - 删除记忆
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  
  if (id) {
    const memories = loadMemories();
    const filtered = memories.filter((m) => m._id !== id);
    saveMemories(filtered);
  }
  
  return NextResponse.json({ success: true });
}

// PATCH /api/memories - 同步到远程服务器
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const action = body.action;
  
  if (action === "sync-to-remote") {
    // 同步到阿里云
    try {
      const memories = loadMemories();
      const jsonData = JSON.stringify(memories, null, 2);
      
      // 先写入本地临时文件
      const tempFile = "/tmp/memory-console-sync.json";
      fs.writeFileSync(tempFile, jsonData);
      
      // 使用 scp 复制到阿里云
      const cmd = `scp -i ${ALIYUN_KEY} ${tempFile} ${ALIYUN_USER}@${ALIYUN_HOST}:${ALIYUN_PATH}`;
      await execAsync(cmd);
      
      // 清理临时文件
      fs.unlinkSync(tempFile);
      
      return NextResponse.json({ success: true, message: "已同步到阿里云" });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  }
  
  if (action === "sync-from-remote") {
    // 从阿里云同步
    try {
      const tempFile = "/tmp/memory-console-remote.json";
      
      // 从阿里云下载
      const cmd = `scp -i ${ALIYUN_KEY} ${ALIYUN_USER}@${ALIYUN_HOST}:${ALIYUN_PATH} ${tempFile}`;
      await execAsync(cmd);
      
      // 读取并保存
      if (fs.existsSync(tempFile)) {
        const data = fs.readFileSync(tempFile, "utf-8");
        const memories = JSON.parse(data);
        saveMemories(memories);
        fs.unlinkSync(tempFile);
        return NextResponse.json({ success: true, message: "已从阿里云同步", count: memories.length });
      }
      
      return NextResponse.json({ success: false, error: "远程文件不存在" }, { status: 404 });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  }
  
  return NextResponse.json({ success: false, error: "未知操作" }, { status: 400 });
}
