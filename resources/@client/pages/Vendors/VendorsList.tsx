import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import apiClient from "@/services/apiClient";
import {
    Building2,
    Search,
    Plus,
    X,
    Phone,
    Mail,
    MapPin,
    ChevronRight,
    Loader2,
    AlertCircle,
    Globe,
    CheckCircle2
} from "lucide-react";

export interface Vendor {
    id: number;
    shop_name: string;
    contact_person?: string;
    phone: string;
    whatsapp_number?: string;
    email?: string;
    gstin?: string;
    address?: string;
    city?: string;
    pincode?: string;
    preferred_language?: number;
    status?: number;
    user_id?: number;
}

let workspaceFetchPromise: Promise<number | null> | null = null;

const getCurrentWorkspaceId = async (): Promise<number | null> => {
    const cached = localStorage.getItem("workspace_id");
    if (cached && cached !== "undefined" && cached !== "null" && !isNaN(Number(cached))) {
        return Number(cached);
    }

    if (workspaceFetchPromise) return workspaceFetchPromise;

    workspaceFetchPromise = (async () => {
        try {
            const res = await apiClient.post("/workspaces/list");
            if (res.data?.status === "error") {
                console.error("Failed to fetch workspaces:", res.data.message);
                return null;
            }
            const workspaces = res.data?.data;
            if (Array.isArray(workspaces) && workspaces.length > 0) {
                const id = workspaces[0].id;
                localStorage.setItem("workspace_id", String(id));
                return Number(id);
            }
            return null;
        } catch (e) {
            console.error("Failed to fetch workspaces:", e);
            return null;
        } finally {
            workspaceFetchPromise = null;
        }
    })();

    return workspaceFetchPromise;
};

export const VendorsList: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);

    const [newVendor, setNewVendor] = useState({
        target_workspace_id: null as number | null,
        shop_name: "",
        contact_person: "",
        phone: "",
        email: "",
        city: "Coimbatore",
        gstin: "",
    });

    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [networkWorkspaces, setNetworkWorkspaces] = useState<any[]>([]);
    const [selectedNetworkWsId, setSelectedNetworkWsId] = useState<string>("");
    const [isCustomVendor, setIsCustomVendor] = useState(false);

    const [hasWorkspace, setHasWorkspace] = useState<boolean>(true);
    const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState<boolean>(false);
    const [wsForm, setWsForm] = useState({ name: "", phone: "", city: "Coimbatore", gstin: "" });
    const [creatingWs, setCreatingWs] = useState<boolean>(false);
    const [createWsError, setCreateWsError] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    useEffect(() => {
        fetchVendors();
        fetchNetworkWorkspaces();
    }, []);

    const fetchVendors = async () => {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            setHasWorkspace(false);
            setVendors([]);
            setLoading(false);
            return;
        }
        setHasWorkspace(true);
        setLoading(true);
        setError(null);
        try {
            const payload: Record<string, any> = {};
            if (workspaceId) payload.workspace_id = workspaceId;

            const res = await apiClient.post("/vendors/list", payload);

            if (res.data?.status === "error") {
                setVendors([]);
                setError(res.data.message || "Failed to load vendors");
                return;
            }

            const data = res.data?.data;
            if (Array.isArray(data)) {
                setVendors(data);
            } else {
                setVendors([]);
            }
        } catch (e: any) {
            setVendors([]);
            setError(
                e?.response?.data?.message ||
                    e?.message ||
                    "Failed to load vendors from the API",
            );
            console.error("Vendor fetch failed:", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchNetworkWorkspaces = async () => {
        try {
            const workspaceId = await getCurrentWorkspaceId();
            const payload: Record<string, any> = {};
            if (workspaceId) payload.workspace_id = workspaceId;

            const res = await apiClient.post("/workspaces/available-vendors", payload);
            if (Array.isArray(res.data?.data)) {
                setNetworkWorkspaces(res.data.data);
            }
        } catch (e) {
            console.error("Failed to fetch network vendor workspaces:", e);
        }
    };

    const handleNetworkWsSelect = (wsIdStr: string) => {
        setSelectedNetworkWsId(wsIdStr);
        if (!wsIdStr || wsIdStr === "CUSTOM") {
            setNewVendor({
                target_workspace_id: null,
                shop_name: "",
                contact_person: "",
                phone: "",
                email: "",
                city: "Coimbatore",
                gstin: "",
            });
            return;
        }

        const selectedWs = networkWorkspaces.find((w) => String(w.id) === wsIdStr);
        if (selectedWs) {
            setNewVendor({
                target_workspace_id: selectedWs.id,
                shop_name: selectedWs.name || "",
                contact_person: selectedWs.contact_person || "",
                phone: selectedWs.phone || "",
                email: selectedWs.email || "",
                city: selectedWs.city || "Coimbatore",
                gstin: selectedWs.gstin || "",
            });
        }
    };

    const handleOpenCreateModal = async () => {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            setHasWorkspace(false);
            setCreateWsError(null);
            setShowCreateWorkspaceModal(true);
            return;
        }
        setHasWorkspace(true);
        fetchNetworkWorkspaces();
        setIsCustomVendor(false);
        setSelectedNetworkWsId("");
        setShowCreateModal(true);
    };

    const handleCreateWorkspaceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wsForm.name.trim()) {
            setCreateWsError("Please enter your company / workspace name.");
            return;
        }
        setCreatingWs(true);
        setCreateWsError(null);
        try {
            const res = await apiClient.post("/workspaces/create", {
                name: wsForm.name.trim(),
                phone: wsForm.phone.trim(),
                city: wsForm.city.trim(),
                gstin: wsForm.gstin.trim(),
            });

            if (res.data?.status === "error") {
                setCreateWsError(res.data.message || "Failed to create workspace.");
                return;
            }

            const createdWs = res.data?.data;
            if (createdWs?.id) {
                localStorage.setItem("workspace_id", String(createdWs.id));
                localStorage.setItem("workspace_name", createdWs.name);
                setHasWorkspace(true);
                setShowCreateWorkspaceModal(false);
                fetchVendors();
                handleOpenCreateModal();
            }
        } catch (err: any) {
            setCreateWsError(
                err?.response?.data?.message || err?.message || "Failed to create workspace."
            );
        } finally {
            setCreatingWs(false);
        }
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newVendor.shop_name) {
            setCreateError("Please select a company workspace or enter vendor name.");
            return;
        }

        const workspaceId = await getCurrentWorkspaceId();
        setCreating(true);
        setCreateError(null);
        try {
            const payload: Record<string, any> = { ...newVendor };
            if (workspaceId) payload.workspace_id = workspaceId;

            const res = await apiClient.post("/vendors/create", payload);

            if (res.data?.status === "error") {
                setCreateError(res.data.message || "Failed to create vendor");
                return;
            }

            setShowCreateModal(false);
            setSelectedNetworkWsId("");
            setIsCustomVendor(false);
            setNewVendor({
                target_workspace_id: null,
                shop_name: "",
                contact_person: "",
                phone: "",
                email: "",
                city: "Coimbatore",
                gstin: "",
            });
            await fetchVendors();
        } catch (e: any) {
            setCreateError(
                e?.response?.data?.message ||
                    e?.message ||
                    "Failed to create vendor",
            );
            console.error("Vendor create failed:", e);
        } finally {
            setCreating(false);
        }
    };

    const filtered = vendors.filter(
        (v) =>
            v.shop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (v.contact_person ?? "")
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
            (v.city ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center justify-between w-full sm:w-auto">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                            Vendors &amp; Subcontractors{" "}
                            <Building2 className="text-[#f5a623]" size={24} />
                        </h1>
                        <p className="text-xs text-[#888] mt-1">
                            Manage vendor directory, contact profiles, and registered network partners
                        </p>
                    </div>

                    {/* Mobile Compact Header Button */}
                    <button
                        onClick={handleOpenCreateModal}
                        className="sm:hidden bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 border-none cursor-pointer shrink-0 ml-2"
                    >
                        <Plus size={16} />
                        <span>Add</span>
                    </button>
                </div>

                {/* Desktop Header Button */}
                <button
                    onClick={handleOpenCreateModal}
                    className="hidden sm:flex bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold text-xs px-4 py-2.5 rounded-xl transition-all items-center gap-2 border-none cursor-pointer self-start sm:self-auto"
                >
                    <Plus size={16} />
                    <span>Add Vendor</span>
                </button>
            </div>

            {/* Workspace Required Banner */}
            {!hasWorkspace && !loading && (
                <div className="bg-[#1e1b04] border border-[#f5a623]/40 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle size={24} className="text-[#f5a623] shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-bold text-white">Workspace Required</h3>
                            <p className="text-xs text-[#aaa] mt-0.5">
                                You have not created a company workspace yet. A workspace must be added first before you can register vendors or subcontractors.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCreateWorkspaceModal(true)}
                        className="bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold text-xs px-4 py-2.5 rounded-xl border-none cursor-pointer shrink-0"
                    >
                        + Create Workspace First
                    </button>
                </div>
            )}

            {/* Search */}
            <div className="flex items-center justify-between gap-4 bg-[#141414] border border-[#262626] p-4 rounded-2xl">
                <div className="relative w-full md:w-80">
                    <Search
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666]"
                    />
                    <input
                        type="text"
                        placeholder="Search vendor name, contact, capability..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white text-xs pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#f5a623]"
                    />
                </div>
            </div>

            {/* Loading state */}
            {loading && (
                <div className="flex items-center justify-center gap-2 text-[#888] text-xs py-16 bg-[#141414] border border-[#262626] rounded-2xl">
                    <Loader2 size={16} className="animate-spin" />
                    Loading vendors...
                </div>
            )}

            {/* Error state */}
            {!loading && error && (
                <div className="flex flex-col items-center justify-center gap-3 text-center py-16 bg-[#141414] border border-[#3a1f1f] rounded-2xl">
                    <AlertCircle size={22} className="text-red-400" />
                    <p className="text-xs text-red-300 max-w-md">{error}</p>
                    <button
                        onClick={fetchVendors}
                        className="text-xs font-semibold text-[#f5a623] hover:underline bg-transparent border-none cursor-pointer"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Empty state */}
            {!loading && !error && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 text-center py-16 bg-[#141414] border border-[#262626] rounded-2xl">
                    <Building2 size={22} className="text-[#555]" />
                    <p className="text-xs text-[#888]">
                        {vendors.length === 0
                            ? "No vendors found. Add your first vendor to get started."
                            : "No vendors match your search."}
                    </p>
                </div>
            )}

            {/* Grid of Vendor Cards */}
            {!loading && !error && filtered.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((vendor) => (
                        <div
                            key={vendor.id}
                            className="bg-[#141414] border border-[#262626] hover:border-[#3a3a3a] rounded-2xl p-5 flex flex-col justify-between transition-all group"
                        >
                            <div>
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-[#f5a623]/10 border border-[#f5a623]/30 text-[#f5a623] font-bold text-base flex items-center justify-center">
                                            {vendor.shop_name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-white group-hover:text-[#f5a623] transition-colors flex items-center gap-1.5">
                                                <span>{vendor.shop_name}</span>
                                                {vendor.user_id && (
                                                    <Globe size={13} className="text-emerald-400" title="Linked Network Workspace" />
                                                )}
                                            </h3>
                                            {vendor.city && (
                                                <p className="text-[11px] text-[#888] flex items-center gap-1 mt-0.5">
                                                    <MapPin
                                                        size={12}
                                                        className="text-[#666]"
                                                    />{" "}
                                                    {vendor.city}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {vendor.status === 1 && (
                                        <span className="bg-[#222] border border-[#333] text-[10px] font-bold text-green-400 px-2 py-0.5 rounded-full">
                                            Active
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-1.5 text-xs text-gray-300 py-3 border-y border-[#222] my-3">
                                    {vendor.contact_person && (
                                        <p className="flex items-center gap-2">
                                            <strong className="text-[#888] font-normal w-24">
                                                Contact Person:
                                            </strong>
                                            <span className="font-semibold text-white">
                                                {vendor.contact_person}
                                            </span>
                                        </p>
                                    )}
                                    <p className="flex items-center gap-2">
                                        <Phone
                                            size={13}
                                            className="text-[#666]"
                                        />
                                        <span>{vendor.phone}</span>
                                    </p>
                                    {vendor.email && (
                                        <p className="flex items-center gap-2">
                                            <Mail
                                                size={13}
                                                className="text-[#666]"
                                            />
                                            <span className="truncate">
                                                {vendor.email}
                                            </span>
                                        </p>
                                    )}
                                    {vendor.gstin && (
                                        <p className="flex items-center gap-2">
                                            <strong className="text-[#888] font-normal w-24">
                                                GSTIN:
                                            </strong>
                                            <span>{vendor.gstin}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-[#222] flex justify-end">
                                <Link
                                    to={`/vendors/${vendor.id}`}
                                    className="text-xs font-semibold text-[#f5a623] hover:underline flex items-center gap-1 no-underline"
                                >
                                    View Profile &amp; Orders{" "}
                                    <ChevronRight size={14} />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#141414] border border-[#2a2a2a] w-full max-w-lg rounded-2xl p-6 relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setShowCreateModal(false)}
                            className="absolute top-4 right-4 text-[#888] hover:text-white bg-transparent border-none cursor-pointer"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-lg font-bold text-white mb-1">
                            Add New Vendor
                        </h2>
                        <p className="text-xs text-[#888] mb-4">
                            Register a subcontracting partner to your workspace
                        </p>

                        {createError && (
                            <div className="mb-4 flex items-center gap-2 text-xs text-red-300 bg-[#2a1414] border border-[#3a1f1f] rounded-xl px-3 py-2">
                                <AlertCircle size={14} />
                                {createError}
                            </div>
                        )}

                        <form
                            onSubmit={handleCreateSubmit}
                            className="space-y-4 text-xs"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-[#aaa] font-semibold">
                                        Vendor Company Workspace *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const next = !isCustomVendor;
                                            setIsCustomVendor(next);
                                            setSelectedNetworkWsId("");
                                            setNewVendor({
                                                target_workspace_id: null,
                                                shop_name: "",
                                                contact_person: "",
                                                phone: "",
                                                email: "",
                                                city: "Coimbatore",
                                                gstin: "",
                                            });
                                        }}
                                        className="text-[11px] text-[#f5a623] hover:underline bg-transparent border-none cursor-pointer font-bold flex items-center gap-1"
                                    >
                                        {isCustomVendor
                                            ? "← Select from Network Dropdown"
                                            : "+ Type Custom Vendor Name"}
                                    </button>
                                </div>

                                {!isCustomVendor ? (
                                    <div className="space-y-1.5">
                                        <select
                                            value={selectedNetworkWsId}
                                            onChange={(e) => {
                                                if (e.target.value === "CUSTOM") {
                                                    setIsCustomVendor(true);
                                                    handleNetworkWsSelect("");
                                                } else {
                                                    handleNetworkWsSelect(e.target.value);
                                                }
                                            }}
                                            className="w-full bg-[#1a1a1a] border border-[#f5a623]/40 rounded-xl text-white px-3.5 py-3 focus:outline-none focus:border-[#f5a623] text-xs font-semibold cursor-pointer"
                                            required
                                        >
                                            <option value="">
                                                {networkWorkspaces.length > 0
                                                    ? `-- Select Vendor Workspace (${networkWorkspaces.length} Registered) --`
                                                    : "-- No Other Network Workspaces Available --"}
                                            </option>
                                            {networkWorkspaces.map((ws) => (
                                                <option key={ws.id} value={ws.id}>
                                                    {ws.name} {ws.city ? `(${ws.city})` : ''} {ws.contact_person ? `— Owner: ${ws.contact_person}` : ''}
                                                </option>
                                            ))}
                                            <option value="CUSTOM">+ Other Custom / Unregistered Vendor...</option>
                                        </select>
                                        {selectedNetworkWsId && selectedNetworkWsId !== "CUSTOM" && (
                                            <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold pt-0.5">
                                                <CheckCircle2 size={13} /> Selected company details auto-filled below.
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Apex Precision Engineering"
                                        value={newVendor.shop_name}
                                        onChange={(e) =>
                                            setNewVendor({
                                                ...newVendor,
                                                shop_name: e.target.value,
                                            })
                                        }
                                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                                    />
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[#aaa] font-semibold mb-1">
                                        Contact Person *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Mr. Ramesh Kumar"
                                        value={newVendor.contact_person}
                                        onChange={(e) =>
                                            setNewVendor({
                                                ...newVendor,
                                                contact_person: e.target.value,
                                            })
                                        }
                                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[#aaa] font-semibold mb-1">
                                        Phone Number *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="+91 98401 23456"
                                        value={newVendor.phone}
                                        onChange={(e) =>
                                            setNewVendor({
                                                ...newVendor,
                                                phone: e.target.value,
                                            })
                                        }
                                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[#aaa] font-semibold mb-1">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="ops@vendor.com"
                                        value={newVendor.email}
                                        onChange={(e) =>
                                            setNewVendor({
                                                ...newVendor,
                                                email: e.target.value,
                                            })
                                        }
                                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[#aaa] font-semibold mb-1">
                                        GSTIN Number
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="33AAAAA0000A1Z5"
                                        value={newVendor.gstin}
                                        onChange={(e) =>
                                            setNewVendor({
                                                ...newVendor,
                                                gstin: e.target.value,
                                            })
                                        }
                                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 bg-[#222] hover:bg-[#2a2a2a] text-[#aaa] font-bold py-3 rounded-xl border-none cursor-pointer"
                                    disabled={creating}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold py-3 rounded-xl border-none cursor-pointer disabled:opacity-60"
                                    disabled={creating}
                                >
                                    {creating ? "Saving..." : "Save Vendor"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Workspace Modal */}
            {showCreateWorkspaceModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#141414] border border-[#2a2a2a] w-full max-w-md rounded-2xl p-6 relative">
                        <button
                            onClick={() => setShowCreateWorkspaceModal(false)}
                            className="absolute top-4 right-4 text-[#888] hover:text-white bg-transparent border-none cursor-pointer"
                        >
                            <X size={20} />
                        </button>

                        <div className="w-12 h-12 rounded-2xl bg-[#f5a623]/15 text-[#f5a623] flex items-center justify-center mb-3">
                            <Building2 size={24} />
                        </div>

                        <h2 className="text-lg font-bold text-white mb-1">
                            Create Workspace First
                        </h2>
                        <p className="text-xs text-[#888] mb-4">
                            Before adding vendors, you must set up your company workspace profile.
                        </p>

                        {createWsError && (
                            <div className="mb-4 flex items-center gap-2 text-xs text-red-300 bg-[#2a1414] border border-[#3a1f1f] rounded-xl px-3 py-2">
                                <AlertCircle size={14} />
                                {createWsError}
                            </div>
                        )}

                        <form onSubmit={handleCreateWorkspaceSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-[#aaa] font-semibold mb-1">
                                    Company / Workspace Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Apex Engineering Works"
                                    value={wsForm.name}
                                    onChange={(e) => setWsForm({ ...wsForm, name: e.target.value })}
                                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[#aaa] font-semibold mb-1">
                                        Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="+91 98401 23456"
                                        value={wsForm.phone}
                                        onChange={(e) => setWsForm({ ...wsForm, phone: e.target.value })}
                                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[#aaa] font-semibold mb-1">
                                        City
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Coimbatore"
                                        value={wsForm.city}
                                        onChange={(e) => setWsForm({ ...wsForm, city: e.target.value })}
                                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[#aaa] font-semibold mb-1">
                                    GSTIN (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="33AAAAA0000A1Z5"
                                    value={wsForm.gstin}
                                    onChange={(e) => setWsForm({ ...wsForm, gstin: e.target.value })}
                                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white px-3.5 py-2.5 focus:outline-none focus:border-[#f5a623]"
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateWorkspaceModal(false)}
                                    className="flex-1 bg-[#222] hover:bg-[#2a2a2a] text-[#aaa] font-bold py-3 rounded-xl border-none cursor-pointer"
                                    disabled={creatingWs}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold py-3 rounded-xl border-none cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                                    disabled={creatingWs}
                                >
                                    {creatingWs ? "Creating..." : "Create & Continue"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Mobile Floating Action Button (FAB) */}
            <button
                onClick={handleOpenCreateModal}
                className="sm:hidden fixed bottom-6 right-6 z-40 bg-[#f5a623] active:bg-[#e0951c] text-black font-extrabold text-xs px-4 py-3.5 rounded-full shadow-2xl flex items-center gap-2 border-2 border-black active:scale-95 transition-transform"
            >
                <Plus size={18} />
                <span>Add Vendor</span>
            </button>
        </div>
    );
};

export default VendorsList;
