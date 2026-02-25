"use client";

import { useState, useEffect } from "react";
import { 
  Search, Plus, Edit, Trash2, X, Sparkles, CheckCircle, 
  Clock, Shield, Download, Upload, RefreshCw, ChevronRight,
  Package, Eye, EyeOff, Copy, Check
} from "lucide-react";

interface Skill {
  id: string;
  name: string;
  description: string;
  schemaPayload: any;
  version: number;
  authorInstance: string;
  isPublic: boolean;
  status: "draft" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
}

const API_BASE = "/api/skills";

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN || ''}`,
});

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<"all" | "draft" | "approved" | "rejected">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSchema, setFormSchema] = useState("{}");

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      const res = await fetch(API_BASE, { headers: getAuthHeaders() });
      const data = await res.json();
      setSkills(data.items || []);
    } catch (e) {
      console.error("Failed to load skills:", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredSkills = skills.filter((s) => {
    if (filter !== "all" && s.status !== filter) return false;
    if (searchText) {
      const search = searchText.toLowerCase();
      return (
        s.name.toLowerCase().includes(search) ||
        s.description.toLowerCase().includes(search) ||
        s.authorInstance.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const handleAdd = async () => {
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          schemaPayload: JSON.parse(formSchema || "{}"),
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        resetForm();
        loadSkills();
      }
    } catch (e) {
      alert("创建失败: " + e);
    }
  };

  const handleUpdate = async () => {
    if (!editingSkill) return;
    try {
      const res = await fetch(API_BASE, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: editingSkill.id,
          name: formName,
          description: formDescription,
          schemaPayload: JSON.parse(formSchema || "{}"),
        }),
      });
      if (res.ok) {
        setEditingSkill(null);
        resetForm();
        loadSkills();
      }
    } catch (e) {
      alert("更新失败: " + e);
    }
  };

  const handleApprove = async (skill: Skill) => {
    try {
      await fetch(API_BASE, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: skill.id,
          status: "approved",
          isPublic: true,
        }),
      });
      loadSkills();
    } catch (e) {
      console.error("Failed to approve:", e);
    }
  };

  const handleReject = async (skill: Skill) => {
    try {
      await fetch(API_BASE, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: skill.id,
          status: "rejected",
          isPublic: false,
        }),
      });
      loadSkills();
    } catch (e) {
      console.error("Failed to reject:", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个技能吗？")) return;
    try {
      await fetch(`${API_BASE}?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      loadSkills();
    } catch (e) {
      console.error("Failed to delete:", e);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormSchema("{}");
  };

  const openEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setFormName(skill.name);
    setFormDescription(skill.description);
    setFormSchema(JSON.stringify(skill.schemaPayload, null, 2));
  };

  const copySkillPayload = (payload: any) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-xs rounded-full"><CheckCircle className="w-3 h-3" />已发布</span>;
      case "rejected":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full"><Trash2 className="w-3 h-3" />已拒绝</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 text-xs rounded-full"><Clock className="w-3 h-3" />草稿</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-slate-200/60 z-40">
        <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-100">
          <div className="w-11 h-11 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-lg">技能大厅</h1>
            <p className="text-xs text-slate-400 font-medium">Skill Forge</p>
          </div>
        </div>

        {/* Stats */}
        <div className="px-4 py-5">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-xl">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-amber-300" />
              <p className="text-xs text-slate-300 font-medium">技能总数</p>
            </div>
            <p className="text-4xl font-bold tracking-tight">{skills.length}</p>
            <div className="flex gap-4 mt-4 pt-4 border-t border-slate-700/50">
              <div className="text-center">
                <p className="text-2xl font-bold">{skills.filter(s => s.status === "approved").length}</p>
                <p className="text-xs text-slate-400">已发布</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{skills.filter(s => s.status === "draft").length}</p>
                <p className="text-xs text-slate-400">草稿</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-2">
          <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">筛选</p>
          {(["all", "draft", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                filter === f
                  ? "bg-amber-50 text-amber-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="capitalize">
                {f === "all" ? "全部技能" : f === "approved" ? "已发布" : f === "draft" ? "草稿" : "已拒绝"}
              </span>
              {filter === f && <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 bg-white">
          <a
            href="/"
            className="flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors text-sm"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            返回记忆库
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-72">
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">技能管理</h2>
              <p className="text-sm text-slate-500">共 {filteredSkills.length} 个技能</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadSkills}
                className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
                title="刷新"
              >
                <RefreshCw className={`w-5 h-5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => { resetForm(); setShowAddModal(true); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-amber/25"
              >
                <Plus className="w-4 h-4" />
                添加技能
              </button>
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Search */}
          <div className="relative mb-6 max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索技能名称、描述或作者..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm shadow-sm"
            />
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-3 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-400">加载中...</p>
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center shadow-sm">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
                <Sparkles className="w-10 h-10 text-amber-400" />
              </div>
              <p className="text-slate-600 font-semibold text-lg mb-2">暂无技能</p>
              <p className="text-slate-400 text-sm mb-6">点击右上角按钮创建第一个技能</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredSkills.map((skill) => (
                <div
                  key={skill.id}
                  className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-800 truncate">{skill.name}</h3>
                        {getStatusBadge(skill.status)}
                        {skill.isPublic && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">
                            <Shield className="w-3 h-3" />公开
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3">{skill.description || "暂无描述"}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>v{skill.version}</span>
                        <span>作者: {skill.authorInstance}</span>
                        <span>更新于 {new Date(skill.updatedAt).toLocaleDateString("zh-CN")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {skill.status === "draft" && (
                        <>
                          <button
                            onClick={() => handleApprove(skill)}
                            className="p-2 hover:bg-emerald-50 rounded-xl transition-colors"
                            title="批准发布"
                          >
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                          </button>
                          <button
                            onClick={() => handleReject(skill)}
                            className="p-2 hover:bg-red-50 rounded-xl transition-colors"
                            title="拒绝"
                          >
                            <X className="w-5 h-5 text-red-500" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => copySkillPayload(skill.schemaPayload)}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                        title="复制 Schema"
                      >
                        {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-slate-400" />}
                      </button>
                      <button
                        onClick={() => openEdit(skill)}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                        title="编辑"
                      >
                        <Edit className="w-5 h-5 text-slate-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(skill.id)}
                        className="p-2 hover:bg-red-50 rounded-xl transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-5 h-5 text-slate-400 hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      {(showAddModal || editingSkill) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingSkill ? "编辑技能" : "添加新技能"}
              </h2>
              <button
                onClick={() => { setShowAddModal(false); setEditingSkill(null); resetForm(); }}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">技能名称</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
                  placeholder="输入技能名称"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">描述</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none text-sm"
                  placeholder="输入技能描述"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Schema Payload <span className="text-slate-400 font-normal">(JSON 格式)</span>
                </label>
                <textarea
                  value={formSchema}
                  onChange={(e) => setFormSchema(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
                  placeholder='{"key": "value"}'
                />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
              <button
                onClick={() => { setShowAddModal(false); setEditingSkill(null); resetForm(); }}
                className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors text-sm font-medium"
              >
                取消
              </button>
              <button
                onClick={editingSkill ? handleUpdate : handleAdd}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl transition-all text-sm font-medium shadow-lg shadow-amber/25"
              >
                {editingSkill ? "保存更改" : "创建技能"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
