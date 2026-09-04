import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import apiClient from "@/services/apiClient";
import {
    Building2,
    ArrowLeft,
    Phone,
    Mail,
    MapPin,
    FileText,
    CheckCircle2,
    Loader2,
    AlertCircle,
    Globe,
    Plus,
    Calendar,
} from "lucide-react";

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
        } finally {
            workspaceFetchPromise = null;
        }
    })();

    return workspaceFetchPromise;
};

export const VendorDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [vendor, setVendor] = useState<any>(null);
    const [jobOrders, setJobOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            fetchVendorData();
        }
    }, [id]);

    const fetchVendorData = async () => {
        setLoading(true);
        setError(null);
        try {
            const vendorId = Number(id);
            const workspaceId = await getCurrentWorkspaceId();

            const [vRes, joRes] = await Promise.allSettled([
                apiClient.post("/vendors/details", { id: vendorId }),
                workspaceId
                    ? apiClient.post("/job-orders/list", {
                          workspace_id: workspaceId,
                          vendor_id: vendorId,
                      })
                    : Promise.resolve(null),
            ]);

            if (vRes.status === "fulfilled" && vRes.value?.data?.status !== "error") {
                const data = vRes.value.data?.data;
                if (data) {
                    setVendor(data);
                } else {
                    setError("Vendor profile not found");
                }
            } else {
                const msg =
                    vRes.status === "fulfilled"
                        ? vRes.value?.data?.message
                        : "Failed to fetch vendor details";
                setError(msg || "Failed to fetch vendor details");
            }

            if (
                joRes.status === "fulfilled" &&
                joRes.value &&
                joRes.value.data?.status !== "error"
            ) {
                const list = joRes.value.data?.data;
                if (Array.isArray(list)) {
                    setJobOrders(list);
                }
            }
        } catch (e: any) {
            setError(e?.message || "Failed to load vendor data");
            console.error("VendorDetail fetch error:", e);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: any) => {
        const str = String(status ?? "").toLowerCase();
        switch (str) {
            case "2":
            case "material out":
            case "in_progress":
            case "in transit":
            case "wip":
            case "3":
                return (
                    <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase">
                        In Progress
                    </span>
                );
            case "6":
            case "completed":
            case "acknowledged":
            case "delivered":
                return (
                    <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase">
                        Completed
                    </span>
                );
            case "7":
            case "cancelled":
            case "rejected":
                return (
                    <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase">
                        Cancelled
                    </span>
                );
            default:
                return (
                    <span className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase">
                        Pending
                    </span>
                );
        }
    };

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto flex items-center justify-center gap-2 text-[#888] text-xs py-20 bg-[#141414] border border-[#262626] rounded-2xl">
                <Loader2 size={20} className="animate-spin text-[#f5a623]" />
                Loading vendor details...
            </div>
        );
    }

    if (error || !vendor) {
        return (
            <div className="max-w-5xl mx-auto space-y-6">
                <Link
                    to="/vendors"
                    className="inline-flex items-center gap-2 text-xs font-bold text-[#888] hover:text-white no-underline transition-colors"
                >
                    <ArrowLeft size={16} /> Back to Vendors Directory
                </Link>
                <div className="flex flex-col items-center justify-center gap-3 text-center py-16 bg-[#141414] border border-[#3a1f1f] rounded-2xl">
                    <AlertCircle size={24} className="text-red-400" />
                    <p className="text-xs text-red-300 max-w-md">
                        {error || "Vendor not found"}
                    </p>
                    <button
                        onClick={fetchVendorData}
                        className="text-xs font-semibold text-[#f5a623] hover:underline bg-transparent border-none cursor-pointer"
                    >
                        Retry Loading
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Navigation back */}
            <Link
                to="/vendors"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#888] hover:text-white no-underline transition-colors"
            >
                <ArrowLeft size={16} /> Back to Vendors Directory
            </Link>

            {/* Vendor Main Header Card */}
            <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#f5a623]/10 border border-[#f5a623]/30 text-[#f5a623] font-black text-2xl flex items-center justify-center shrink-0">
                        {vendor.shop_name ? vendor.shop_name.charAt(0).toUpperCase() : "V"}
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                            <span>{vendor.shop_name}</span>
                            {vendor.user_id && (
                                <Globe
                                    size={16}
                                    className="text-emerald-400"
                                    title="Linked Network Workspace"
                                />
                            )}
                        </h1>
                        <p className="text-xs text-[#888] flex items-center gap-2 mt-1">
                            {vendor.city && (
                                <>
                                    <MapPin size={14} className="text-amber-400" />
                                    <span>{vendor.city}</span>
                                    <span className="text-[#444]">|</span>
                                </>
                            )}
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 size={13} /> Active Subcontract Partner
                            </span>
                        </p>
                    </div>
                </div>

                <Link
                    to={`/job-orders?action=new&vendor_id=${vendor.id}`}
                    className="bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold text-xs px-4 py-2.5 rounded-xl no-underline flex items-center gap-1.5 transition-all self-start md:self-auto shrink-0"
                >
                    <Plus size={16} />
                    <span>Assign New Job Order</span>
                </Link>
            </div>

            {/* Profile & Orders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Vendor Contact Information */}
                <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Building2 size={18} className="text-amber-400" />
                        Vendor Profile &amp; Contact
                    </h3>

                    <div className="space-y-3 text-xs divide-y divide-[#222]">
                        {vendor.contact_person && (
                            <div className="pt-2">
                                <span className="text-[#888] block mb-1">
                                    Contact Representative:
                                </span>
                                <span className="font-semibold text-white">
                                    {vendor.contact_person}
                                </span>
                            </div>
                        )}

                        <div className="pt-2">
                            <span className="text-[#888] block mb-1">
                                Phone Number:
                            </span>
                            <a
                                href={`tel:${vendor.phone}`}
                                className="text-amber-400 font-semibold no-underline hover:underline flex items-center gap-1.5"
                            >
                                <Phone size={13} className="text-[#888]" />
                                <span>{vendor.phone}</span>
                            </a>
                        </div>

                        {vendor.email && (
                            <div className="pt-2">
                                <span className="text-[#888] block mb-1">
                                    Email Address:
                                </span>
                                <a
                                    href={`mailto:${vendor.email}`}
                                    className="text-blue-400 no-underline hover:underline flex items-center gap-1.5 truncate"
                                >
                                    <Mail size={13} className="text-[#888]" />
                                    <span className="truncate">{vendor.email}</span>
                                </a>
                            </div>
                        )}

                        {vendor.gstin && (
                            <div className="pt-2">
                                <span className="text-[#888] block mb-1">
                                    GSTIN Number:
                                </span>
                                <span className="font-mono text-gray-300">
                                    {vendor.gstin}
                                </span>
                            </div>
                        )}

                        {vendor.address && (
                            <div className="pt-2">
                                <span className="text-[#888] block mb-1">
                                    Factory Address:
                                </span>
                                <span className="text-gray-300 leading-relaxed">
                                    {vendor.address}
                                    {vendor.pincode ? ` - ${vendor.pincode}` : ""}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Job Orders Assigned to Vendor */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <FileText size={18} className="text-blue-400" />
                                Job Orders with Vendor ({jobOrders.length})
                            </h3>
                            <Link
                                to={`/job-orders?action=new&vendor_id=${vendor.id}`}
                                className="text-xs text-[#f5a623] font-semibold hover:underline no-underline"
                            >
                                + Create Order
                            </Link>
                        </div>

                        {jobOrders.length === 0 ? (
                            <div className="text-center py-12 text-xs text-[#888] bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
                                <FileText size={24} className="text-[#555] mx-auto mb-2" />
                                <p>No job orders assigned to this vendor yet.</p>
                                <Link
                                    to={`/job-orders?action=new&vendor_id=${vendor.id}`}
                                    className="inline-block mt-3 text-[#f5a623] font-bold hover:underline"
                                >
                                    Create First Job Order →
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {jobOrders.map((jo) => (
                                    <div
                                        key={jo.id}
                                        className="bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a] p-4 rounded-xl flex items-center justify-between text-xs transition-colors"
                                    >
                                        <div>
                                            <Link
                                                to={`/job-orders/${jo.id}`}
                                                className="font-mono font-bold text-amber-400 text-sm no-underline hover:underline block"
                                            >
                                                {jo.order_number || jo.job_order_number || `#JO-${jo.id}`}
                                            </Link>
                                            <span className="text-white font-semibold mt-1 block">
                                                {jo.part_name || jo.item || "Unspecified Item"}
                                            </span>
                                            {jo.due_date && (
                                                <span className="text-[11px] text-[#777] flex items-center gap-1 mt-1">
                                                    <Calendar size={12} />
                                                    <span>Due: {String(jo.due_date).split('T')[0]}</span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-right space-y-1.5">
                                            <span className="font-mono font-bold text-white text-xs block">
                                                {jo.quantity_sent ?? jo.qty ?? 0} {jo.uom || "Nos"}
                                            </span>
                                            <div>{getStatusBadge(jo.status)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VendorDetail;
