#!/usr/bin/env python3
"""
Memory Query Tool

查询 memory-console 外置记忆服务的命令行工具。

环境变量:
  MEMORY_CONSOLE_URL: API 地址 (默认: http://localhost:3000)
  MEMORY_CONSOLE_TOKEN: API Token
"""
import os
import requests
import sys

TOKEN = os.environ.get("MEMORY_CONSOLE_TOKEN", "dev-token-1234567890abcdef")
BASE_URL = os.environ.get("MEMORY_CONSOLE_URL", "http://localhost:3000")


def query_memories(query: str) -> list:
    """查询 memory-console 中的记忆"""
    response = requests.get(
        f"{BASE_URL}/api/memories",
        headers={"Authorization": f"Bearer {TOKEN}"}
    )
    
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        return []
    
    data = response.json()
    query_lower = query.lower()
    results = []
    
    for item in data.get("items", []):
        title = item.get("title", "")
        content = item.get("content", "")
        
        if query_lower in title.lower() or query_lower in content.lower():
            results.append({
                "title": title,
                "content": content
            })
    
    return results


def main():
    if len(sys.argv) < 2:
        print("Usage: query.py <search_query>")
        sys.exit(1)
    
    query = sys.argv[1]
    results = query_memories(query)
    
    if not results:
        print(f"No results found for: {query}")
        return
    
    for item in results:
        print(f"== {item['title']} ==")
        print(item['content'])
        print()


if __name__ == "__main__":
    main()
