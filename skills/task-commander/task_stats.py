#!/usr/bin/env python3
"""
任务统计命令行工具
"""
import argparse
import requests
import json
import os

TOKEN = os.environ.get("MEMORY_CONSOLE_TOKEN", "dev-token-1234567890abcdef")
URL = os.environ.get("MEMORY_CONSOLE_URL", "http://localhost:3000")

def get_headers():
    return {"Authorization": f"Bearer {TOKEN}"}

def stats():
    """获取任务统计"""
    resp = requests.get(f"{URL}/api/tasks?stats=true", headers=get_headers())
    data = resp.json()
    
    overall = data.get('overall', {})
    print(f"📊 任务统计")
    print(f"总计: {overall.get('total', 0)}")
    print(f"待处理: {overall.get('pending', 0)}")
    print(f"进行中: {overall.get('inProgress', 0)}")
    print(f"已完成: {overall.get('completed', 0)}")
    print(f"失败: {overall.get('failed', 0)}")
    print()
    print("各 Agent 任务:")
    
    by_agent = {}
    for item in data.get('byAgent', []):
        agent = item['agent']
        if agent not in by_agent:
            by_agent[agent] = {}
        by_agent[agent][item['status']] = item['_count']
    
    for agent, statuses in by_agent.items():
        print(f"  {agent}: {statuses}")

def create_task(agent, title, description=None):
    """创建任务"""
    data = {"agent": agent, "title": title}
    if description:
        data["description"] = description
    
    resp = requests.post(f"{URL}/api/tasks", 
        headers=get_headers(),
        json=data)
    
    if resp.status_code == 200:
        print(f"✅ 任务已创建: {resp.json().get('id')}")
    else:
        print(f"❌ 创建失败: {resp.text}")

def update_task(task_id, status, result=None):
    """更新任务状态"""
    data = {"taskId": task_id, "status": status}
    if result:
        data["result"] = result
    
    resp = requests.patch(f"{URL}/api/tasks",
        headers=get_headers(),
        json=data)
    
    if resp.status_code == 200:
        print(f"✅ 任务已更新")
    else:
        print(f"❌ 更新失败: {resp.text}")

def send_message(from_agent, to_agent, content, msg_type="notification"):
    """发送消息"""
    resp = requests.post(f"{URL}/api/messages",
        headers=get_headers(),
        json={
            "fromAgent": from_agent,
            "toAgent": to_agent,
            "content": content,
            "type": msg_type
        })
    
    if resp.status_code == 200:
        print(f"✅ 消息已发送")
    else:
        print(f"❌ 发送失败: {resp.text}")

def get_messages(agent):
    """获取消息"""
    resp = requests.get(f"{URL}/api/messages?agent={agent}",
        headers=get_headers())
    data = resp.json()
    
    print(f"📨 {agent} 的消息 ({data.get('total', 0)} 条):")
    for msg in data.get('messages', []):
        print(f"  {msg.get('fromAgent')} -> {msg.get('toAgent')}: {msg.get('content', '')[:50]}...")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="任务统计命令行工具")
    subparsers = parser.add_subparsers(dest="command")
    
    subparsers.add_parser("stats", help="获取任务统计")
    
    create_parser = subparsers.add_parser("create", help="创建任务")
    create_parser.add_argument("agent", help="Agent 名称")
    create_parser.add_argument("title", help="任务标题")
    create_parser.add_argument("-d", "--description", help="任务描述")
    
    update_parser = subparsers.add_parser("update", help="更新任务")
    update_parser.add_argument("task_id", help="任务 ID")
    update_parser.add_argument("status", help="状态 (pending/in_progress/completed/failed)")
    update_parser.add_argument("-r", "--result", help="结果")
    
    msg_parser = subparsers.add_parser("message", help="发送消息")
    msg_parser.add_argument("from_agent", help="发送者")
    msg_parser.add_argument("to_agent", help="接收者")
    msg_parser.add_argument("content", help="消息内容")
    msg_parser.add_argument("-t", "--type", default="notification", help="消息类型")
    
    get_parser = subparsers.add_parser("inbox", help="获取消息")
    get_parser.add_argument("agent", help="Agent 名称")
    
    args = parser.parse_args()
    
    if args.command == "stats":
        stats()
    elif args.command == "create":
        create_task(args.agent, args.title, args.description)
    elif args.command == "update":
        update_task(args.task_id, args.status, args.result)
    elif args.command == "message":
        send_message(args.from_agent, args.to_agent, args.content, args.type)
    elif args.command == "inbox":
        get_messages(args.agent)
    else:
        parser.print_help()
