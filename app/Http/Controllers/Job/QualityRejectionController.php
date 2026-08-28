<?php

namespace App\Http\Controllers\Job;

use App\Http\Controllers\Controller;
use App\Helpers\HelperFunction;
use App\Models\Job\QualityRejection;
use App\Models\Job\JobOrder;
use App\Models\Workspace\Workspace;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response;

/**
 * --------------------------------------------------------------------------------
 * Quality Rejection Controller
 * --------------------------------------------------------------------------------
 * Manages quality rejections (scrap, rework, short supply) for job orders.
 * Permissions are enforced via HelperFunction::rolePermission(MODULE_ID).
 *
 * @package App\Http\Controllers\Job
 * @author  Development Team
 * @version 1.0.0
 * @since   2026-07-03
 * --------------------------------------------------------------------------------
 */
class QualityRejectionController extends Controller
{
    /**
     * Module ID for Quality Rejections (from module seeder, id = 6).
     */
    const MODULE_ID = 6;

    /**
     * --------------------------------------------------------------------------------
     * Report a new quality rejection.
     * POST /api/v1/rejections/create
     * --------------------------------------------------------------------------------
     */
    public function store(Request $request)
    {
        try {
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_create) {
                return HelperFunction::response(null, null, 'You do not have permission to report quality rejections', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'job_order_id'     => 'required|integer|exists:job_orders,id',
                'rejected_qty'     => 'required|numeric|min:0.01',
                'accepted_qty'     => 'required|numeric|min:0',
                'rejection_type'   => 'required|integer|in:1,2,3', // 1-Scrap, 2-Rework, 3-Short Supply
                'rejection_reason' => 'nullable|string',
                'photo_path'       => 'nullable|string',
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

            $rejection = QualityRejection::create([
                'job_order_id'     => $jobOrder->id,
                'reported_by'      => $user->id,
                'rejected_qty'     => $request->input('rejected_qty'),
                'accepted_qty'     => $request->input('accepted_qty'),
                'rejection_type'   => $request->input('rejection_type'),
                'rejection_reason' => $request->input('rejection_reason'),
                'photo_path'       => $request->input('photo_path'),
                'status'           => QualityRejection::STATUS_OPEN,
            ]);

            return HelperFunction::response($rejection, null, 'Quality Rejection reported successfully', 'success', '000', Response::HTTP_CREATED);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to report quality rejection: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * List quality rejections for a workspace.
     * POST /api/v1/rejections/list
     * --------------------------------------------------------------------------------
     */
    public function list(Request $request)
    {
        try {
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_view) {
                return HelperFunction::response(null, null, 'You do not have permission to view quality rejections', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'workspace_id' => 'nullable|integer',
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
                return HelperFunction::response([], null, 'Quality Rejections fetched successfully', 'success', '000', Response::HTTP_OK);
            }

            $workspaceId = $workspace->id;

            $query = QualityRejection::with(['jobOrder', 'reporter'])
                ->whereHas('jobOrder', function ($q) use ($workspaceId) {
                    $q->where('workspace_id', $workspaceId);
                });

            if ($request->filled('status')) {
                $query->where('status', $request->input('status'));
            }

            $rejections = $query->orderBy('created_at', 'desc')->get();

            return HelperFunction::response($rejections, null, 'Quality Rejections fetched successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to list quality rejections: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Get details of a quality rejection.
     * POST /api/v1/rejections/details
     * --------------------------------------------------------------------------------
     */
    public function details(Request $request)
    {
        try {
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_view) {
                return HelperFunction::response(null, null, 'You do not have permission to view quality rejection details', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'id' => 'required|integer|exists:quality_rejections,id',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $rejection = QualityRejection::with(['jobOrder.vendor', 'reporter'])->find($request->input('id'));

            // Workspace scope check
            $workspace = Workspace::where('id', $rejection->jobOrder->workspace_id)
                ->where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                      ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
                })
                ->first();

            if (!$workspace) {
                return HelperFunction::response(null, null, 'You do not have access to this quality rejection', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            return HelperFunction::response($rejection, null, 'Quality Rejection details fetched successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to get quality rejection details: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Acknowledge quality rejection (Vendor action).
     * POST /api/v1/rejections/acknowledge
     * --------------------------------------------------------------------------------
     */
    public function acknowledge(Request $request)
    {
        try {
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_edit) {
                return HelperFunction::response(null, null, 'You do not have permission to acknowledge quality rejections', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'id' => 'required|integer|exists:quality_rejections,id',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $rejection = QualityRejection::find($request->input('id'));

            // Workspace scope check
            $workspace = Workspace::where('id', $rejection->jobOrder->workspace_id)
                ->where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                      ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
                })
                ->first();

            if (!$workspace) {
                return HelperFunction::response(null, null, 'You do not have access to this quality rejection', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            if ($rejection->status !== QualityRejection::STATUS_OPEN) {
                return HelperFunction::response(null, null, 'Only open quality rejections can be acknowledged', 'error', '004', Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $rejection->update(['status' => QualityRejection::STATUS_ACKNOWLEDGED]);

            return HelperFunction::response($rejection->fresh(), null, 'Quality Rejection acknowledged successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to acknowledge quality rejection: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Close quality rejection (Principal action).
     * POST /api/v1/rejections/close
     * --------------------------------------------------------------------------------
     */
    public function close(Request $request)
    {
        try {
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_delete) {
                return HelperFunction::response(null, null, 'You do not have permission to close quality rejections', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'id' => 'required|integer|exists:quality_rejections,id',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $rejection = QualityRejection::find($request->input('id'));

            // Workspace scope check
            $workspace = Workspace::where('id', $rejection->jobOrder->workspace_id)
                ->where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                      ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
                })
                ->first();

            if (!$workspace) {
                return HelperFunction::response(null, null, 'You do not have access to this quality rejection', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            if ($rejection->status === QualityRejection::STATUS_CLOSED) {
                return HelperFunction::response(null, null, 'Quality rejection is already closed', 'error', '004', Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $rejection->update(['status' => QualityRejection::STATUS_CLOSED]);

            return HelperFunction::response($rejection->fresh(), null, 'Quality Rejection closed successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to close quality rejection: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
