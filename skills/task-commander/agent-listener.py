#!/usr/bin/env python3
import os
import time
import json
import subprocess
import requests

TOKEN = "dev-token-1234567890abcdef"
URL = "http://localhost:3000"
AGENTS = ["main", "auditer", "memory-console", "dev-manager", "system-events"]
PROCESSED_FILE = "/tmp/agent_listener_processed.txt"

def log(msg):
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}")

def get_task_stats():
    try:
        resp = requests.get(f"{URL}/api/tasks?stats=true", 
                          headers={"Authorization": f"Bearer {TOKEN}"}, timeout=5)
        data = resp.json()
        
        overall = data.get('overall', {})
        reply = f"📊 任务统计摘要\n"
        reply += f"总计: {overall.get('total', 0)} | "
        reply += f"待处理: {overall.get('pending', 0)} | "
        reply += f"已完成: {overall.get('completed', 0)}\n\n"
        reply += "各 Agent 任务:\n"
        
        by_agent = {}
        for item in data.get('byAgent', []):
            agent = item['agent']
            if agent not in by_agent:
                by_agent[agent] = {}
            by_agent[agent][item['status']] = item['_count']
        
        for agent, statuses in by_agent.items():
            reply += f"  {agent}: {statuses}\n"
        
        return reply
    except Exception as e:
        return f"获取统计失败: {e}"

def send_message(to_agent, content):
    try:
        requests.post(f"{URL}/api/messages",
                    headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
                    json={"fromAgent": "system", "toAgent": to_agent, "content": content, "type": "notification"},
                    timeout=5)
    except Exception as e:
        log(f"发送消息失败: {e}")

def load_processed():
    try:
        with open(PROCESSED_FILE, 'r') as f:
            return set(line.strip() for line in f)
    except:
        return set()

def save_processed(msg_id):
    with open(PROCESSED_FILE, 'a') as f:
        f.write(msg_id + '\n')

def main():
    log("Agent Listener Service started (with auto-reply)")
    
    while True:
        processed = load_processed()
        
        for agent in AGENTS:
            try:
                resp = requests.get(f"{URL}/api/messages?agent={agent}",
                                  headers={"Authorization": f"Bearer {TOKEN}"}, timeout=5)
                data = resp.json()
                messages = data.get('messages', [])
                
                for msg in messages:
                    msg_id = msg.get('id', '')
                    
                    if msg_id in processed:
                        continue
                    
                    save_processed(msg_id)
                    
                    content = msg.get('content', '')
                    from_agent = msg.get('fromAgent', '')
                    
                    # 检查是否需要自动回复
                    keywords = ['上报', '任务', 'status', '统计', 'report']
                    if any(k in content for k in keywords):
                        log(f"收到来自 {from_agent} 的消息: {content[:30]}...")
                        reply = get_task_stats()
                        send_message(from_agent, reply)
                        log(f"已回复 {from_agent}")
                        
            except Exception as e:
                pass
        
        time.sleep(5)

if __name__ == "__main__":
    main()
