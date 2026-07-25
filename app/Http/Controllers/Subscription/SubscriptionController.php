<?php

namespace App\Http\Controllers\Subscription;

use App\Http\Controllers\Controller;
use App\Helpers\HelperFunction;
use App\Models\Subscription\Subscription;
use App\Models\Subscription\SubscriptionInvoice;
use App\Models\Workspace\Workspace;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response;

/**
 * --------------------------------------------------------------------------------
 * Subscription Controller
 * --------------------------------------------------------------------------------
 * Handles workspace SaaS plans, billing, and Razorpay webhook integrations.
 * Permissions are enforced via HelperFunction::rolePermission(MODULE_ID).
 *
 * @package App\Http\Controllers\Subscription
 * @author  Development Team
 * @version 1.0.0
 * @since   2026-07-03
 * --------------------------------------------------------------------------------
 */
class SubscriptionController extends Controller
{
    /**
     * Module ID for Subscription Management (from module seeder, id = 8).
     */
    const MODULE_ID = 8;

    /**
     * --------------------------------------------------------------------------------
     * Get active plan, limits, and subscription status of a workspace.
     * POST /api/v1/subscriptions/status
     * --------------------------------------------------------------------------------
     */
    public function status(Request $request)
    {
        try {
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_view) {
                return HelperFunction::response(null, null, 'You do not have permission to view subscriptions', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'workspace_id' => 'required|integer|exists:workspaces,id',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $workspaceId = $request->input('workspace_id');

            // Confirm user belongs to this workspace
            $workspace = Workspace::where('id', $workspaceId)
                ->where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                      ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
                })
                ->first();

            if (!$workspace) {
                return HelperFunction::response(null, null, 'Workspace not found or you do not belong to it', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            // Get active subscription
            $subscription = Subscription::where('workspace_id', $workspaceId)
                ->where('status', Subscription::STATUS_ACTIVE)
                ->first();

            $usageStats = [
                'plan'                => $workspace->plan, // 1-Free, 2-Factory, 3-Industrial
                'dc_limit_monthly'    => $workspace->plan == Workspace::PLAN_FREE ? 50 : 'Unlimited',
                'dc_count_this_month' => $workspace->dc_count_this_month,
                'active_subscription' => $subscription,
            ];

            return HelperFunction::response($usageStats, null, 'Subscription status fetched successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to get subscription status: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Upgrade workspace plan (Razorpay integration mock/trigger).
     * POST /api/v1/subscriptions/upgrade
     * --------------------------------------------------------------------------------
     */
    public function upgrade(Request $request)
    {
        try {
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_edit) {
                return HelperFunction::response(null, null, 'You do not have permission to upgrade plans', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'workspace_id' => 'required|integer|exists:workspaces,id',
                'plan'         => 'required|integer|in:2,3', // 2-Factory, 3-Industrial
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $workspaceId = $request->input('workspace_id');
            $newPlan = (int) $request->input('plan');

            // Confirm user is the owner (only workspace owners can upgrade)
            $workspace = Workspace::where('id', $workspaceId)->where('owner_id', $user->id)->first();
            if (!$workspace) {
                return HelperFunction::response(null, null, 'Only the workspace owner can upgrade the plan', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            // Simulate Razorpay subscription generation
            $razorpaySubscriptionId = 'sub_' . strtoupper(bin2hex(random_bytes(8)));
            $razorpayPlanId = $newPlan === Workspace::PLAN_INDUSTRIAL ? 'plan_industrial_4999' : 'plan_factory_1999';

            DB::beginTransaction();

            // Cancel any old subscription
            Subscription::where('workspace_id', $workspaceId)
                ->where('status', Subscription::STATUS_ACTIVE)
                ->update([
                    'status'       => Subscription::STATUS_CANCELLED,
                    'cancelled_at' => now(),
                ]);

            // Create new active subscription
            $subscription = Subscription::create([
                'workspace_id'             => $workspaceId,
                'razorpay_subscription_id' => $razorpaySubscriptionId,
                'razorpay_plan_id'         => $razorpayPlanId,
                'plan'                     => $newPlan,
                'status'                   => Subscription::STATUS_ACTIVE,
                'current_period_start'     => now(),
                'current_period_end'       => now()->addMonth(),
            ]);

            // Upgrade workspace plan field
            $workspace->update(['plan' => $newPlan]);

            // Generate initial invoice
            SubscriptionInvoice::create([
                'workspace_id'        => $workspaceId,
                'subscription_id'     => $subscription->id,
                'razorpay_invoice_id' => 'inv_' . strtoupper(bin2hex(random_bytes(8))),
                'razorpay_payment_id' => 'pay_' . strtoupper(bin2hex(random_bytes(8))),
                'amount'              => $newPlan === Workspace::PLAN_INDUSTRIAL ? 4999.00 : 1999.00,
                'status'              => SubscriptionInvoice::STATUS_PAID,
                'plan'                => $newPlan,
                'paid_at'             => now(),
                'period_start'        => now(),
                'period_end'          => now()->addMonth(),
            ]);

            DB::commit();

            return HelperFunction::response($subscription, null, 'Plan upgraded successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            DB::rollBack();
            return HelperFunction::response(null, null, 'Failed to upgrade plan: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * List payment invoices for a workspace.
     * POST /api/v1/subscriptions/invoices
     * --------------------------------------------------------------------------------
     */
    public function invoices(Request $request)
    {
        try {
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_view) {
                return HelperFunction::response(null, null, 'You do not have permission to view billing invoices', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'workspace_id' => 'required|integer|exists:workspaces,id',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $workspaceId = $request->input('workspace_id');

            // Confirm user belongs to this workspace
            $workspace = Workspace::where('id', $workspaceId)
                ->where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                      ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
                })
                ->first();

            if (!$workspace) {
                return HelperFunction::response(null, null, 'Workspace not found or you do not belong to it', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $invoices = SubscriptionInvoice::where('workspace_id', $workspaceId)
                ->orderBy('created_at', 'desc')
                ->get();

            return HelperFunction::response($invoices, null, 'Billing invoices fetched successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to get billing invoices: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Razorpay webhook endpoint (Public).
     * POST /api/v1/subscriptions/webhook
     * --------------------------------------------------------------------------------
     */
    public function webhook(Request $request)
    {
        try {
            // Note: In production, verify the Razorpay signature here.
            // For now, we decode and process events.
            $payload = $request->all();
            $event   = $payload['event'] ?? null;

            if (!$event) {
                return response()->json(['status' => 'ignored'], 200);
            }

            $entity = $payload['payload']['subscription']['entity'] ?? null;
            if (!$entity) {
                return response()->json(['status' => 'ignored'], 200);
            }

            $razorpaySubId = $entity['id'];
            $subscription  = Subscription::where('razorpay_subscription_id', $razorpaySubId)->first();

            if (!$subscription) {
                return response()->json(['status' => 'subscription_not_found'], 200);
            }

            switch ($event) {
                case 'subscription.charged':
                    // Update validity and period
                    $subscription->update([
                        'status'               => Subscription::STATUS_ACTIVE,
                        'current_period_start' => isset($entity['current_start']) ? date('Y-m-d H:i:s', $entity['current_start']) : now(),
                        'current_period_end'   => isset($entity['current_end']) ? date('Y-m-d H:i:s', $entity['current_end']) : now()->addMonth(),
                    ]);

                    // Log new paid invoice
                    SubscriptionInvoice::create([
                        'workspace_id'        => $subscription->workspace_id,
                        'subscription_id'     => $subscription->id,
                        'razorpay_invoice_id' => 'inv_' . strtoupper(bin2hex(random_bytes(8))),
                        'razorpay_payment_id' => $payload['payload']['payment']['entity']['id'] ?? 'pay_' . strtoupper(bin2hex(random_bytes(8))),
                        'amount'              => (float) (($entity['plan_amount'] ?? 0) / 100),
                        'status'              => SubscriptionInvoice::STATUS_PAID,
                        'plan'                => $subscription->plan,
                        'paid_at'             => now(),
                        'period_start'        => $subscription->current_period_start,
                        'period_end'          => $subscription->current_period_end,
                        'razorpay_payload'    => $payload,
                    ]);
                    break;

                case 'subscription.cancelled':
                    $subscription->update([
                        'status'       => Subscription::STATUS_CANCELLED,
                        'cancelled_at' => now(),
                    ]);
                    // Downgrade workspace to Free plan
                    Workspace::where('id', $subscription->workspace_id)->update(['plan' => Workspace::PLAN_FREE]);
                    break;

                case 'subscription.halted':
                    $subscription->update(['status' => Subscription::STATUS_HALTED]);
                    break;
            }

            return response()->json(['status' => 'success'], 200);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}
