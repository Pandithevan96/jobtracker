import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "@/services/apiClient";
import { useAuth } from "@/context/AuthContext";
import {
    FileText,
    Truck,
    AlertTriangle,
    Scale,
    TrendingUp,
    CheckCircle2,
    ArrowRight,
    Plus,
    Building2,
    ChevronRight,
    Loader2,
    AlertCircle,
} from "lucide-react";

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ElementType;
    color: string;
    trend?: string;
    link: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
    trend,
    link,
}) => (
    <Link
        to={link}
        className="bg-[#141414] border border-[#262626] rounded-2xl p-5 hover:border-[#3a3a3a] hover:bg-[#181818] transition-all no-underline flex flex-col justify-between group"
    >
        <div>
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#888] uppercase tracking-wider">
                    {title}
                </span>
                <div className={`p-2.5 rounded-xl ${color}`}>
                    <Icon size={20} />
                </div>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight mb-1">
                {value}
            </div>
            <p className="text-xs text-[#888]">{subtitle}</p>
        </div>
        {trend && (
            <div className="mt-4 pt-3 border-t border-[#222] flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <TrendingUp size={14} /> {trend}
                </span>
                <span className="text-[#666] group-hover:text-[#f5a623] flex items-center gap-1 font-semibold transition-colors">
                    View all <ChevronRight size={14} />
                </span>
            </div>
        )}
    </Link>
);

/**
 * Returns the correct workspace_id based on the current app_mode.
 * - Principal → uses `workspace_id` (owned workspace)
 * - Vendor    → uses `vendor_workspace_id` (workspace where user is a vendor member)
 * Falls back to fetching from API if nothing is cached.
 */
const getCurrentWorkspaceId = async (): Promise<number | null> => {
    const mode = localStorage.getItem("app_mode") ?? "principal";

    // In vendor mode, prefer the vendor workspace
    if (mode === "vendor") {
        const vendorWsId = localStorage.getItem("vendor_workspace_id");
        if (vendorWsId) return Number(vendorWsId);
    }

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

interface JobOrder {
    id: number;
    order_number: string;
    vendor_name?: string;
    item?: string;
    qty?: number;
    status: string;
    date?: string;
}

interface Challan {
    id: number;
    challan_number: string;
    vendor?: string;
    type?: string;
    items_count?: number;
    status: string;
    date?: string;
}

export const Dashboard: React.FC = () => {
    const { appMode } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [stats, setStats] = useState({
        totalJobOrders: 0,
        activeChallans: 0,
        pendingRejections: 0,
        reconciledCount: 0,
        totalVendors: 0,
    });

    const [recentJobOrders, setRecentJobOrders] = useState<JobOrder[]>([]);
    const [recentChallans, setRecentChallans] = useState<Challan[]>([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        setError(null);

        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            setError("No workspace selected — cannot load dashboard data.");
            setLoading(false);
            return;
        }

        try {
            const [joRes, dcRes, vRes] = await Promise.allSettled([
                apiClient.post("/job-orders/list", {
                    workspace_id: workspaceId,
                }),
                apiClient.post("/challans/list", { workspace_id: workspaceId }),
                apiClient.post("/vendors/list", { workspace_id: workspaceId }),
            ]);

            if (
                joRes.status === "fulfilled" &&
                joRes.value.data?.status !== "error"
            ) {
                const list = joRes.value.data?.data;
                if (Array.isArray(list)) {
                    setRecentJobOrders(list.slice(0, 5));
                    setStats((prev) => ({
                        ...prev,
                        totalJobOrders: list.length,
                    }));
                }
            } else if (joRes.status === "fulfilled") {
                console.error(
                    "job-orders/list error:",
                    joRes.value.data?.message,
                );
            }

            if (
                dcRes.status === "fulfilled" &&
                dcRes.value.data?.status !== "error"
            ) {
                const list = dcRes.value.data?.data;
                if (Array.isArray(list)) {
                    setRecentChallans(list.slice(0, 3));
                    setStats((prev) => ({
                        ...prev,
                        activeChallans: list.length,
                    }));
                }
            } else if (dcRes.status === "fulfilled") {
                console.error(
                    "challans/list error:",
                    dcRes.value.data?.message,
                );
            }

            if (
                vRes.status === "fulfilled" &&
                vRes.value.data?.status !== "error"
            ) {
                const list = vRes.value.data?.data;
                if (Array.isArray(list)) {
                    setStats((prev) => ({
                        ...prev,
                        totalVendors: list.length,
                    }));
                }
            } else if (vRes.status === "fulfilled") {
                console.error("vendors/list error:", vRes.value.data?.message);
            }
        } catch (e) {
            setError("Failed to load dashboard data");
            console.error("Dashboard fetch failed:", e);
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
                    <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">
                        In Progress
                    </span>
                );
            case "6":
            case "completed":
            case "acknowledged":
            case "delivered":
                return (
                    <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">
                        Completed
                    </span>
                );
            case "7":
            case "cancelled":
            case "rejected":
                return (
                    <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">
                        Cancelled
                    </span>
                );
            default:
                return (
                    <span className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">
                        Pending
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#191919] to-[#141414] p-6 rounded-2xl border border-[#2a2a2a]">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                        {appMode === 'vendor' ? 'Received Orders Overview' : 'Operational Overview'}{" "}
                        <span className="text-[#f5a623]">⚡</span>
                    </h1>
                    <p className="text-sm text-[#888] mt-1">
                        {appMode === 'vendor'
                            ? 'Job orders assigned to you by principal companies'
                            : 'Real-time subcontracting job orders, delivery challans, and material reconciliations'}
                    </p>
                </div>

                {appMode === 'principal' && (
                    <div className="flex flex-wrap gap-3">
                        <Link
                            to="/job-orders"
                            className="bg-[#f5a623] hover:bg-[#e0951c] text-black font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 no-underline"
                        >
                            <Plus size={16} />
                            <span>Create Job Order</span>
                        </Link>
                        <Link
                            to="/challans"
                            className="bg-[#222] hover:bg-[#2a2a2a] text-white border border-[#333] font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 no-underline"
                        >
                            <Truck size={16} />
                            <span>Issue Delivery Challan</span>
                        </Link>
                    </div>
                )}
            </div>

            {/* Error state */}
            {error && (
                <div className="flex flex-col items-center justify-center gap-3 text-center py-10 bg-[#141414] border border-[#3a1f1f] rounded-2xl">
                    <AlertCircle size={22} className="text-red-400" />
                    <p className="text-xs text-red-300 max-w-md">{error}</p>
                    <button
                        onClick={fetchDashboardData}
                        className="text-xs font-semibold text-[#f5a623] hover:underline bg-transparent border-none cursor-pointer"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Loading state */}
            {loading && !error && (
                <div className="flex items-center justify-center gap-2 text-[#888] text-xs py-16 bg-[#141414] border border-[#262626] rounded-2xl">
                    <Loader2 size={16} className="animate-spin" />
                    Loading dashboard...
                </div>
            )}

            {!loading && !error && (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                            title="Active Job Orders"
                            value={stats.totalJobOrders}
                            subtitle="Orders in manufacturing cycle"
                            icon={FileText}
                            color="bg-amber-500/10 text-amber-400"
                            link="/job-orders"
                        />
                        <MetricCard
                            title="Delivery Challans"
                            value={stats.activeChallans}
                            subtitle="Issued outward & inward DC"
                            icon={Truck}
                            color="bg-blue-500/10 text-blue-400"
                            link="/challans"
                        />
                        <MetricCard
                            title="Quality Rejections"
                            value={stats.pendingRejections}
                            subtitle="Pending vendor resolution"
                            icon={AlertTriangle}
                            color="bg-rose-500/10 text-rose-400"
                            link="/rejections"
                        />
                        <MetricCard
                            title="Connected Vendors"
                            value={stats.totalVendors}
                            subtitle="Subcontracting partners"
                            icon={Building2}
                            color="bg-emerald-500/10 text-emerald-400"
                            link="/vendors"
                        />
                    </div>

                    {/* Main Grid: Job Orders & Challans */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Recent Job Orders Table */}
                        <div className="lg:col-span-2 bg-[#141414] border border-[#262626] rounded-2xl p-5 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h2 className="text-lg font-bold text-white">
                                            Recent Job Orders
                                        </h2>
                                        <p className="text-xs text-[#888]">
                                            Live processing status across
                                            vendors
                                        </p>
                                    </div>
                                    <Link
                                        to="/job-orders"
                                        className="text-xs text-[#f5a623] hover:underline font-semibold flex items-center gap-1 no-underline"
                                    >
                                        View All <ArrowRight size={14} />
                                    </Link>
                                </div>

                                {recentJobOrders.length === 0 ? (
                                    <div className="text-center py-10 text-xs text-[#888]">
                                        No job orders yet.{" "}
                                        <Link
                                            to="/job-orders"
                                            className="text-[#f5a623] hover:underline"
                                        >
                                            Create your first one
                                        </Link>
                                        .
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-[#262626] text-[11px] uppercase tracking-wider text-[#777]">
                                                    <th className="py-2.5 px-3">
                                                        Order Ref
                                                    </th>
                                                    <th className="py-2.5 px-3">
                                                        {appMode === 'vendor' ? 'Principal / Sender' : 'Vendor'}
                                                    </th>
                                                    <th className="py-2.5 px-3">
                                                        Item / Description
                                                    </th>
                                                    <th className="py-2.5 px-3 text-right">
                                                        Qty
                                                    </th>
                                                    <th className="py-2.5 px-3">
                                                        Status
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#222] text-xs">
                                                {recentJobOrders.map((jo: any) => (
                                                    <tr
                                                        key={jo.id}
                                                        className="hover:bg-[#1a1a1a] transition-colors"
                                                    >
                                                        <td className="py-3 px-3 font-mono font-bold text-amber-400">
                                                            <Link
                                                                to={`/job-orders`}
                                                                className="no-underline text-amber-400 hover:underline"
                                                            >
                                                                {
                                                                    jo.order_number || jo.job_order_number || `#${jo.id}`
                                                                }
                                                            </Link>
                                                        </td>
                                                        <td className="py-3 px-3 text-gray-200 font-medium">
                                                            {appMode === 'vendor'
                                                                ? (jo.workspace?.name || jo.creator?.name || "—")
                                                                : (jo.vendor?.shop_name || jo.vendor_name || "—")}
                                                        </td>
                                                        <td className="py-3 px-3 text-[#aaa] max-w-[200px] truncate">
                                                            {jo.part_name || jo.item || "—"}
                                                        </td>
                                                        <td className="py-3 px-3 text-right font-mono font-bold text-white">
                                                            {jo.quantity_sent ?? jo.qty ?? "—"}
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            {getStatusBadge(
                                                                jo.status,
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 pt-3 border-t border-[#222] flex items-center justify-between text-xs text-[#777]">
                                <span>
                                    Showing recent {recentJobOrders.length}{" "}
                                    transactions
                                </span>
                                <span className="flex items-center gap-1 text-emerald-400">
                                    <CheckCircle2 size={14} /> Systems active
                                </span>
                            </div>
                        </div>

                        {/* Side Panel: Delivery Challans & Quick Summary */}
                        <div className="space-y-6">
                            {/* Active Delivery Challans */}
                            <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                                        <Truck
                                            size={18}
                                            className="text-blue-400"
                                        />
                                        Delivery Challans
                                    </h3>
                                    <Link
                                        to="/challans"
                                        className="text-xs text-[#f5a623] hover:underline font-semibold no-underline"
                                    >
                                        Manage
                                    </Link>
                                </div>

                                {recentChallans.length === 0 ? (
                                    <p className="text-xs text-[#888] text-center py-6">
                                        No delivery challans yet.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {recentChallans.map((dc) => (
                                            <div
                                                key={dc.id}
                                                className="bg-[#1a1a1a] border border-[#2a2a2a] p-3 rounded-xl"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-mono font-bold text-xs text-white">
                                                        {dc.challan_number}
                                                    </span>
                                                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-bold uppercase">
                                                        {dc.type || "—"}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-[#888] mt-1 flex justify-between">
                                                    <span>
                                                        {dc.vendor || "—"}
                                                    </span>
                                                    <span>
                                                        {dc.items_count ?? 0}{" "}
                                                        Line Items
                                                    </span>
                                                </div>
                                                <div className="mt-2 pt-2 border-t border-[#262626] flex items-center justify-between text-[11px]">
                                                    <span className="text-[#666]">
                                                        {dc.date || "—"}
                                                    </span>
                                                    {getStatusBadge(dc.status)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Reconciliation & Quality Shortcut */}
                            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-[#2a2a2a] p-5 rounded-2xl space-y-3">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Scale
                                        size={18}
                                        className="text-emerald-400"
                                    />
                                    Reconciliation & Audits
                                </h3>
                                <p className="text-xs text-[#888]">
                                    Automated material balance check comparing
                                    dispatched stock with vendor returned
                                    quantities.
                                </p>
                                <div className="pt-2 flex gap-2">
                                    <Link
                                        to="/reconciliations"
                                        className="flex-1 bg-[#242424] hover:bg-[#2e2e2e] text-xs font-bold text-center py-2 rounded-xl border border-[#333] no-underline text-gray-200"
                                    >
                                        Reconciliation
                                    </Link>
                                    <Link
                                        to="/rejections"
                                        className="flex-1 bg-rose-500/15 hover:bg-rose-500/25 text-xs font-bold text-center py-2 rounded-xl border border-rose-500/30 no-underline text-rose-300"
                                    >
                                        Rejections
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Dashboard;
