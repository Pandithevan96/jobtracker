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
}

/**
 * Resolves the current workspace_id.
 *
 * auth_user (stored after login) has no workspace field, so this fetches
 * POST /workspaces/list (returns all workspaces the user owns/belongs to)
 * and uses the first one, caching it in localStorage so we don't refetch
 * on every call.
 *
 * NOTE: if a user can belong to multiple workspaces, this just picks the
 * first one — you'll eventually want a proper workspace switcher that
 * sets 'workspace_id' in localStorage explicitly instead of relying on
 * this fallback.
 */
let workspaceFetchPromise: Promise<number | null> | null = null;

const getCurrentWorkspaceId = async (): Promise<number | null> => {
    const cached = localStorage.getItem("workspace_id");
    if (cached) return Number(cached);

    // Avoid firing multiple simultaneous /workspaces/list calls
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
        shop_name: "",
        contact_person: "",
        phone: "",
        email: "",
        city: "Coimbatore",
        gstin: "",
    });

    // No static fallback data — starts empty until the API responds
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            setVendors([]);
            setLoading(false);
            setError("No workspace selected — cannot load vendors.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.post("/vendors/list", {
                workspace_id: workspaceId,
            });

            // Backend wraps everything (success or error) in { status, message, data, code }
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
                setError("Unexpected response shape from /vendors/list");
                console.error("Unexpected /vendors/list response:", res.data);
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

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newVendor.shop_name) return;

        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            setCreateError("No workspace selected — cannot create vendor.");
            return;
        }

        setCreating(true);
        setCreateError(null);
        try {
            const res = await apiClient.post("/vendors/create", {
                ...newVendor,
                workspace_id: workspaceId,
            });

            if (res.data?.status === "error") {
                setCreateError(res.data.message || "Failed to create vendor");
                return;
            }

            setShowCreateModal(false);
            setNewVendor({
                shop_name: "",
                contact_person: "",
                phone: "",
                email: "",
                city: "Coimbatore",
                gstin: "",
            });
            // Refetch so the list reflects what the server actually stored
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
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                        Vendors &amp; Subcontractors{" "}
                        <Building2 className="text-[#f5a623]" size={24} />
                    </h1>
                    <p className="text-xs text-[#888] mt-1">
                        Manage vendor directory, contact profiles, and job
                        capabilities
                    </p>
                </div>

                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border-none cursor-pointer self-start sm:self-auto"
                >
                    <Plus size={16} />
                    <span>Add Vendor</span>
                </button>
            </div>

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
                                            <h3 className="text-sm font-bold text-white group-hover:text-[#f5a623] transition-colors">
                                                {vendor.shop_name}
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
                    <div className="bg-[#141414] border border-[#2a2a2a] w-full max-w-lg rounded-2xl p-6 relative">
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
                                <label className="block text-[#aaa] font-semibold mb-1">
                                    Vendor Company Name
                                </label>
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
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[#aaa] font-semibold mb-1">
                                        Contact Person
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
                                        Phone Number
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
        </div>
    );
};

export default VendorsList;
