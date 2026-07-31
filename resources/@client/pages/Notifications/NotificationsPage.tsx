import React, { useState, useEffect, useCallback } from "react";
import apiClient from "@/services/apiClient";
import {
    Bell,
    CheckCircle2,
    AlertTriangle,
    Truck,
    Info,
    Loader2,
} from "lucide-react";

interface NotificationItem {
    id: number;
    title: string;
    message: string;
    type: "job" | "challan" | "rejection" | "system";
    created_at: string;
    read: boolean;
}

export const NotificationsPage: React.FC = () => {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [markingAll, setMarkingAll] = useState(false);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.get("/notifications");
            const payload = res?.data?.notifications ?? res?.data ?? [];
            setNotifications(Array.isArray(payload) ? payload : []);
        } catch (e: any) {
            // 404 means the endpoint isn't available yet / no data — treat as empty, not a hard error.
            const status = e?.response?.status;
            if (status === 404) {
                setNotifications([]);
            } else {
                setNotifications([]);
                setError("Unable to load notifications. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const markAllRead = async () => {
        setMarkingAll(true);
        try {
            await apiClient.post("/notifications/mark-all-read");
            setNotifications((prev) =>
                Array.isArray(prev)
                    ? prev.map((n) => ({ ...n, read: true }))
                    : [],
            );
        } catch (e) {
            setError("Unable to mark notifications as read.");
        } finally {
            setMarkingAll(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "challan":
                return <Truck className="text-blue-400" size={18} />;
            case "rejection":
                return <AlertTriangle className="text-rose-400" size={18} />;
            case "job":
                return <CheckCircle2 className="text-emerald-400" size={18} />;
            default:
                return <Info className="text-amber-400" size={18} />;
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                        Activity &amp; Notifications{" "}
                        <Bell className="text-amber-400" size={24} />
                    </h1>
                    <p className="text-xs text-[#888] mt-1">
                        Real-time alerts for job updates, challan dispatches,
                        and rejections
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={markAllRead}
                        disabled={
                            markingAll || loading || notifications.length === 0
                        }
                        className="bg-[#1e1e1e] hover:bg-[#282828] text-gray-200 border border-[#333] font-semibold text-xs px-3.5 py-2 rounded-xl border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {markingAll ? "Marking..." : "Mark All Read"}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs rounded-xl px-4 py-3">
                    {error}
                </div>
            )}

            <div className="bg-[#141414] border border-[#262626] rounded-2xl divide-y divide-[#222] overflow-hidden">
                {loading ? (
                    <div className="p-10 flex flex-col items-center justify-center gap-2 text-[#666]">
                        <Loader2 className="animate-spin" size={20} />
                        <span className="text-xs">
                            Loading notifications...
                        </span>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-10 flex flex-col items-center justify-center gap-2 text-[#666]">
                        <Bell size={20} />
                        <span className="text-xs">No notifications yet.</span>
                    </div>
                ) : (
                    notifications.map((n) => (
                        <div
                            key={n.id}
                            className={`p-4 flex items-start gap-3.5 transition-colors ${
                                !n.read ? "bg-[#181818]" : "hover:bg-[#181818]"
                            }`}
                        >
                            <div className="p-2.5 rounded-xl bg-[#222] shrink-0 mt-0.5">
                                {getIcon(n.type)}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <h3
                                        className={`text-xs font-bold ${!n.read ? "text-white" : "text-gray-300"}`}
                                    >
                                        {n.title}
                                    </h3>
                                    <span className="text-[10px] text-[#666] font-mono shrink-0">
                                        {n.created_at}
                                    </span>
                                </div>
                                <p className="text-xs text-[#aaa] mt-1 leading-relaxed">
                                    {n.message}
                                </p>
                            </div>

                            {!n.read && (
                                <span className="w-2 h-2 rounded-full bg-amber-400 mt-2 shrink-0"></span>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
