"use client";

import { useState, useEffect } from "react";
import { Search, Plus, User, Bot, Clock, Upload, Download, Trash2, X, Calendar, RefreshCw, ChevronRight, Sparkles, Brain, Sparkle, Menu } from "lucide-react";

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

const API_BASE = "/api/memories";

export default function MemoryConsole() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");
  const [filter, setFilter] = useState<"all" | "ai" | "human">("all");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    try {
      const res = await fetch(API_BASE);
      const data = await res.json();
      setMemories(data);
    } catch (e) {
      console.error("Failed to load memories:", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredMemories = memories.filter((m) => {
    if (filter !== "all" && m.owner !== filter) return false;
    if (searchText) {
      const search = searchText.toLowerCase();
      return (
        m.title.toLowerCase().includes(search) ||
        m.content.toLowerCase().includes(search) ||
        m.tags.some((t) => t.toLowerCase().includes(search))
      );
    }
    return true;
  });

  const handleEdit = (memory: Memory, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMemory(memory);
    setEditTitle(memory.title);
    setEditContent(memory.content);
    setEditTags(memory.tags.join(", "));
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!selectedMemory) return;
    
    await fetch(API_BASE, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selectedMemory._id,
        title: editTitle,
        content: editContent,
        tags: editTags.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    });
    
    setIsEditing(false);
    setSelectedMemory(null);
    loadMemories();
  };

  const handleAdd = async (owner: "ai" | "human" = "ai") => {
    const newMemory = {
      title: owner === "ai" ? "新 AI 记忆" : "新人类记忆",
      content: "在此输入记忆内容...",
      source: "memory-console",
      owner: owner,
      tags: [owner === "ai" ? "AI" : "人类"],
    };
    
    await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newMemory),
    });
    
    setAddMenuOpen(false);
    loadMemories();
  };

  const handleDelete = async (id: string) => {
    await fetch(`${API_BASE}?id=${id}`, { method: "DELETE" });
    setSelectedMemory(null);
    setIsEditing(false);
    loadMemories();
  };

  const syncToRemote = async () => {
    setSyncing(true);
    try {
      const res = await fetch(API_BASE, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync-to-remote" }),
      });
      const data = await res.json();
      alert(data.success ? "已同步到阿里云" : "同步失败: " + data.error);
    } catch {
      alert("同步失败");
    } finally {
      setSyncing(false);
    }
  };

  const syncFromRemote = async () => {
    setSyncing(true);
    try {
      const res = await fetch(API_BASE, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync-from-remote" }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`已从阿里云同步 (${data.count} 条记忆)`);
        loadMemories();
      } else {
        alert("同步失败: " + data.error);
      }
    } catch {
      alert("同步失败");
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const aiCount = memories.filter(m => m.owner === "ai").length;
  const humanCount = memories.filter(m => m.owner === "human").length;

  const getPreviewContent = (content: string) => {
    return content.length > 80 ? content.substring(0, 80) + "..." : content;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-slate-200/60 transition-all duration-300 z-40 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-100">
          <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-lg">记忆控制台</h1>
            <p className="text-xs text-slate-400 font-medium">Memory Console</p>
          </div>
        </div>

        {/* Stats Card */}
        <div className="px-4 py-5">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-xl shadow-slate-800/20">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-violet-300" />
              <p className="text-xs text-slate-300 font-medium">记忆总数</p>
            </div>
            <p className="text-4xl font-bold tracking-tight">{memories.length}</p>
            <div className="flex gap-6 mt-5 pt-4 border-t border-slate-700/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet-400"></div>
                <div>
                  <p className="text-xs text-slate-400">AI 记忆</p>
                  <p className="font-semibold text-sm">{aiCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <div>
                  <p className="text-xs text-slate-400">人类记忆</p>
                  <p className="font-semibold text-sm">{humanCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-2">
          <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">导航</p>
          
          <button
            onClick={() => setFilter("all")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              filter === "all"
                ? "bg-violet-50 text-violet-700"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4" />
              全部记忆
            </div>
            {filter === "all" && <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>}
          </button>
          
          <button
            onClick={() => setFilter("ai")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              filter === "ai"
                ? "bg-violet-50 text-violet-700"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <Bot className="w-4 h-4" />
              AI 记忆
            </div>
            {filter === "ai" && <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>}
          </button>
          
          <button
            onClick={() => setFilter("human")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              filter === "human"
                ? "bg-violet-50 text-violet-700"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <User className="w-4 h-4" />
              人类记忆
            </div>
            {filter === "human" && <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>}
          </button>
        </nav>

        {/* Sync */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 bg-white">
          <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">同步</p>
          <div className="flex gap-2">
            <button
              onClick={syncToRemote}
              disabled={syncing}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm text-slate-600 transition-all disabled:opacity-50"
              title="上传到云端"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              onClick={syncFromRemote}
              disabled={syncing}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm text-slate-600 transition-all disabled:opacity-50"
              title="从云端下载"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={loadMemories}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm text-slate-600 transition-all"
              title="刷新"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {!sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-72 transition-all duration-300">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <Menu className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h2 className="text-xl font-semibold text-slate-800">
                  {filter === "all" ? "全部记忆" : filter === "ai" ? "AI 记忆" : "人类记忆"}
                </h2>
                <p className="text-sm text-slate-500">共 {filteredMemories.length} 条记忆</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Add Button with Menu */}
              <div className="relative">
                <button
                  onClick={() => setAddMenuOpen(!addMenuOpen)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-violet/25"
                >
                  <Plus className="w-4 h-4" />
                  添加记忆
                </button>
                
                {addMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50">
                    <button
                      onClick={() => handleAdd("ai")}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-violet-50 transition-colors"
                    >
                      <Bot className="w-4 h-4 text-violet-500" />
                      AI 记忆
                    </button>
                    <button
                      onClick={() => handleAdd("human")}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 transition-colors"
                    >
                      <User className="w-4 h-4 text-emerald-500" />
                      人类记忆
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {/* Search */}
          <div className="relative mb-6 max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索记忆标题、内容或标签..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm shadow-sm"
            />
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-400">加载中...</p>
            </div>
          ) : filteredMemories.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center shadow-sm">
              <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
                <Sparkle className="w-10 h-10 text-violet-400" />
              </div>
              <p className="text-slate-600 font-semibold text-lg mb-2">暂无记忆</p>
              <p className="text-slate-400 text-sm mb-6">点击右上角按钮添加第一条记忆</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => handleAdd("ai")}
                  className="flex items-center gap-2 px-5 py-2.5 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-xl text-sm font-medium transition-colors"
                >
                  <Bot className="w-4 h-4" />
                  添加 AI 记忆
                </button>
                <button
                  onClick={() => handleAdd("human")}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl text-sm font-medium transition-colors"
                >
                  <User className="w-4 h-4" />
                  添加人类记忆
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredMemories.map((memory) => (
                <div 
                  key={memory._id} 
                  onClick={(e) => handleEdit(memory, e)}
                  className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-800 truncate">{memory.title}</h3>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                          memory.owner === "ai" 
                            ? "bg-violet-50 text-violet-600" 
                            : "bg-emerald-50 text-emerald-600"
                        }`}>
                          {memory.owner === "ai" ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          {memory.owner === "ai" ? "AI" : "人类"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3">{getPreviewContent(memory.content)}</p>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-wrap gap-1.5">
                          {memory.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-lg">
                              {tag}
                            </span>
                          ))}
                          {memory.tags.length > 3 && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-xs rounded-lg">
                              +{memory.tags.length - 3}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 ml-auto">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(memory.updatedAt)} · {formatTime(memory.updatedAt)}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-violet-400 transition-colors shrink-0 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      {isEditing && selectedMemory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  selectedMemory.owner === "ai" 
                    ? "bg-violet-100" 
                    : "bg-emerald-100"
                }`}>
                  {selectedMemory.owner === "ai" ? (
                    <Bot className="w-5 h-5 text-violet-600" />
                  ) : (
                    <User className="w-5 h-5 text-emerald-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">编辑记忆</h2>
                  <p className="text-xs text-slate-400">最后更新于 {formatDate(selectedMemory.updatedAt)}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  标题
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm"
                  placeholder="输入记忆标题"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  内容
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all resize-none text-sm font-mono leading-relaxed"
                  placeholder="输入记忆内容"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  标签 <span className="text-slate-400 font-normal">(用逗号分隔)</span>
                </label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="标签1, 标签2, 标签3"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm"
                />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <button
                onClick={() => handleDelete(selectedMemory._id)}
                className="px-4 py-2.5 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors text-sm font-medium"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl transition-all text-sm font-medium shadow-lg shadow-violet/25"
                >
                  保存更改
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
