<?php

namespace App\Http\Controllers\Job;

use App\Http\Controllers\Controller;
use App\Helpers\HelperFunction;
use App\Models\Job\MaterialReconciliation;
use App\Models\Job\JobOrder;
use App\Models\Workspace\Workspace;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response;

/**
 * --------------------------------------------------------------------------------
 * Material Reconciliation Controller
 * --------------------------------------------------------------------------------
 * Manages ITC-04 material audit trail and balancing calculations.
 * Permissions are enforced via HelperFunction::rolePermission(MODULE_ID).
 *
 * @package App\Http\Controllers\Job
 * @author  Development Team
 * @version 1.0.0
 * @since   2026-07-03
 * --------------------------------------------------------------------------------
 */
class MaterialReconciliationController extends Controller
{
    /**
     * Module ID for Material Reconciliations (from module seeder, id = 7).
     */
    const MODULE_ID = 7;

    /**
     * --------------------------------------------------------------------------------
     * Reconcile a job order's raw material vs finished/returns.
     * POST /api/v1/reconciliations/create
     * --------------------------------------------------------------------------------
     */
    public function store(Request $request)
    {
        try {
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_create) {
                return HelperFunction::response(null, null, 'You do not have permission to perform material reconciliations', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'job_order_id'          => 'required|integer|exists:job_orders,id',
                'qty_finished_received' => 'required|numeric|min:0',
                'qty_scrap'             => 'required|numeric|min:0',
                'qty_rejected'          => 'required|numeric|min:0',
                'remarks'               => 'nullable|string',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $jobOrder = JobOrder::find($request->input('job_order_id'));

            // Confirm user belongs to this workspace
            $workspace = Workspace::where('id', $jobOrder->workspace_id)
                ->where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                      ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
                })
                ->first();

            if (!$workspace) {
                return HelperFunction::response(null, null, 'Workspace not found or you do not belong to it', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            // Check if reconciliation already exists for this job order
            $existing = MaterialReconciliation::where('job_order_id', $jobOrder->id)->first();
            if ($existing) {
                return HelperFunction::response(null, null, 'A material reconciliation already exists for this Job Order', 'error', '004', Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $qtyDispatched = (float) $jobOrder->quantity_sent;
            $qtyFinished   = (float) $request->input('qty_finished_received');
            $qtyScrap      = (float) $request->input('qty_scrap');
            $qtyRejected   = (float) $request->input('qty_rejected');

            // Calculate shortage: Dispatched - (Finished + Scrap + Rejected)
            $qtyShortage = $qtyDispatched - ($qtyFinished + $qtyScrap + $qtyRejected);

            // Balanced if shortage is 0 (with slight float tolerance)
            $isBalanced = abs($qtyShortage) < 0.0001 ? 1 : 0;

            $reconciliation = MaterialReconciliation::create([
                'job_order_id'          => $jobOrder->id,
                'reconciled_by'         => $user->id,
                'qty_dispatched'        => $qtyDispatched,
                'qty_finished_received' => $qtyFinished,
                'qty_scrap'             => $qtyScrap,
                'qty_rejected'          => $qtyRejected,
                'qty_shortage'          => $qtyShortage,
                'is_balanced'           => $isBalanced,
                'remarks'               => $request->input('remarks'),
            ]);

            // Update Job Order status to completed if balanced
            if ($isBalanced === 1) {
                $jobOrder->update(['status' => JobOrder::STATUS_COMPLETED]);
            }

            return HelperFunction::response($reconciliation, null, 'Material reconciliation completed successfully', 'success', '000', Response::HTTP_CREATED);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to reconcile material: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * List material reconciliations in a workspace.
     * POST /api/v1/reconciliations/list
     * --------------------------------------------------------------------------------
     */
    public function list(Request $request)
    {
        try {
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_view) {
                return HelperFunction::response(null, null, 'You do not have permission to view material reconciliations', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'workspace_id' => 'nullable|integer',
                'is_balanced'  => 'nullable|integer|in:0,1',
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
                return HelperFunction::response([], null, 'Material reconciliations fetched successfully', 'success', '000', Response::HTTP_OK);
            }

            $workspaceId = $workspace->id;

            $query = MaterialReconciliation::with(['jobOrder', 'reconciler'])
                ->whereHas('jobOrder', function ($q) use ($workspaceId) {
                    $q->where('workspace_id', $workspaceId);
                });

            if ($request->filled('is_balanced')) {
                $query->where('is_balanced', $request->input('is_balanced'));
            }

            $reconciliations = $query->orderBy('created_at', 'desc')->get();

            return HelperFunction::response($reconciliations, null, 'Material reconciliations fetched successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to list material reconciliations: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Get details of a material reconciliation.
     * POST /api/v1/reconciliations/details
     * --------------------------------------------------------------------------------
     */
    public function details(Request $request)
    {
        try {
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_view) {
                return HelperFunction::response(null, null, 'You do not have permission to view material reconciliation details', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'id' => 'required|integer|exists:material_reconciliations,id',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $reconciliation = MaterialReconciliation::with(['jobOrder.vendor', 'reconciler'])->find($request->input('id'));

            // Workspace scope check
            $workspace = Workspace::where('id', $reconciliation->jobOrder->workspace_id)
                ->where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                      ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
                })
                ->first();

            if (!$workspace) {
                return HelperFunction::response(null, null, 'You do not have access to this reconciliation', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            return HelperFunction::response($reconciliation, null, 'Material reconciliation details fetched successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to get reconciliation details: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
