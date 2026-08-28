<?php

namespace App\Http\Controllers\Notification;

use App\Http\Controllers\Controller;
use App\Helpers\HelperFunction;
use App\Models\Notification\Notification;
use App\Models\Workspace\Workspace;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response;

/**
 * --------------------------------------------------------------------------------
 * Notification Controller
 * --------------------------------------------------------------------------------
 * Manages multichain delay, quality, and status alerts for job orders.
 * Permissions are mapped to Module ID 1 (Dashboard / Audit log view).
 *
 * @package App\Http\Controllers\Notification
 * @author  Development Team
 * @version 1.0.0
 * @since   2026-07-03
 * --------------------------------------------------------------------------------
 */
class NotificationController extends Controller
{
    /**
     * Module ID for Dashboard/Auditing access (Module ID = 1).
     */
    const MODULE_ID = 1;

    /**
     * --------------------------------------------------------------------------------
     * List all logged alerts/notifications for a workspace.
     * POST /api/v1/notifications/list
     * --------------------------------------------------------------------------------
     */
    public function list(Request $request)
    {
        try {
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_view) {
                return HelperFunction::response(null, null, 'You do not have permission to view notification logs', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'workspace_id' => 'nullable|integer',
                'channel'      => 'nullable|integer|in:1,2,3,4',
                'status'       => 'nullable|integer|in:1,2,3,4',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $workspaceId = $request->input('workspace_id');

            $workspace = null;
            if ($workspaceId) {
                $workspace = Workspace::where('id', $workspaceId)
                    ->where(function ($q) use ($user) {
                        $q->where('owner_id', $user->id)
                            ->orWhereHas('members', fn($m) => $m->where('users.id', $user->id));
                    })
                    ->first();
            }

            if (!$workspace) {
                $workspace = Workspace::where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                        ->orWhereHas('members', fn($m) => $m->where('users.id', $user->id));
                })->first();
            }

            if (!$workspace) {
                return HelperFunction::response([], null, 'Notification logs fetched successfully', 'success', '000', Response::HTTP_OK);
            }

            $workspaceId = $workspace->id;

            // Auto-link vendor records matching user's workspace names
            $myWorkspaceNames = Workspace::where('owner_id', $user->id)->pluck('name')->toArray();
            if (!empty($myWorkspaceNames)) {
                \App\Models\Vendor\Vendor::whereIn('shop_name', $myWorkspaceNames)
                    ->whereNull('user_id')
                    ->update(['user_id' => $user->id]);
            }

            $myVendorIds = \App\Models\Vendor\Vendor::where('user_id', $user->id)
                ->orWhere(function ($q) use ($user) {
                    if ($user->email) $q->where('email', $user->email);
                    if ($user->phone) $q->orWhere('phone', $user->phone);
                })
                ->pluck('id');

            $myJobOrderIds = \App\Models\Job\JobOrder::whereIn('vendor_id', $myVendorIds)
                ->orWhere('created_by', $user->id)
                ->pluck('id');

            $mode = $request->input('mode') ?? $request->header('X-App-Mode') ?? 'principal';

            $query = Notification::with(['jobOrder', 'vendor', 'user']);

            if ($mode === 'vendor') {
                $query->where(function ($q) use ($myVendorIds, $myJobOrderIds, $user) {
                    if ($myVendorIds->isNotEmpty()) {
                        $q->orWhereIn('vendor_id', $myVendorIds);
                    }
                    if ($myJobOrderIds->isNotEmpty()) {
                        $q->orWhereIn('job_order_id', $myJobOrderIds);
                    }
                    if ($user->email) {
                        $q->orWhere('recipient_email', $user->email);
                    }
                    if ($user->phone) {
                        $q->orWhere('recipient_number', $user->phone);
                    }
                });
            } else {
                $query->where('workspace_id', $workspaceId);
            }

            if ($request->filled('channel')) {
                $query->where('channel', $request->input('channel'));
            }
            if ($request->filled('status')) {
                $query->where('status', $request->input('status'));
            }

            $notifications = $query->orderBy('created_at', 'desc')->get();

            return HelperFunction::response($notifications, null, 'Notification logs fetched successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to fetch notifications: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Dispatch a test notification.
     * POST /api/v1/notifications/send-test
     * --------------------------------------------------------------------------------
     */
    public function sendTest(Request $request)
    {
        try {
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_create) {
                return HelperFunction::response(null, null, 'You do not have permission to trigger notifications', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'workspace_id' => 'required|integer|exists:workspaces,id',
                'channel'      => 'required|integer|in:1,2,3,4', // 1-WhatsApp, 2-SMS, 3-Email, 4-Push
                'message'      => 'required|string',
                'recipient'    => 'required|string',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $workspaceId = $request->input('workspace_id');

            $workspace = Workspace::where('id', $workspaceId)
                ->where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                      ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
                })
                ->first();

            if (!$workspace) {
                return HelperFunction::response(null, null, 'Workspace not found or you do not belong to it', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $channel = (int) $request->input('channel');
            $recipient = $request->input('recipient');

            $notification = Notification::create([
                'workspace_id'     => $workspaceId,
                'channel'          => $channel,
                'type'             => Notification::TYPE_GENERAL,
                'recipient_number' => in_array($channel, [1, 2]) ? $recipient : null,
                'recipient_email'  => $channel == 3 ? $recipient : null,
                'message'          => $request->input('message'),
                'status'           => Notification::STATUS_SENT,
                'sent_at'          => now(),
            ]);

            return HelperFunction::response($notification, null, 'Test notification triggered successfully', 'success', '000', Response::HTTP_CREATED);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to trigger test notification: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Get count of recent (last 30 days) notifications for a workspace.
     * POST /api/v1/notifications/unread-count
     * --------------------------------------------------------------------------------
     * Used by the mobile app Dashboard bell badge.
     */
    public function unreadCount(Request $request)
    {
        try {
            $validation = Validator::make($request->all(), [
                'workspace_id' => 'nullable|integer',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $workspaceId = $request->input('workspace_id');

            $workspace = null;
            if ($workspaceId) {
                $workspace = Workspace::where('id', $workspaceId)
                    ->where(function ($q) use ($user) {
                        $q->where('owner_id', $user->id)
                            ->orWhereHas('members', fn($m) => $m->where('users.id', $user->id));
                    })
                    ->first();
            }

            if (!$workspace) {
                $workspace = Workspace::where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                        ->orWhereHas('members', fn($m) => $m->where('users.id', $user->id));
                })->first();
            }

            if (!$workspace) {
                return HelperFunction::response(['count' => 0], null, 'Unread count fetched', 'success', '000', Response::HTTP_OK);
            }

            $workspaceId = $workspace->id;

            // Auto-link vendor records matching user's workspace names
            $myWorkspaceNames = Workspace::where('owner_id', $user->id)->pluck('name')->toArray();
            if (!empty($myWorkspaceNames)) {
                \App\Models\Vendor\Vendor::whereIn('shop_name', $myWorkspaceNames)
                    ->whereNull('user_id')
                    ->update(['user_id' => $user->id]);
            }

            $myVendorIds = \App\Models\Vendor\Vendor::where('user_id', $user->id)
                ->orWhere(function ($q) use ($user) {
                    if ($user->email) $q->where('email', $user->email);
                    if ($user->phone) $q->orWhere('phone', $user->phone);
                })
                ->pluck('id');

            $myJobOrderIds = \App\Models\Job\JobOrder::whereIn('vendor_id', $myVendorIds)
                ->orWhere('created_by', $user->id)
                ->pluck('id');

            $mode = $request->input('mode') ?? $request->header('X-App-Mode') ?? 'principal';

            $query = Notification::where('created_at', '>=', now()->subDays(30));

            if ($mode === 'vendor') {
                $query->where(function ($q) use ($myVendorIds, $myJobOrderIds, $user) {
                    if ($myVendorIds->isNotEmpty()) {
                        $q->orWhereIn('vendor_id', $myVendorIds);
                    }
                    if ($myJobOrderIds->isNotEmpty()) {
                        $q->orWhereIn('job_order_id', $myJobOrderIds);
                    }
                    if ($user->email) {
                        $q->orWhere('recipient_email', $user->email);
                    }
                    if ($user->phone) {
                        $q->orWhere('recipient_number', $user->phone);
                    }
                });
            } else {
                $query->where('workspace_id', $workspaceId);
            }

            $count = $query->count();

            return HelperFunction::response(['count' => $count], null, 'Unread count fetched', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to fetch count: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
