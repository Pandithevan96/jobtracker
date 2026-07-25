<?php

namespace App\Http\Controllers\Job;

use App\Http\Controllers\Controller;
use App\Helpers\HelperFunction;
use App\Services\NotificationService;
use App\Models\Job\JobOrder;
use App\Models\Job\JobOrderNote;
use App\Models\Job\JobOrderStatusLog;
use App\Models\Workspace\Workspace;
use App\Models\Vendor\Vendor;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response;

/**
 * --------------------------------------------------------------------------------
 * Job Order Controller
 * --------------------------------------------------------------------------------
 * Manages job orders lifecycle: create, list, details, update-status.
 * Permissions are enforced via HelperFunction::rolePermission(MODULE_ID).
 * Vendor role users can only transition status to WIP / Ready / Dispatched Back.
 *
 * @package App\Http\Controllers\Job
 * @author  Development Team
 * @version 1.0.0
 * @since   2026-07-03
 * --------------------------------------------------------------------------------
 */
class JobOrderController extends Controller
{
    /**
     * Module ID for Job Order Management (from module seeder, id = 4).
     */
    const MODULE_ID = 4;

    /**
     * --------------------------------------------------------------------------------
     * Create a new job order.
     * POST /api/v1/job-orders/create
     * --------------------------------------------------------------------------------
     * @param  Request $request  workspace_id*, vendor_id*, part_name*, quantity_sent*, due_date*,
     *                           part_number, description, process_type, uom, status, priority, notes
     * @return \Illuminate\Http\JsonResponse
     * --------------------------------------------------------------------------------
     */
    public function store(Request $request)
    {
        try {
            // Check permission
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_create) {
                return HelperFunction::response(null, null, 'You do not have permission to create job orders', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'workspace_id'  => 'required|integer|exists:workspaces,id',
                'vendor_id'     => 'required|integer|exists:vendors,id',
                'part_name'     => 'required|string|max:255',
                'part_number'   => 'nullable|string|max:100',
                'description'   => 'nullable|string',
                'process_type'  => 'nullable|string|max:100',
                'quantity_sent' => 'required|numeric|min:0.01',
                'uom'           => 'nullable|string|max:20',
                'due_date'      => 'required|date|after_or_equal:today',
                'status'        => 'nullable|integer|in:1,2', // 1-Draft, 2-Material Out
                'priority'      => 'nullable|integer|in:1,2,3,4', // 1-Low, 2-Normal, 3-High, 4-Urgent
                'notes'         => 'nullable|string',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $workspaceId = $request->input('workspace_id');

            // Workspace scope: confirm user belongs to workspace
            $workspace = Workspace::where('id', $workspaceId)
                ->where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                        ->orWhereHas('members', fn($m) => $m->where('users.id', $user->id));
                })
                ->first();

            if (!$workspace) {
                return HelperFunction::response(null, null, 'Workspace not found or you do not belong to it', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            // Verify vendor belongs to this workspace
            $vendor = Vendor::where('id', $request->input('vendor_id'))
                ->where('workspace_id', $workspaceId)
                ->first();

            if (!$vendor) {
                return HelperFunction::response(null, null, 'Selected vendor does not belong to this workspace', 'error', '003', Response::HTTP_NOT_FOUND);
            }

            $status = $request->input('status', JobOrder::STATUS_DRAFT);

            $jobOrder = JobOrder::create([
                'workspace_id'  => $workspaceId,
                'vendor_id'     => $vendor->id,
                'created_by'    => $user->id,
                'part_name'     => $request->input('part_name'),
                'part_number'   => $request->input('part_number'),
                'description'   => $request->input('description'),
                'process_type'  => $request->input('process_type'),
                'quantity_sent' => $request->input('quantity_sent'),
                'uom'           => $request->input('uom', 'Nos'),
                'due_date'      => $request->input('due_date'),
                'status'        => $status,
                'priority'      => $request->input('priority', JobOrder::PRIORITY_NORMAL),
                'notes'         => $request->input('notes'),
            ]);

            // Create initial audit log entry
            JobOrderStatusLog::create([
                'job_order_id' => $jobOrder->id,
                'changed_by'   => $user->id,
                'from_status'  => null,
                'to_status'    => $status,
                'changed_via'  => JobOrderStatusLog::VIA_WEB,
                'notes'        => 'Job Order created.',
            ]);

            return HelperFunction::response($jobOrder, null, 'Job Order created successfully', 'success', '000', Response::HTTP_CREATED);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to create job order: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * List job orders in a workspace.
     * POST /api/v1/job-orders/list
     * --------------------------------------------------------------------------------
     * @param  Request $request  workspace_id*, status, vendor_id, priority
     * @return \Illuminate\Http\JsonResponse
     * --------------------------------------------------------------------------------
     */
    public function list(Request $request)
    {
        try {
            // Check permission
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_view) {
                return HelperFunction::response(null, null, 'You do not have permission to view job orders', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'workspace_id' => 'required|integer|exists:workspaces,id',
                'status'       => 'nullable|integer',
                'vendor_id'    => 'nullable|integer',
                'priority'     => 'nullable|integer',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $workspaceId = $request->input('workspace_id');

            // Workspace scope check
            $workspace = Workspace::where('id', $workspaceId)
                ->where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                        ->orWhereHas('members', fn($m) => $m->where('users.id', $user->id));
                })
                ->first();

            if (!$workspace) {
                return HelperFunction::response(null, null, 'Workspace not found or you do not belong to it', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $query = JobOrder::with(['vendor', 'creator'])
                ->where('workspace_id', $workspaceId);

            if ($request->filled('status')) {
                $query->where('status', $request->input('status'));
            }
            if ($request->filled('vendor_id')) {
                $query->where('vendor_id', $request->input('vendor_id'));
            }
            if ($request->filled('priority')) {
                $query->where('priority', $request->input('priority'));
            }

            $jobOrders = $query->orderBy('due_date', 'asc')->get();

            return HelperFunction::response($jobOrders, null, 'Job Orders fetched successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to list job orders: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Get details of a specific job order.
     * POST /api/v1/job-orders/details
     * --------------------------------------------------------------------------------
     * @param  Request $request  id*
     * @return \Illuminate\Http\JsonResponse
     * --------------------------------------------------------------------------------
     */
    public function details(Request $request)
    {
        try {
            // Check permission
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_view) {
                return HelperFunction::response(null, null, 'You do not have permission to view job order details', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'id' => 'required|integer|exists:job_orders,id',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $jobOrder = JobOrder::with(['vendor', 'creator', 'statusLogs.changedBy', 'orderNotes.user'])->find($request->input('id'));

            // Workspace scope check
            $workspace = Workspace::where('id', $jobOrder->workspace_id)
                ->where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                        ->orWhereHas('members', fn($m) => $m->where('users.id', $user->id));
                })
                ->first();

            if (!$workspace) {
                return HelperFunction::response(null, null, 'You do not have access to this job order', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            return HelperFunction::response($jobOrder, null, 'Job Order details fetched successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to get job order details: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Update the status of a job order.
     * POST /api/v1/job-orders/update-status
     * --------------------------------------------------------------------------------
     * Vendors (role_id = 3) can only transition to WIP (3), Ready (4), Dispatched Back (5).
     * Principals / System Admins can set any valid status.
     *
     * @param  Request $request  id*, status*, changed_via, photo_proof_path, notes
     * @return \Illuminate\Http\JsonResponse
     * --------------------------------------------------------------------------------
     */
    public function updateStatus(Request $request)
    {
        try {
            // Check permission
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_edit) {
                return HelperFunction::response(null, null, 'You do not have permission to update job order status', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'id'               => 'required|integer|exists:job_orders,id',
                'status'           => 'required|integer|in:1,2,3,4,5,6,7',
                'changed_via'      => 'nullable|integer|in:1,2,3,4', // 1-Web, 2-PWA, 3-WhatsApp Bot, 4-QR Scan
                'photo_proof_path' => 'nullable|string',
                'notes'            => 'nullable|string',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $newStatus = (int) $request->input('status');
            $jobOrder = JobOrder::find($request->input('id'));

            // Workspace scope check
            $workspace = Workspace::where('id', $jobOrder->workspace_id)
                ->where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                        ->orWhereHas('members', fn($m) => $m->where('users.id', $user->id));
                })
                ->first();

            if (!$workspace) {
                return HelperFunction::response(null, null, 'You do not have access to this job order', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            // Vendor role restriction: can only set WIP, Ready, or Dispatched Back
            if ($user->isVendor() && !in_array($newStatus, [
                JobOrder::STATUS_WIP,
                JobOrder::STATUS_READY,
                JobOrder::STATUS_DISPATCHED_BACK,
            ])) {
                return HelperFunction::response(null, null, 'Vendors are only allowed to set status to WIP, Ready, or Dispatched Back.', 'error', '004', Response::HTTP_FORBIDDEN);
            }

            $oldStatus = $jobOrder->status;

            $jobOrder->update(['status' => $newStatus]);

            JobOrderStatusLog::create([
                'job_order_id'     => $jobOrder->id,
                'changed_by'       => $user->id,
                'from_status'      => $oldStatus,
                'to_status'        => $newStatus,
                'changed_via'      => $request->input('changed_via', JobOrderStatusLog::VIA_WEB),
                'photo_proof_path' => $request->input('photo_proof_path'),
                'notes'            => $request->input('notes'),
            ]);

            // Dispatch status-change notification (simulated; no live API yet)
            NotificationService::dispatchJobStatusChange(
                $jobOrder->fresh(['vendor']),
                $oldStatus,
                $newStatus,
                $user
            );

            return HelperFunction::response($jobOrder->fresh(), null, 'Job Order status updated successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to update job order status: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Upload a workpiece drawing / document for a job order.
     * POST /api/v1/job-orders/upload-document
     * --------------------------------------------------------------------------------
     * @param  Request $request  id*, file* (jpg/png/pdf max 10MB)
     * @return \Illuminate\Http\JsonResponse
     * --------------------------------------------------------------------------------
     */
    public function uploadDocument(Request $request)
    {
        try {
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_edit) {
                return HelperFunction::response(null, null, 'You do not have permission to upload documents', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'id'   => 'required|integer|exists:job_orders,id',
                'file' => 'required|file|mimes:jpg,jpeg,png,pdf,dwg|max:10240',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user     = Auth::user();
            $jobOrder = JobOrder::find($request->input('id'));

            // Workspace scope check
            $workspace = Workspace::where('id', $jobOrder->workspace_id)
                ->where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                      ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
                })
                ->first();

            if (!$workspace) {
                return HelperFunction::response(null, null, 'You do not have access to this job order', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $path = $request->file('file')->store('job_documents', 'public');
            $url  = Storage::url($path);  // e.g. /storage/job_documents/xxx.pdf

            // Merge into the existing array
            $existing = $jobOrder->drawing_urls ?? [];
            $existing[] = [
                'path'         => $path,
                'url'          => $url,
                'original_name'=> $request->file('file')->getClientOriginalName(),
                'uploaded_by'  => $user->id,
                'uploaded_at'  => now()->toISOString(),
            ];
            $jobOrder->update(['drawing_urls' => $existing]);

            return HelperFunction::response(
                ['url' => $url, 'path' => $path, 'original_name' => $request->file('file')->getClientOriginalName()],
                null,
                'Document uploaded successfully',
                'success', '000', Response::HTTP_CREATED
            );
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to upload document: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Add a note/remark to a job order (principal ↔ vendor thread).
     * POST /api/v1/job-orders/add-note
     * --------------------------------------------------------------------------------
     * @param  Request $request  id*, note*
     * @return \Illuminate\Http\JsonResponse
     * --------------------------------------------------------------------------------
     */
    public function addNote(Request $request)
    {
        try {
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access) {
                return HelperFunction::response(null, null, 'Permission denied', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'id'   => 'required|integer|exists:job_orders,id',
                'note' => 'required|string|max:1000',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user     = Auth::user();
            $jobOrder = JobOrder::find($request->input('id'));

            // Workspace scope
            $workspace = Workspace::where('id', $jobOrder->workspace_id)
                ->where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                      ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
                })
                ->first();

            if (!$workspace) {
                return HelperFunction::response(null, null, 'You do not have access to this job order', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $authorRole = $user->isVendor() ? JobOrderNote::ROLE_VENDOR : JobOrderNote::ROLE_PRINCIPAL;

            $note = JobOrderNote::create([
                'job_order_id' => $jobOrder->id,
                'user_id'      => $user->id,
                'note'         => $request->input('note'),
                'author_role'  => $authorRole,
            ]);

            return HelperFunction::response($note->load('user'), null, 'Note added successfully', 'success', '000', Response::HTTP_CREATED);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to add note: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Get all notes for a job order.
     * POST /api/v1/job-orders/notes
     * --------------------------------------------------------------------------------
     * @param  Request $request  id*
     * @return \Illuminate\Http\JsonResponse
     * --------------------------------------------------------------------------------
     */
    public function getNotes(Request $request)
    {
        try {
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_view) {
                return HelperFunction::response(null, null, 'Permission denied', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'id' => 'required|integer|exists:job_orders,id',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user     = Auth::user();
            $jobOrder = JobOrder::find($request->input('id'));

            $workspace = Workspace::where('id', $jobOrder->workspace_id)
                ->where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                      ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
                })
                ->first();

            if (!$workspace) {
                return HelperFunction::response(null, null, 'Access denied', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $notes = $jobOrder->orderNotes()->with('user')->get();

            return HelperFunction::response($notes, null, 'Notes fetched successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to fetch notes: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
