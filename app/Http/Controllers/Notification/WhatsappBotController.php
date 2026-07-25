<?php

namespace App\Http\Controllers\Notification;

use App\Http\Controllers\Controller;
use App\Helpers\HelperFunction;
use App\Models\Notification\WhatsappBotLog;
use App\Models\Job\JobOrder;
use App\Models\Job\JobOrderStatusLog;
use App\Models\Vendor\Vendor;
use App\Models\Workspace\Workspace;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response;

/**
 * --------------------------------------------------------------------------------
 * Whatsapp Bot Controller
 * --------------------------------------------------------------------------------
 * Processes incoming message webhooks to update Job Order status via WhatsApp bot.
 * Exposes a public Webhook endpoint and a protected Logs list endpoint.
 *
 * @package App\Http\Controllers\Notification
 * @author  Development Team
 * @version 1.0.0
 * @since   2026-07-03
 * --------------------------------------------------------------------------------
 */
class WhatsappBotController extends Controller
{
    /**
     * Module ID for Dashboard/Audit log (Module ID = 1).
     */
    const MODULE_ID = 1;

    /**
     * --------------------------------------------------------------------------------
     * Webhook for receiving inbound WhatsApp messages (Public).
     * Parses intent like: "STATUS WIP JO-2026-00001" or "READY JO-2026-00001"
     * --------------------------------------------------------------------------------
     */
    public function webhook(Request $request)
    {
        try {
            $validation = Validator::make($request->all(), [
                'from'    => 'required|string',
                'to'      => 'required|string',
                'message' => 'required|string',
                'message_id' => 'nullable|string',
            ]);

            if ($validation->fails()) {
                return response()->json(['status' => 'error', 'message' => $validation->errors()->first()], 400);
            }

            $fromNumber  = $request->input('from');
            $toNumber    = $request->input('to');
            $messageBody = trim($request->input('message'));
            $waMessageId = $request->input('message_id');

            // Find vendor associated with this phone number
            $vendor = Vendor::where('phone', $fromNumber)
                ->orWhere('whatsapp_number', $fromNumber)
                ->first();

            if (!$vendor) {
                // Log unassociated message
                WhatsappBotLog::create([
                    'from_number'   => $fromNumber,
                    'to_number'     => $toNumber,
                    'direction'     => WhatsappBotLog::DIRECTION_INBOUND,
                    'message_body'  => $messageBody,
                    'wa_message_id' => $waMessageId,
                    'status'        => WhatsappBotLog::STATUS_IGNORED,
                    'parsed_intent' => 'No vendor matched phone number',
                ]);
                return response()->json(['status' => 'ignored', 'reason' => 'Sender number not mapped to any vendor'], 200);
            }

            // Simple parsing logic: intent and job order number
            // e.g. "WIP JO-2026-00001" or "Ready JO-2026-00001"
            $pattern = '/\b(WIP|READY|DISPATCHED)\b.*\b(JO-\d{4}-\d{5})\b/i';
            preg_match($pattern, $messageBody, $matches);

            if (count($matches) < 3) {
                // Try alternate order: JO-XXXX-XXXXX WIP
                $patternAlt = '/\b(JO-\d{4}-\d{5})\b.*\b(WIP|READY|DISPATCHED)\b/i';
                preg_match($patternAlt, $messageBody, $matches);
                if (count($matches) === 3) {
                    $joNumber = $matches[1];
                    $intent   = strtoupper($matches[2]);
                } else {
                    // Log fail parsing
                    WhatsappBotLog::create([
                        'workspace_id'  => $vendor->workspace_id,
                        'vendor_id'     => $vendor->id,
                        'from_number'   => $fromNumber,
                        'to_number'     => $toNumber,
                        'direction'     => WhatsappBotLog::DIRECTION_INBOUND,
                        'message_body'  => $messageBody,
                        'wa_message_id' => $waMessageId,
                        'status'        => WhatsappBotLog::STATUS_FAILED,
                        'parsed_intent' => 'Could not parse JO number and status intent',
                    ]);
                    return response()->json(['status' => 'failed_parsing', 'message' => 'Send text in format: STATUS JO-YYYY-XXXXX'], 200);
                }
            } else {
                $intent   = strtoupper($matches[1]);
                $joNumber = $matches[2];
            }

            // Lookup Job Order
            $jobOrder = JobOrder::where('order_number', $joNumber)
                ->where('workspace_id', $vendor->workspace_id)
                ->first();

            if (!$jobOrder) {
                WhatsappBotLog::create([
                    'workspace_id'  => $vendor->workspace_id,
                    'vendor_id'     => $vendor->id,
                    'from_number'   => $fromNumber,
                    'to_number'     => $toNumber,
                    'direction'     => WhatsappBotLog::DIRECTION_INBOUND,
                    'message_body'  => $messageBody,
                    'wa_message_id' => $waMessageId,
                    'status'        => WhatsappBotLog::STATUS_FAILED,
                    'parsed_intent' => "Parsed JO number {$joNumber} not found in vendor workspace",
                ]);
                return response()->json(['status' => 'not_found', 'message' => 'Job Order not found'], 200);
            }

            // Map intent to status
            $newStatus = null;
            if ($intent === 'WIP') {
                $newStatus = JobOrder::STATUS_WIP;
            } elseif ($intent === 'READY') {
                $newStatus = JobOrder::STATUS_READY;
            } elseif ($intent === 'DISPATCHED') {
                $newStatus = JobOrder::STATUS_DISPATCHED_BACK;
            }

            if (!$newStatus) {
                return response()->json(['status' => 'invalid_status'], 200);
            }

            DB::beginTransaction();

            $oldStatus = $jobOrder->status;
            $jobOrder->update(['status' => $newStatus]);

            // Create transition status log
            JobOrderStatusLog::create([
                'job_order_id' => $jobOrder->id,
                'changed_by'   => $vendor->id, // track by vendor profile
                'from_status'  => $oldStatus,
                'to_status'    => $newStatus,
                'changed_via'  => JobOrderStatusLog::VIA_WHATSAPP,
                'notes'        => 'Updated via WhatsApp Bot.',
            ]);

            // Log bot entry
            WhatsappBotLog::create([
                'workspace_id'  => $vendor->workspace_id,
                'vendor_id'     => $vendor->id,
                'job_order_id'  => $jobOrder->id,
                'from_number'   => $fromNumber,
                'to_number'     => $toNumber,
                'direction'     => WhatsappBotLog::DIRECTION_INBOUND,
                'message_body'  => $messageBody,
                'wa_message_id' => $waMessageId,
                'status'        => WhatsappBotLog::STATUS_PROCESSED,
                'parsed_intent' => "Parsed status update to {$intent} for JO {$joNumber}",
            ]);

            DB::commit();

            return response()->json(['status' => 'success', 'updated_status' => $intent], 200);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * List Whatsapp Bot logs (Protected).
     * POST /api/v1/whatsapp/logs
     * --------------------------------------------------------------------------------
     */
    public function logs(Request $request)
    {
        try {
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_view) {
                return HelperFunction::response(null, null, 'You do not have permission to view WhatsApp bot logs', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'workspace_id' => 'required|integer|exists:workspaces,id',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $workspaceId = $request->input('workspace_id');

            // Workspace scope
            $workspace = Workspace::where('id', $workspaceId)
                ->where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                      ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
                })
                ->first();

            if (!$workspace) {
                return HelperFunction::response(null, null, 'Workspace not found or you do not belong to it', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $logs = WhatsappBotLog::with(['vendor', 'jobOrder'])
                ->where('workspace_id', $workspaceId)
                ->orderBy('created_at', 'desc')
                ->get();

            return HelperFunction::response($logs, null, 'WhatsApp bot logs fetched successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to fetch WhatsApp bot logs: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
