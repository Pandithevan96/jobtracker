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

            // Auto-link vendor records and sync workspace memberships
            $myVendorIds = \App\Models\Vendor\Vendor::syncUserVendors($user);

            $workspace = null;
            if ($workspaceId) {
                $workspace = Workspace::find($workspaceId);
            }
            if (!$workspace) {
                $workspace = Workspace::where('owner_id', $user->id)
                    ->orWhereHas('members', fn($m) => $m->where('users.id', $user->id))
                    ->first();
            }

            $resolvedWsId = $workspace ? $workspace->id : $workspaceId;

            $myJobOrderIds = \App\Models\Job\JobOrder::whereIn('vendor_id', $myVendorIds)
                ->orWhere('created_by', $user->id)
                ->pluck('id')
                ->toArray();

            // Auto-backfill notification records for any Job Orders assigned to vendor that don't have a notification record yet
            if (!empty($myJobOrderIds)) {
                $jobOrders = \App\Models\Job\JobOrder::with(['vendor', 'workspace', 'creator'])->whereIn('id', $myJobOrderIds)->get();
                foreach ($jobOrders as $jo) {
                    $exists = Notification::where('job_order_id', $jo->id)
                        ->where('type', Notification::TYPE_JOB_CREATED)
                        ->exists();
                    if (!$exists) {
                        $senderName = $jo->workspace?->name ?? $jo->creator?->name ?? 'Principal';
                        Notification::create([
                            'workspace_id'     => $jo->workspace_id,
                            'job_order_id'     => $jo->id,
                            'vendor_id'        => $jo->vendor_id,
                            'user_id'          => $jo->created_by,
                            'channel'          => Notification::CHANNEL_WHATSAPP,
                            'type'             => Notification::TYPE_JOB_CREATED,
                            'recipient_number' => $jo->vendor?->whatsapp_number ?? $jo->vendor?->phone ?? null,
                            'recipient_email'  => $jo->vendor?->email ?? null,
                            'message'          => sprintf(
                                '📦 New Job Order %s (%s) received from %s. Quantity: %s %s.',
                                $jo->order_number,
                                $jo->part_name,
                                $senderName,
                                $jo->quantity_sent,
                                $jo->uom
                            ),
                            'status'           => Notification::STATUS_PENDING,
                            'sent_at'          => $jo->created_at ?? now(),
                        ]);
                    }
                }
            }

            $mode = $request->input('mode') ?? $request->header('X-App-Mode') ?? 'principal';

            $query = Notification::with(['jobOrder.workspace', 'jobOrder.creator', 'vendor', 'user']);

            if ($mode === 'vendor') {
                $query->where(function ($q) use ($myVendorIds, $myJobOrderIds, $user) {
                    $hasCond = false;
                    if (!empty($myJobOrderIds)) {
                        $q->whereIn('job_order_id', $myJobOrderIds);
                        $hasCond = true;
                    }
                    if (!empty($myVendorIds)) {
                        if ($hasCond) $q->orWhereIn('vendor_id', $myVendorIds);
                        else { $q->whereIn('vendor_id', $myVendorIds); $hasCond = true; }
                    }
                    if ($user->email) {
                        if ($hasCond) $q->orWhere('recipient_email', $user->email);
                        else { $q->where('recipient_email', $user->email); $hasCond = true; }
                    }
                    if ($user->phone) {
                        if ($hasCond) $q->orWhere('recipient_number', $user->phone);
                        else { $q->where('recipient_number', $user->phone); $hasCond = true; }
                    }
                    if (!$hasCond) {
                        $q->whereRaw('1 = 0');
                    }
                });
            } else {
                $query->where('workspace_id', $resolvedWsId);
            }

            if ($request->filled('channel')) {
                $query->where('channel', $request->input('channel'));
            }
            if ($request->filled('status')) {
                $query->where('status', $request->input('status'));
            }

            $notifications = $query->orderBy('created_at', 'desc')->get();

            $formatted = $notifications->map(function ($n) use ($mode) {
                $typeLabel = 'system';
                if ($n->type === Notification::TYPE_JOB_CREATED || $n->type === Notification::TYPE_STATUS_UPDATE) {
                    $typeLabel = 'job';
                } elseif ($n->type === Notification::TYPE_DC_GENERATED) {
                    $typeLabel = 'challan';
                } elseif ($n->type === Notification::TYPE_REJECTION_ALERT) {
                    $typeLabel = 'rejection';
                }

                $title = 'System Alert';
                if ($n->type === Notification::TYPE_JOB_CREATED) {
                    $title = 'New Job Order Assigned';
                } elseif ($n->type === Notification::TYPE_STATUS_UPDATE) {
                    $title = 'Job Order Status Update';
                } elseif ($n->type === Notification::TYPE_DC_GENERATED) {
                    $title = 'Delivery Challan Update';
                } elseif ($n->type === Notification::TYPE_REJECTION_ALERT) {
                    $title = 'Quality Rejection Alert';
                }

                $msg = $n->message;

                // Format notification text for vendor view: state "received from <sender>" instead of "assigned to <vendor>"
                if ($mode === 'vendor') {
                    $senderName = $n->jobOrder?->workspace?->name ?? $n->user?->name ?? "pandideva's Workspace";
                    $msg = preg_replace('/has been assigned to [^.]+/i', 'received from ' . $senderName, $msg);
                }

                return [
                    'id'         => $n->id,
                    'title'      => $title,
                    'message'    => $msg,
                    'type'       => $typeLabel,
                    'created_at' => $n->created_at ? $n->created_at->diffForHumans() : 'Recently',
                    'read'       => $n->status === Notification::STATUS_DELIVERED || $n->status === Notification::STATUS_SENT,
                ];
            });

            return HelperFunction::response($formatted, null, 'Notification logs fetched successfully', 'success', '000', Response::HTTP_OK);
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

            // Auto-link vendor records and sync workspace memberships
            $myVendorIds = \App\Models\Vendor\Vendor::syncUserVendors($user);

            $workspace = null;
            if ($workspaceId) {
                $workspace = Workspace::find($workspaceId);
            }
            if (!$workspace) {
                $workspace = Workspace::where('owner_id', $user->id)
                    ->orWhereHas('members', fn($m) => $m->where('users.id', $user->id))
                    ->first();
            }

            $resolvedWsId = $workspace ? $workspace->id : $workspaceId;

            $myJobOrderIds = \App\Models\Job\JobOrder::whereIn('vendor_id', $myVendorIds)
                ->orWhere('created_by', $user->id)
                ->pluck('id')
                ->toArray();

            $mode = $request->input('mode') ?? $request->header('X-App-Mode') ?? 'principal';

            $query = Notification::where('created_at', '>=', now()->subDays(30));

            if ($mode === 'vendor') {
                $query->where(function ($q) use ($myVendorIds, $myJobOrderIds, $user) {
                    $hasCond = false;
                    if (!empty($myJobOrderIds)) {
                        $q->whereIn('job_order_id', $myJobOrderIds);
                        $hasCond = true;
                    }
                    if (!empty($myVendorIds)) {
                        if ($hasCond) $q->orWhereIn('vendor_id', $myVendorIds);
                        else { $q->whereIn('vendor_id', $myVendorIds); $hasCond = true; }
                    }
                    if ($user->email) {
                        if ($hasCond) $q->orWhere('recipient_email', $user->email);
                        else { $q->where('recipient_email', $user->email); $hasCond = true; }
                    }
                    if ($user->phone) {
                        if ($hasCond) $q->orWhere('recipient_number', $user->phone);
                        else { $q->where('recipient_number', $user->phone); $hasCond = true; }
                    }
                    if (!$hasCond) {
                        $q->whereRaw('1 = 0');
                    }
                });
            } else {
                $query->where('workspace_id', $resolvedWsId);
            }

            $count = $query->count();

            return HelperFunction::response(['count' => $count], null, 'Unread count fetched', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to fetch count: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
