import React, { useState, useEffect } from "react";
import {
    Settings,
    Building2,
    Save,
    ShieldCheck,
    Users,
    Loader2,
    AlertCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/services/apiClient";

/**
 * Reads the workspace_id cached by Layout.tsx / VendorsList.tsx.
 * Falls back to fetching it directly if nothing is cached yet.
 * Keep in sync with the same helper in those files.
 */
const getCurrentWorkspaceId = async (): Promise<number | null> => {
    const cached = localStorage.getItem("workspace_id");
    if (cached) return Number(cached);

    try {
        const res = await apiClient.post("/workspaces/list");
        if (res.data?.status === "error") return null;
        const workspaces = res.data?.data;
        if (Array.isArray(workspaces) && workspaces.length > 0) {
            const id = workspaces[0].id;
            localStorage.setItem("workspace_id", String(id));
            return Number(id);
        }
        return null;
    } catch {
        return null;
    }
};

interface WorkspaceMember {
    id: number;
    name: string;
    email: string;
    pivot?: { role: number; status: number };
}

// Backend fields only — this form intentionally has no email/currency/timezone
// inputs since WorkspaceController@update doesn't accept those columns.
interface WorkspaceForm {
    name: string;
    gstin: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
}

const emptyForm: WorkspaceForm = {
    name: "",
    gstin: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
};

const roleLabel = (role?: number) => {
    switch (role) {
        case 1:
            return "Principal";
        case 2:
            return "Vendor";
        case 3:
            return "Admin";
        default:
            return "Member";
    }
};

export const WorkspaceSettingsPage: React.FC = () => {
    const { user } = useAuth();

    const [workspaceId, setWorkspaceId] = useState<number | null>(null);
    const [ownerId, setOwnerId] = useState<number | null>(null);
    const [members, setMembers] = useState<WorkspaceMember[]>([]);
    const [form, setForm] = useState<WorkspaceForm>(emptyForm);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        loadWorkspace();
    }, []);

    const loadWorkspace = async () => {
        setLoading(true);
        setError(null);

        const id = await getCurrentWorkspaceId();
        if (!id) {
            setWorkspaceId(null);
            setForm((f) => ({
                ...f,
                name: user?.name ? `${user.name}'s Company` : "",
            }));
            setLoading(false);
            return;
        }
        setWorkspaceId(id);

        try {
            const res = await apiClient.post("/workspaces/details", { id });
            if (res.data?.status === "error") {
                setError(
                    res.data.message || "Failed to load workspace details",
                );
                return;
            }
            const ws = res.data?.data;
            if (!ws) {
                setError("Unexpected response shape from /workspaces/details");
                console.error(
                    "Unexpected /workspaces/details response:",
                    res.data,
                );
                return;
            }

            setForm({
                name: ws.name || "",
                gstin: ws.gstin || "",
                address: ws.address || "",
                city: ws.city || "",
                state: ws.state || "",
                pincode: ws.pincode || "",
                phone: ws.phone || "",
            });
            setOwnerId(ws.owner_id ?? null);
            setMembers(Array.isArray(ws.members) ? ws.members : []);
        } catch (e: any) {
            setError(
                e?.response?.data?.message ||
                    e?.message ||
                    "Failed to load workspace details",
            );
            console.error("Workspace details fetch failed:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSaveError(null);
        setSaved(false);

        try {
            const endpoint = workspaceId ? "/workspaces/update" : "/workspaces/create";
            const payload = workspaceId ? { id: workspaceId, ...form } : { ...form };

            const res = await apiClient.post(endpoint, payload);

            if (res.data?.status === "error") {
                setSaveError(
                    res.data.message || "Failed to save workspace settings",
                );
                return;
            }

            const createdOrUpdated = res.data?.data;
            if (createdOrUpdated?.id) {
                setWorkspaceId(createdOrUpdated.id);
                localStorage.setItem("workspace_id", String(createdOrUpdated.id));
                localStorage.setItem("workspace_name", createdOrUpdated.name || form.name);
            }

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
            if (!workspaceId) {
                window.location.reload();
            }
        } catch (e: any) {
            setSaveError(
                e?.response?.data?.message ||
                    e?.message ||
                    "Failed to save workspace settings",
            );
            console.error("Workspace save failed:", e);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 text-[#888] text-xs py-16 bg-[#141414] border border-[#262626] rounded-2xl">
                <Loader2 size={16} className="animate-spin" />
                Loading workspace settings...
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto flex flex-col items-center justify-center gap-3 text-center py-16 bg-[#141414] border border-[#3a1f1f] rounded-2xl">
                <AlertCircle size={22} className="text-red-400" />
                <p className="text-xs text-red-300 max-w-md">{error}</p>
                <button
                    onClick={loadWorkspace}
                    className="text-xs font-semibold text-[#f5a623] hover:underline bg-transparent border-none cursor-pointer"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    Workspace Settings{" "}
                    <Settings className="text-[#f5a623]" size={24} />
                </h1>
                <p className="text-xs text-[#888] mt-1">
                    Configure company details, GSTIN, and team workspace
                    preferences
                </p>
            </div>

            {saved && (
                <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs px-4 py-3 rounded-xl font-bold flex items-center gap-2">
                    <ShieldCheck size={16} /> Workspace settings updated
                    successfully!
                </div>
            )}

            {saveError && (
                <div className="bg-red-500/15 border border-red-500/30 text-red-300 text-xs px-4 py-3 rounded-xl font-bold flex items-center gap-2">
                    <AlertCircle size={16} /> {saveError}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
                {/* Workspace Identity Card */}
                <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 space-y-4">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Building2 size={18} className="text-[#f5a623]" />
                        Organization Details
                    </h2>

                    <div className="space-y-4 text-xs">
                        <div>
                            <label className="block text-[#aaa] font-semibold mb-1">
                                Company / Workspace Name
                            </label>
                            <input
                                type="text"
                                required
                                value={form.name}
                                onChange={(e) =>
                                    setForm({ ...form, name: e.target.value })
                                }
                                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[#aaa] font-semibold mb-1">
                                    GSTIN Number
                                </label>
                                <input
                                    type="text"
                                    value={form.gstin}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            gstin: e.target.value,
                                        })
                                    }
                                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                                />
                            </div>
                            <div>
                                <label className="block text-[#aaa] font-semibold mb-1">
                                    Official Contact Phone
                                </label>
                                <input
                                    type="text"
                                    value={form.phone}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            phone: e.target.value,
                                        })
                                    }
                                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[#aaa] font-semibold mb-1">
                                Factory / Office Address
                            </label>
                            <textarea
                                rows={2}
                                value={form.address}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        address: e.target.value,
                                    })
                                }
                                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                            ></textarea>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[#aaa] font-semibold mb-1">
                                    City
                                </label>
                                <input
                                    type="text"
                                    value={form.city}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            city: e.target.value,
                                        })
                                    }
                                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                                />
                            </div>
                            <div>
                                <label className="block text-[#aaa] font-semibold mb-1">
                                    State
                                </label>
                                <input
                                    type="text"
                                    value={form.state}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            state: e.target.value,
                                        })
                                    }
                                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                                />
                            </div>
                            <div>
                                <label className="block text-[#aaa] font-semibold mb-1">
                                    Pincode
                                </label>
                                <input
                                    type="text"
                                    value={form.pincode}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            pincode: e.target.value,
                                        })
                                    }
                                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Members & Subscription */}
                <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 space-y-4">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Users size={18} className="text-blue-400" />
                        Team Members &amp; Roles
                    </h2>

                    <div className="space-y-3 text-xs">
                        {members.length === 0 ? (
                            <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#2a2a2a] flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-white">
                                        {user?.name || "Admin User"}
                                    </p>
                                    <p className="text-[11px] text-[#888]">
                                        {user?.email || ""}
                                    </p>
                                </div>
                                <span className="bg-[#f5a623]/20 text-[#f5a623] border border-[#f5a623]/30 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">
                                    Owner
                                </span>
                            </div>
                        ) : (
                            members.map((m) => (
                                <div
                                    key={m.id}
                                    className="bg-[#1a1a1a] p-3 rounded-xl border border-[#2a2a2a] flex justify-between items-center"
                                >
                                    <div>
                                        <p className="font-bold text-white">
                                            {m.name}
                                        </p>
                                        <p className="text-[11px] text-[#888]">
                                            {m.email}
                                        </p>
                                    </div>
                                    <span className="bg-[#f5a623]/20 text-[#f5a623] border border-[#f5a623]/30 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">
                                        {m.id === ownerId
                                            ? "Owner"
                                            : roleLabel(m.pivot?.role)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold text-xs px-6 py-3 rounded-xl border-none cursor-pointer flex items-center gap-2 disabled:opacity-60"
                    >
                        {saving ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Save size={16} />
                        )}
                        {saving ? "Saving..." : workspaceId ? "Save Changes" : "Create Workspace"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default WorkspaceSettingsPage;
