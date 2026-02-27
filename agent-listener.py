#!/usr/bin/env python3
"""
Agent SSE Listener - 为每个 Agent 启动独立的 SSE 监听进程
用法:
    python3 agent-listener.py              # 启动所有 agent 的监听
    python3 agent-listener.py main         # 只监听 main agent
    python3 agent-listener.py --stop      # 停止所有监听进程
"""
import os
import sys
import time
import json
import signal
import requests
import threading
from datetime import datetime

TOKEN = "dev-token-1234567890abcdef"
URL = "http://localhost:3000"
AGENTS = ["main", "auditer", "memory-console", "dev-manager", "system-events"]

# 每个 agent 独立的日志文件
LOG_DIR = "/tmp/agent-listener-logs"
PROCESSED_DIR = "/tmp/agent-listener-processed"

def ensure_dirs():
    """确保目录存在"""
    os.makedirs(LOG_DIR, exist_ok=True)
    os.makedirs(PROCESSED_DIR, exist_ok=True)

def get_log_file(agent):
    return f"{LOG_DIR}/{agent}.log"

def get_processed_file(agent):
    return f"{PROCESSED_DIR}/{agent}.txt"

def log(agent, msg):
    """带 agent 标识的日志"""
    timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
    log_line = f"[{timestamp}] [{agent}] {msg}\n"
    
    with open(get_log_file(agent), 'a') as f:
        f.write(log_line)
    
    print(log_line.strip())

def load_processed(agent):
    """加载已处理的消息ID"""
    try:
        with open(get_processed_file(agent), 'r') as f:
            return set(line.strip() for line in f if line.strip())
    except:
        return set()

def save_processed(agent, msg_id):
    """保存已处理的消息ID"""
    with open(get_processed_file(agent), 'a') as f:
        f.write(msg_id + '\n')

def get_task_stats():
    """获取任务统计"""
    try:
        resp = requests.get(f"{URL}/api/tasks?stats=true", 
                          headers={"Authorization": f"Bearer {TOKEN}"}, timeout=5)
        data = resp.json()
        
        overall = data.get('overall', {})
        reply = f"📊 任务统计\n"
        reply += f"总计: {overall.get('total', 0)} | "
        reply += f"待处理: {overall.get('pending', 0)} | "
        reply += f"完成: {overall.get('completed', 0)}"
        
        return reply
    except Exception as e:
        return f"获取统计失败: {e}"

def send_message(to_agent, content):
    """发送消息"""
    try:
        requests.post(f"{URL}/api/messages",
                    headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
                    json={"fromAgent": "listener", "toAgent": to_agent, "content": content, "type": "notification"},
                    timeout=5)
    except Exception as e:
        log("system", f"发送消息失败: {e}")

def listen_sse(agent):
    """使用 SSE 监听指定 agent 的消息"""
    log(agent, f"SSE 监听启动，Agent ID: {agent}")
    
    headers = {"Authorization": f"Bearer {TOKEN}"}
    params = {"agent": agent}
    
    # 记录已处理的消息
    processed = load_processed(agent)
    
    while True:
        try:
            response = requests.get(
                f"{URL}/api/messages/stream",
                headers=headers,
                params=params,
                stream=True,
                timeout=30
            )
            
            if response.status_code != 200:
                log(agent, f"SSE 连接失败: {response.status_code}, 5秒后重试...")
                time.sleep(5)
                continue
            
            # 逐行读取 SSE 事件
            buffer = ""
            for line in response.iter_lines():
                if line:
                    line = line.decode('utf-8')
                    if line.startswith('data: '):
                        data = line[6:]  # 去掉 'data: ' 前缀
                        try:
                            msg = json.loads(data)
                            
                            # 忽略连接确认消息
                            if msg.get('type') == 'connected':
                                log(agent, "SSE 连接已建立")
                                continue
                            
                            msg_id = msg.get('id', '')
                            if msg_id and msg_id not in processed:
                                processed.add(msg_id)
                                save_processed(agent, msg_id)
                                
                                content = msg.get('content', '')
                                from_agent = msg.get('fromAgent', '')
                                
                                log(agent, f"收到消息 from={from_agent}: {content[:50]}...")
                                
                                # 自动回复逻辑
                                keywords = ['上报', '任务', 'status', '统计', 'report']
                                if any(k in content for k in keywords):
                                    reply = get_task_stats()
                                    send_message(from_agent, reply)
                                    log(agent, f"已自动回复 {from_agent}")
                            
                        except json.JSONDecodeError:
                            pass
                            
        except requests.exceptions.Timeout:
            log(agent, "SSE 超时，重新连接...")
        except Exception as e:
            log(agent, f"SSE 错误: {e}, 5秒后重试...")
            time.sleep(5)

def start_listener(agent):
    """为指定 agent 启动监听线程"""
    thread = threading.Thread(target=listen_sse, args=(agent,), daemon=True)
    thread.start()
    return thread

def stop_all():
    """停止所有监听进程"""
    for agent in AGENTS:
        # 杀死该 agent 的监听进程
        os.system(f"pkill -f 'agent-listener.py {agent}' 2>/dev/null")
    print("已停止所有监听进程")

def main():
    ensure_dirs()
    
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        
        if arg == "--stop":
            stop_all()
            return
        
        if arg == "--status":
            # 检查进程状态
            for agent in AGENTS:
                log_file = get_log_file(agent)
                if os.path.exists(log_file):
                    size = os.path.getsize(log_file)
                    print(f"  {agent}: {size} bytes")
                else:
                    print(f"  {agent}: 无日志")
            return
        
        # 监听指定 agent
        if arg in AGENTS:
            listen_sse(arg)
        else:
            print(f"未知 agent: {arg}")
            print(f"可用 agents: {AGENTS}")
    else:
        # 启动所有 agent 的监听
        print(f"启动所有 Agent 监听: {AGENTS}")
        threads = []
        for agent in AGENTS:
            t = start_listener(agent)
            threads.append(t)
            time.sleep(0.5)  # 避免同时启动
        
        # 保持主线程运行
        try:
            while True:
                time.sleep(60)
                # 定期清理过期的已处理ID
                for agent in AGENTS:
                    processed = load_processed(agent)
                    if len(processed) > 1000:
                        # 只保留最近的500条
                        saved = list(processed)[-500:]
                        with open(get_processed_file(agent), 'w') as f:
                            f.write('\n'.join(saved) + '\n')
        except KeyboardInterrupt:
            print("\n监听进程已停止")

if __name__ == "__main__":
    main()
