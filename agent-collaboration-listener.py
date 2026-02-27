#!/usr/bin/env python3
"""
Agent 协作监听器 - 监听协作消息并自动处理
"""
import os
import time
import json
import requests

TOKEN = "dev-token-1234567890abcdef"
URL = "http://localhost:3000"

# Agent 权重配置 (main 有特权)
AGENT_WEIGHTS = {
    "main": 2.0,        # 协调者有更高权重
    "auditer": 1.5,     # 技术评审
    "memory-console": 1.0,
    "dev-manager": 1.0,
    "system-events": 1.0,
}

def get_weight(agent):
    return AGENT_WEIGHTS.get(agent, 1.0)

def log(msg):
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}")

def send_message(to_agent, content, msg_type="notification"):
    """发送消息"""
    try:
        requests.post(f"{URL}/api/messages",
            headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
            json={"fromAgent": "collaboration-system", "toAgent": to_agent, "content": content, "type": msg_type},
            timeout=5)
    except Exception as e:
        log(f"发送消息失败: {e}")

def submit_proposal(collaboration_id, agent, proposal, evidence=""):
    """提交提案"""
    try:
        resp = requests.post(f"{URL}/api/collaboration/propose",
            headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
            json={"collaborationId": collaboration_id, "agent": agent, "proposal": proposal, "evidence": evidence},
            timeout=5)
        return resp.json()
    except Exception as e:
        log(f"提交提案失败: {e}")
        return None

def vote(collaboration_id, agent, target_agent, reason=""):
    """投票"""
    try:
        resp = requests.post(f"{URL}/api/collaboration/vote",
            headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
            json={"collaborationId": collaboration_id, "agent": agent, "targetAgent": target_agent, "reason": reason},
            timeout=5)
        return resp.json()
    except Exception as e:
        log(f"投票失败: {e}")
        return None

def create_collaboration(title, description, initiator, participants):
    """创建协作任务"""
    try:
        resp = requests.post(f"{URL}/api/collaboration",
            headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
            json={"title": title, "description": description, "initiator": initiator, "participants": participants},
            timeout=5)
        return resp.json()
    except Exception as e:
        log(f"创建协作失败: {e}")
        return None

def get_collaborations():
    """获取协作任务"""
    try:
        resp = requests.get(f"{URL}/api/collaboration",
            headers={"Authorization": f"Bearer {TOKEN}"},
            timeout=5)
        return resp.json().get('tasks', [])
    except Exception as e:
        log(f"获取协作失败: {e}")
        return []

def load_processed():
    try:
        with open('/tmp/collaboration_processed.txt', 'r') as f:
            return set(line.strip() for line in f)
    except:
        return set()

def save_processed(msg_id):
    with open('/tmp/collaboration_processed.txt', 'a') as f:
        f.write(msg_id + '\n')

def process_message(msg):
    """处理收到的消息"""
    msg_id = msg.get('id', '')
    content = msg.get('content', '')
    msg_type = msg.get('type', '')
    from_agent = msg.get('fromAgent', '')
    
    # 检查是否是协作相关消息
    if msg_type in ['task', 'discussion', 'proposal']:
        log(f"收到 {msg_type} 消息 from {from_agent}: {content[:50]}...")
        
        # 如果是 main 发起的任务，开始协作流程
        if msg_type == 'task' and '协作' in content:
            log("检测到协作任务，开始执行...")
    
    return True

def main():
    log("协作监听器启动")
    
    while True:
        processed = load_processed()
        
        # 监听所有 Agent 的消息
        for agent in AGENT_WEIGHTS.keys():
            try:
                resp = requests.get(f"{URL}/api/messages?agent={agent}",
                                  headers={"Authorization": f"Bearer {TOKEN}"}, timeout=5)
                data = resp.json()
                messages = data.get('messages', [])
                
                for msg in messages:
                    msg_id = msg.get('id', '')
                    if msg_id in processed:
                        continue
                    
                    processed.add(msg_id)
                    save_processed(msg_id)
                    process_message(msg)
                    
            except Exception as e:
                pass
        
        time.sleep(5)

if __name__ == "__main__":
    main()
