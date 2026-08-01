import React, { useState, useEffect, useCallback, useRef } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/services/apiClient";
import {
    LayoutDashboard,
    FileText,
    Truck,
    AlertTriangle,
    Scale,
    Building2,
    Bell,
    Settings,
    User,
    LogOut,
    ChevronRight,
    Menu,
    X,
    Plus,
    RefreshCw,
    PackageCheck,
} from "lucide-react";

export const Layout: React.FC = () => {
    const { user, logout, appMode, setAppMode } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);

    // Real workspace data — no hardcoded fallback.
    const [workspaces, setWorkspaces] = useState<
        Array<{ id: number; name: string }>
    >([]);
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(
        null,
    );
    const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
    const [notifCount, setNotifCount] = useState(0);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        loadWorkspaces();
    }, []);

    const loadWorkspaces = async () => {
        try {
            const res = await apiClient.post("/workspaces/list");
            if (res.data?.status === "error") {
                console.error("Failed to fetch workspaces:", res.data.message);
                return;
            }
            const allList: any[] = res.data?.data ?? [];
            if (!Array.isArray(allList) || allList.length === 0) return;

            // ── Filter by current mode ──────────────────────────────────────
            // Principal → only workspaces this user OWNS (owner_id === user.id)
            // Vendor    → only workspaces this user is a MEMBER of (not owner)
            const filtered =
                appMode === "vendor"
                    ? allList.filter((w) => w.owner_id !== user?.id)
                    : allList.filter((w) => w.owner_id === user?.id);

            // Fallback: if filter yields nothing (e.g. mode mismatch), show all
            const list = filtered.length > 0 ? filtered : allList;
            setWorkspaces(list);

            // Restore active workspace from localStorage if it's in the filtered set
            const cachedId = localStorage.getItem("workspace_id");
            const matchesCached =
                cachedId && list.some((w: any) => String(w.id) === cachedId);
            const active = matchesCached ? Number(cachedId) : list[0].id;
            const activeWs = list.find((w: any) => w.id === active);

            if (activeWs) {
                localStorage.setItem("workspace_id", String(activeWs.id));
                localStorage.setItem("workspace_name", activeWs.name);
                setActiveWorkspaceId(activeWs.id);
            }
        } catch (e) {
            console.error("Failed to load workspace:", e);
        }
    };

    // -------------------------------------------------------------------------
    // Notification badge: fetch unread count from API, refresh every 60s
    // -------------------------------------------------------------------------
    const fetchNotifCount = useCallback(async (wsId: number) => {
        try {
            const res = await apiClient.post("/notifications/unread-count", {
                workspace_id: wsId,
            });
            const count =
                res?.data?.data?.count ??
                res?.data?.count ??
                0;
            setNotifCount(count);
        } catch {
            // Silently fail — badge stays at last known value
        }
    }, []);

    // Start / restart polling whenever the active workspace changes
    useEffect(() => {
        if (!activeWorkspaceId) return;

        // Fetch immediately
        fetchNotifCount(activeWorkspaceId);

        // Then every 60 seconds
        pollRef.current = setInterval(() => {
            fetchNotifCount(activeWorkspaceId);
        }, 60_000);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [activeWorkspaceId, fetchNotifCount]);

    // Called only when the user explicitly picks a different workspace
    // from the dropdown — this is the one place that should reload.
    const switchWorkspace = (id: number) => {
        if (id === activeWorkspaceId) {
            setWorkspaceDropdownOpen(false);
            return;
        }
        const ws = workspaces.find((w) => w.id === id);
        if (!ws) return;
        localStorage.setItem("workspace_id", String(ws.id));
        localStorage.setItem("workspace_name", ws.name);
        setWorkspaceDropdownOpen(false);
        window.location.reload();
    };

    const activeWorkspaceName = workspaces.find(
        (w) => w.id === activeWorkspaceId,
    )?.name;

    const allNavigationItems = [
        { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard, principalOnly: false },
        {
            name: "Job Orders",
            path: "/job-orders",
            icon: FileText,
            badge: "Active",
            principalOnly: false,
        },
        { name: "Delivery Challans", path: "/challans", icon: Truck, principalOnly: false },
        {
            name: "Quality Rejections",
            path: "/rejections",
            icon: AlertTriangle,
            principalOnly: false,
        },
        { name: "Reconciliations", path: "/reconciliations", icon: Scale, principalOnly: false },
        { name: "Vendors", path: "/vendors", icon: Building2, principalOnly: true },
        { name: "Notifications", path: "/notifications", icon: Bell, count: notifCount, principalOnly: false },
        {
            name: "Workspace Settings",
            path: "/workspace/settings",
            icon: Settings,
            principalOnly: true,
        },
        { name: "My Profile", path: "/profile", icon: User, principalOnly: false },
    ];

    // Hide principal-only items when in Vendor mode
    const navigationItems = allNavigationItems.filter(
        (item) => !item.principalOnly || appMode === 'principal'
    );

    const activeItem =
        navigationItems.find((item) =>
            location.pathname.startsWith(item.path),
        ) || navigationItems[0];

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col font-sans">
            {/* Top Navbar Header */}
            <header className="h-16 bg-[#141414] border-b border-[#262626] sticky top-0 z-40 flex items-center justify-between px-4 lg:px-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="hidden md:flex p-2 rounded-lg hover:bg-[#262626] text-[#888] hover:text-white transition-colors"
                        title="Toggle Sidebar"
                    >
                        <Menu size={20} />
                    </button>

                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 rounded-lg hover:bg-[#262626] text-[#888] hover:text-white"
                    >
                        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>

                    <Link
                        to="/dashboard"
                        className="flex items-center gap-2.5 no-underline"
                    >
                        <span className="text-2xl">📋</span>
                        <span className="font-black text-xl tracking-tight text-[#f5a623]">
                            JobTrack
                        </span>
                        <span className="hidden sm:inline-block text-[10px] uppercase font-bold bg-[#f5a623]/20 text-[#f5a623] px-2 py-0.5 rounded border border-[#f5a623]/30">
                            Web
                        </span>
                    </Link>

                    {/* Workspace Switcher */}
                    {activeWorkspaceName && (
                        <div className="relative hidden lg:block">
                            <button
                                onClick={() =>
                                    setWorkspaceDropdownOpen(
                                        !workspaceDropdownOpen,
                                    )
                                }
                                className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] px-3 py-1.5 rounded-lg text-xs hover:border-[#3a3a3a] transition-all cursor-pointer"
                            >
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-[#888]">Workspace:</span>
                                <span className="font-semibold text-white">
                                    {activeWorkspaceName}
                                </span>
                                {workspaces.length > 1 && (
                                    <ChevronRight
                                        size={12}
                                        className={`text-[#666] transition-transform ${workspaceDropdownOpen ? "rotate-90" : ""}`}
                                    />
                                )}
                            </button>

                            {workspaceDropdownOpen && workspaces.length > 1 && (
                                <div className="absolute left-0 mt-2 w-64 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl shadow-2xl py-2 z-50">
                                    <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-[#666] font-bold">
                                        Switch Workspace
                                    </div>
                                    {workspaces.map((ws) => (
                                        <button
                                            key={ws.id}
                                            onClick={() =>
                                                switchWorkspace(ws.id)
                                            }
                                            className={`w-full text-left flex items-center justify-between px-4 py-2 text-xs border-none bg-transparent cursor-pointer ${
                                                ws.id === activeWorkspaceId
                                                    ? "text-[#f5a623] font-bold"
                                                    : "text-gray-300 hover:bg-[#262626] hover:text-white"
                                            }`}
                                        >
                                            <span className="truncate">
                                                {ws.name}
                                            </span>
                                            {ws.id === activeWorkspaceId && (
                                                <span className="text-[10px]">
                                                    Active
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Mode Badge */}
                    <div className="hidden lg:flex items-center gap-2">
                        <span
                            className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                                appMode === 'principal'
                                    ? 'bg-[#f5a623]/10 text-[#f5a623] border-[#f5a623]/30'
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            }`}
                        >
                            {appMode === 'principal'
                                ? <><Building2 size={12} /> Principal</>
                                : <><PackageCheck size={12} /> Vendor</>
                            }
                        </span>
                        <button
                            onClick={() => { window.location.href = '/select-role'; }}
                            title="Switch mode"
                            className="p-1.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-[#666] hover:text-white hover:border-[#3a3a3a] transition-all"
                        >
                            <RefreshCw size={13} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Quick Actions — only show in principal mode */}
                    {appMode === 'principal' && (
                        <Link
                            to="/job-orders?action=new"
                            className="hidden sm:flex items-center gap-1.5 bg-[#f5a623] text-black font-semibold text-xs px-3.5 py-2 rounded-xl hover:bg-[#e0951c] transition-colors no-underline"
                        >
                            <Plus size={16} />
                            <span>New Job Order</span>
                        </Link>
                    )}

                    {/* Notification Bell */}
                    <Link
                        to="/notifications"
                        className="relative p-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-[#aaa] hover:text-white hover:border-[#3a3a3a] transition-all no-underline flex items-center justify-center"
                    >
                        <Bell size={18} />
                        {notifCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-[10px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-0.5">
                                {notifCount > 99 ? "99+" : notifCount}
                            </span>
                        )}
                    </Link>

                    {/* User Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() =>
                                setUserDropdownOpen(!userDropdownOpen)
                            }
                            className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] p-1.5 pr-3 rounded-xl hover:border-[#3a3a3a] transition-all cursor-pointer"
                        >
                            <div className="w-7 h-7 rounded-lg bg-[#f5a623] text-black font-bold text-xs flex items-center justify-center uppercase">
                                {user?.name ? user.name.charAt(0) : "U"}
                            </div>
                            <span className="hidden md:inline-block text-xs font-semibold text-gray-200 max-w-[120px] truncate">
                                {user?.name || "User"}
                            </span>
                        </button>

                        {userDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                                <div className="px-4 py-2 border-b border-[#2a2a2a]">
                                    <p className="text-xs font-bold text-white truncate">
                                        {user?.name || "Admin User"}
                                    </p>
                                    <p className="text-[11px] text-[#888] truncate">
                                        {user?.email || "admin@jobtracker.com"}
                                    </p>
                                </div>
                                <Link
                                    to="/profile"
                                    onClick={() => setUserDropdownOpen(false)}
                                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-300 hover:bg-[#262626] hover:text-white no-underline"
                                >
                                    <User size={15} />
                                    <span>My Profile</span>
                                </Link>
                                <Link
                                    to="/workspace/settings"
                                    onClick={() => setUserDropdownOpen(false)}
                                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-300 hover:bg-[#262626] hover:text-white no-underline"
                                >
                                    <Settings size={15} />
                                    <span>Workspace Settings</span>
                                </Link>
                                <div className="my-1 border-t border-[#2a2a2a]"></div>
                                <button
                                    onClick={logout}
                                    className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 border-none bg-transparent cursor-pointer"
                                >
                                    <LogOut size={15} />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Desktop Sidebar */}
                <aside
                    className={`hidden md:flex flex-col bg-[#141414] border-r border-[#262626] transition-all duration-300 ${
                        sidebarOpen ? "w-64" : "w-20"
                    }`}
                >
                    <div className="p-3 flex-1 flex flex-col gap-1 overflow-y-auto">
                        {navigationItems.map((item) => {
                            const Icon = item.icon;
                            const isActive =
                                location.pathname === item.path ||
                                location.pathname.startsWith(item.path + "/");
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all no-underline ${
                                        isActive
                                            ? "bg-[#f5a623] text-black font-bold shadow-lg shadow-[#f5a623]/20"
                                            : "text-[#999] hover:bg-[#1f1f1f] hover:text-white"
                                    }`}
                                    title={item.name}
                                >
                                    <Icon size={20} className="shrink-0" />
                                    {sidebarOpen && (
                                        <div className="flex-1 flex items-center justify-between truncate">
                                            <span>{item.name}</span>
                                            {item.badge && (
                                                <span
                                                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                                        isActive
                                                            ? "bg-black text-[#f5a623]"
                                                            : "bg-[#262626] text-[#aaa]"
                                                    }`}
                                                >
                                                    {item.badge}
                                                </span>
                                            )}
                                            {item.count && (
                                                <span
                                                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                                        isActive
                                                            ? "bg-black text-[#f5a623]"
                                                            : "bg-amber-500/20 text-amber-400"
                                                    }`}
                                                >
                                                    {item.count}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Sidebar Footer info */}
                    {sidebarOpen && (
                        <div className="p-4 border-t border-[#262626] bg-[#111] text-center text-[11px] text-[#666]">
                            <p className="font-semibold text-[#888]">
                                JobTrack Web v1.2
                            </p>
                            <p className="mt-0.5">Subcontract MSME Portal</p>
                        </div>
                    )}
                </aside>

                {/* Mobile Menu Overlay */}
                {mobileMenuOpen && (
                    <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex">
                        <div className="w-4/5 max-w-xs bg-[#141414] border-r border-[#262626] h-full flex flex-col p-4">
                            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#262626]">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">📋</span>
                                    <span className="font-extrabold text-lg text-[#f5a623]">
                                        JobTrack
                                    </span>
                                </div>
                                <button
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="p-1 rounded-lg text-[#888] hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 space-y-1 overflow-y-auto">
                                {navigationItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive =
                                        location.pathname === item.path;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            onClick={() =>
                                                setMobileMenuOpen(false)
                                            }
                                            className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium no-underline ${
                                                isActive
                                                    ? "bg-[#f5a623] text-black font-bold"
                                                    : "text-[#999] hover:bg-[#222] hover:text-white"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon size={19} />
                                                <span>{item.name}</span>
                                            </div>
                                            <ChevronRight
                                                size={16}
                                                opacity={0.6}
                                            />
                                        </Link>
                                    );
                                })}
                            </div>

                            <div className="pt-4 border-t border-[#262626]">
                                <button
                                    onClick={logout}
                                    className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-400 py-3 rounded-xl font-bold text-sm border border-red-500/20"
                                >
                                    <LogOut size={18} />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        </div>
                        <div
                            className="flex-1"
                            onClick={() => setMobileMenuOpen(false)}
                        ></div>
                    </div>
                )}

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#0d0d0d]">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
