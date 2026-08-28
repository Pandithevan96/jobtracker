<?php

namespace App\Http\Controllers\Challan;

use App\Http\Controllers\Controller;
use App\Helpers\HelperFunction;
use App\Models\Challan\DeliveryChallan;
use App\Models\Challan\ChallanItem;
use App\Models\Job\JobOrder;
use App\Models\Workspace\Workspace;
use App\Models\Vendor\Vendor;
use App\Services\NotificationService;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response;
use Barryvdh\DomPDF\Facade\Pdf;

/**
 * --------------------------------------------------------------------------------
 * Delivery Challan Controller
 * --------------------------------------------------------------------------------
 * Manages Delivery Challans (DC) issued from Principal to Vendor.
 * Enforces Free plan limit of 50 DCs per month per workspace.
 * Permissions are enforced via HelperFunction::rolePermission(MODULE_ID).
 *
 * Endpoints:
 *   POST /api/v1/challans/create       — Create a challan with line items
 *   POST /api/v1/challans/list         — List challans in a workspace
 *   POST /api/v1/challans/details      — Detailed view of one challan
 *   POST /api/v1/challans/acknowledge  — Vendor marks as received (can_edit)
 *   POST /api/v1/challans/cancel       — Principal cancels the challan (can_delete)
 *
 * @package App\Http\Controllers\Challan
 * @author  Development Team
 * @version 1.0.0
 * @since   2026-07-03
 * --------------------------------------------------------------------------------
 */
class DeliveryChallanController extends Controller
{
    /**
     * Module ID for Delivery Challan Management (from module seeder, id = 5).
     */
    const MODULE_ID = 5;

    /**
     * Free plan monthly DC limit per workspace.
     */
    const FREE_PLAN_MONTHLY_LIMIT = 50;

    // -------------------------------------------------------------------------
    // Private Helpers
    // -------------------------------------------------------------------------

    /**
     * Verify authenticated user belongs to a workspace (owner or member).
     */
    private function resolveWorkspace(int $workspaceId, $user): ?Workspace
    {
        return Workspace::where('id', $workspaceId)
            ->where(function ($q) use ($user) {
                $q->where('owner_id', $user->id)
                  ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
            })
            ->first();
    }

    // -------------------------------------------------------------------------
    // Endpoints
    // -------------------------------------------------------------------------

    /**
     * --------------------------------------------------------------------------------
     * Create a new Delivery Challan with line items.
     * POST /api/v1/challans/create
     * --------------------------------------------------------------------------------
     * @param  Request $request
     *   workspace_id*       int
     *   job_order_id*       int
     *   vendor_id*          int
     *   type*               int  1-Outward, 2-Inward
     *   dispatch_date       date
     *   estimated_delivery  date
     *   vehicle_number      string
     *   driver_name         string
     *   notes               string
     *   items*              array
     *     items.*.part_name*   string
     *     items.*.part_number  string
     *     items.*.hsn_code     string
     *     items.*.quantity*    numeric
     *     items.*.uom          string
     *     items.*.unit_value   numeric
     *     items.*.description  string
     * @return \Illuminate\Http\JsonResponse
     * --------------------------------------------------------------------------------
     */
    public function store(Request $request)
    {
        try {
            // Check permission
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_create) {
                return HelperFunction::response(null, null, 'You do not have permission to create delivery challans', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'workspace_id'       => 'required|integer|exists:workspaces,id',
                'job_order_id'       => 'required|integer|exists:job_orders,id',
                'vendor_id'          => 'required|integer|exists:vendors,id',
                'type'               => 'required|integer|in:1,2', // 1-Outward, 2-Inward
                'dispatch_date'      => 'nullable|date',
                'estimated_delivery' => 'nullable|date|after_or_equal:dispatch_date',
                'vehicle_number'     => 'nullable|string|max:20',
                'driver_name'        => 'nullable|string|max:100',
                'notes'              => 'nullable|string',
                'items'              => 'required|array|min:1',
                'items.*.part_name'  => 'required|string|max:255',
                'items.*.part_number'=> 'nullable|string|max:100',
                'items.*.hsn_code'   => 'nullable|string|max:20',
                'items.*.quantity'   => 'required|numeric|min:0.01',
                'items.*.uom'        => 'nullable|string|max:20',
                'items.*.unit_value' => 'nullable|numeric|min:0',
                'items.*.description'=> 'nullable|string',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $workspaceId = $request->input('workspace_id');

            // Workspace scope
            $workspace = $this->resolveWorkspace($workspaceId, $user);
            if (!$workspace) {
                return HelperFunction::response(null, null, 'Workspace not found or you do not belong to it', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            // Plan limit: Free plan max 50 DCs per month
            if ($workspace->plan === Workspace::PLAN_FREE) {
                $dcThisMonth = DeliveryChallan::where('workspace_id', $workspaceId)
                    ->whereYear('created_at', date('Y'))
                    ->whereMonth('created_at', date('m'))
                    ->count();

                if ($dcThisMonth >= self::FREE_PLAN_MONTHLY_LIMIT) {
                    return HelperFunction::response(
                        null, null,
                        'Free plan allows maximum ' . self::FREE_PLAN_MONTHLY_LIMIT . ' delivery challans per month. Please upgrade.',
                        'error', '004', Response::HTTP_FORBIDDEN
                    );
                }
            }

            // Verify job order belongs to workspace
            $jobOrder = JobOrder::where('id', $request->input('job_order_id'))
                ->where('workspace_id', $workspaceId)
                ->first();

            if (!$jobOrder) {
                return HelperFunction::response(null, null, 'Job order not found in this workspace', 'error', '003', Response::HTTP_NOT_FOUND);
            }

            // Verify vendor belongs to workspace
            $vendor = Vendor::where('id', $request->input('vendor_id'))
                ->where('workspace_id', $workspaceId)
                ->first();

            if (!$vendor) {
                return HelperFunction::response(null, null, 'Vendor not found in this workspace', 'error', '003', Response::HTTP_NOT_FOUND);
            }

            // Create challan + items in a transaction
            DB::beginTransaction();

            $challan = DeliveryChallan::create([
                'workspace_id'       => $workspaceId,
                'job_order_id'       => $jobOrder->id,
                'vendor_id'          => $vendor->id,
                'created_by'         => $user->id,
                'type'               => $request->input('type'),
                'status'             => DeliveryChallan::STATUS_ISSUED,
                'dispatch_date'      => $request->input('dispatch_date'),
                'estimated_delivery' => $request->input('estimated_delivery'),
                'vehicle_number'     => $request->input('vehicle_number'),
                'driver_name'        => $request->input('driver_name'),
                'notes'              => $request->input('notes'),
            ]);

            foreach ($request->input('items') as $item) {
                $unitValue  = (float) ($item['unit_value'] ?? 0);
                $quantity   = (float) $item['quantity'];
                $totalValue = $unitValue * $quantity;

                ChallanItem::create([
                    'challan_id'   => $challan->id,
                    'part_name'    => $item['part_name'],
                    'part_number'  => $item['part_number'] ?? null,
                    'hsn_code'     => $item['hsn_code'] ?? null,
                    'quantity'     => $quantity,
                    'uom'          => $item['uom'] ?? 'Nos',
                    'unit_value'   => $unitValue,
                    'total_value'  => $totalValue,
                    'description'  => $item['description'] ?? null,
                ]);
            }

            // Increment workspace monthly DC counter
            $workspace->increment('dc_count_this_month');

            DB::commit();

            $challan->load('items', 'vendor', 'jobOrder');

            return HelperFunction::response($challan, null, 'Delivery Challan created successfully', 'success', '000', Response::HTTP_CREATED);
        } catch (Exception $e) {
            DB::rollBack();
            return HelperFunction::response(null, null, 'Failed to create delivery challan: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * List Delivery Challans in a workspace.
     * POST /api/v1/challans/list
     * --------------------------------------------------------------------------------
     * @param  Request $request  workspace_id*, status, vendor_id, type, job_order_id
     * @return \Illuminate\Http\JsonResponse
     * --------------------------------------------------------------------------------
     */
    public function list(Request $request)
    {
        try {
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_view) {
                return HelperFunction::response(null, null, 'You do not have permission to view delivery challans', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'workspace_id' => 'nullable|integer',
                'status'       => 'nullable|integer|in:1,2,3,4,5',
                'vendor_id'    => 'nullable|integer',
                'type'         => 'nullable|integer|in:1,2',
                'job_order_id' => 'nullable|integer',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $workspaceId = $request->input('workspace_id');

            $workspace = null;
            if ($workspaceId) {
                $workspace = $this->resolveWorkspace((int)$workspaceId, $user);
            }

            if (!$workspace) {
                $workspace = Workspace::where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                        ->orWhereHas('members', fn($m) => $m->where('users.id', $user->id));
                })->first();
            }

            if (!$workspace) {
                return HelperFunction::response([], null, 'Delivery Challans fetched successfully', 'success', '000', Response::HTTP_OK);
            }

            $workspaceId = $workspace->id;

            $myVendorIds = Vendor::where('user_id', $user->id)
                ->orWhere(function ($q) use ($user) {
                    if ($user->email) $q->where('email', $user->email);
                    if ($user->phone) $q->orWhere('phone', $user->phone);
                })
                ->pluck('id');

            $query = DeliveryChallan::with(['vendor', 'jobOrder', 'creator']);

            $mode = $request->input('mode') ?? $request->header('X-App-Mode') ?? 'principal';

            if ($mode === 'vendor') {
                // Vendor mode: show ONLY delivery challans RECEIVED by this vendor
                if ($myVendorIds->isNotEmpty()) {
                    $query->whereIn('vendor_id', $myVendorIds);
                } else {
                    $query->whereRaw('1 = 0');
                }
            } else {
                // Principal mode: show ONLY delivery challans ISSUED by this principal workspace
                $query->where('workspace_id', $workspaceId);
            }

            if ($request->filled('status')) {
                $query->where('status', $request->input('status'));
            }
            if ($request->filled('vendor_id')) {
                $query->where('vendor_id', $request->input('vendor_id'));
            }
            if ($request->filled('type')) {
                $query->where('type', $request->input('type'));
            }
            if ($request->filled('job_order_id')) {
                $query->where('job_order_id', $request->input('job_order_id'));
            }

            // Vendor users see only their own challans
            if ($user->isVendor()) {
                $query->whereHas('vendor', function ($q) use ($user) {
                    // Vendors scoped to challans for their workspace vendor profile
                    // (workspace_id already filters; no extra restriction needed as Vendor users
                    //  are workspace members for a specific vendor)
                });
            }

            $challans = $query->orderBy('created_at', 'desc')->get();

            return HelperFunction::response($challans, null, 'Delivery Challans fetched successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to list delivery challans: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Get detailed view of a single Delivery Challan.
     * POST /api/v1/challans/details
     * --------------------------------------------------------------------------------
     * @param  Request $request  id*
     * @return \Illuminate\Http\JsonResponse
     * --------------------------------------------------------------------------------
     */
    public function details(Request $request)
    {
        try {
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_view) {
                return HelperFunction::response(null, null, 'You do not have permission to view delivery challan details', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'id' => 'required|integer|exists:delivery_challans,id',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $challan = DeliveryChallan::with(['items', 'vendor', 'jobOrder', 'creator', 'acknowledgedBy'])
                ->find($request->input('id'));

            $workspace = $this->resolveWorkspace($challan->workspace_id, $user);
            if (!$workspace) {
                return HelperFunction::response(null, null, 'You do not have access to this challan', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            return HelperFunction::response($challan, null, 'Delivery Challan details fetched successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to get challan details: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Vendor acknowledges receipt of a Delivery Challan.
     * POST /api/v1/challans/acknowledge
     * --------------------------------------------------------------------------------
     * @param  Request $request  id*, notes
     * @return \Illuminate\Http\JsonResponse
     * --------------------------------------------------------------------------------
     */
    public function acknowledge(Request $request)
    {
        try {
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_edit) {
                return HelperFunction::response(null, null, 'You do not have permission to acknowledge delivery challans', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'id'    => 'required|integer|exists:delivery_challans,id',
                'notes' => 'nullable|string',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $challan = DeliveryChallan::find($request->input('id'));

            $workspace = $this->resolveWorkspace($challan->workspace_id, $user);
            if (!$workspace) {
                return HelperFunction::response(null, null, 'You do not have access to this challan', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            // Only Issued or Dispatched challans can be acknowledged
            if (!in_array($challan->status, [DeliveryChallan::STATUS_ISSUED, DeliveryChallan::STATUS_DISPATCHED])) {
                return HelperFunction::response(null, null, 'Only issued or dispatched challans can be acknowledged', 'error', '004', Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $challan->update([
                'status'          => DeliveryChallan::STATUS_ACKNOWLEDGED,
                'acknowledged_at' => now(),
                'acknowledged_by' => $user->id,
                'notes'           => $request->input('notes', $challan->notes),
            ]);

            // Dispatch challan acknowledged notification to principal
            NotificationService::dispatchChallanAcknowledged($challan->fresh(['vendor']), $user);

            return HelperFunction::response($challan->fresh(), null, 'Delivery Challan acknowledged successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to acknowledge challan: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Cancel a Delivery Challan (Principal only).
     * POST /api/v1/challans/cancel
     * --------------------------------------------------------------------------------
     * @param  Request $request  id*, reason
     * @return \Illuminate\Http\JsonResponse
     * --------------------------------------------------------------------------------
     */
    public function cancel(Request $request)
    {
        try {
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_delete) {
                return HelperFunction::response(null, null, 'You do not have permission to cancel delivery challans', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'id'     => 'required|integer|exists:delivery_challans,id',
                'reason' => 'nullable|string',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $challan = DeliveryChallan::find($request->input('id'));

            $workspace = $this->resolveWorkspace($challan->workspace_id, $user);
            if (!$workspace) {
                return HelperFunction::response(null, null, 'You do not have access to this challan', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            // Cannot cancel an already acknowledged or completed challan
            if (in_array($challan->status, [DeliveryChallan::STATUS_ACKNOWLEDGED, DeliveryChallan::STATUS_COMPLETED, DeliveryChallan::STATUS_CANCELLED])) {
                return HelperFunction::response(null, null, 'This challan cannot be cancelled in its current status', 'error', '004', Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $challan->update([
                'status' => DeliveryChallan::STATUS_CANCELLED,
                'notes'  => $request->input('reason', $challan->notes),
            ]);

            // Decrement monthly counter since the DC was cancelled
            $workspace->decrement('dc_count_this_month');

            return HelperFunction::response($challan->fresh(), null, 'Delivery Challan cancelled successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to cancel challan: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Generate and download a GST-compliant Delivery Challan PDF.
     * POST /api/v1/challans/download-pdf
     * --------------------------------------------------------------------------------
     * Renders challan_pdf.blade.php, saves to public storage, returns download URL.
     *
     * @param  Request $request  id*
     * @return \Illuminate\Http\JsonResponse
     * --------------------------------------------------------------------------------
     */
    public function downloadPdf(Request $request)
    {
        try {
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_view) {
                return HelperFunction::response(null, null, 'You do not have permission to export delivery challans', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'id' => 'required|integer|exists:delivery_challans,id',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $challan = DeliveryChallan::with(['items', 'vendor', 'jobOrder'])->find($request->input('id'));

            $workspace = $this->resolveWorkspace($challan->workspace_id, $user);
            if (!$workspace) {
                return HelperFunction::response(null, null, 'You do not have access to this challan', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            // Generate PDF from Blade view
            $pdf = Pdf::loadView('challan_pdf', [
                'challan'   => $challan,
                'workspace' => $workspace,
            ])->setPaper('a4', 'portrait');

            // Save to public storage (requires storage:link to be run once)
            $fileName = 'DC_' . str_pad($challan->id, 4, '0', STR_PAD_LEFT) . '_' . date('Ymd_His') . '.pdf';
            $storagePath = 'challan_pdfs/' . $fileName;
            Storage::disk('public')->put($storagePath, $pdf->output());

            // Build the publicly accessible URL
            $downloadUrl = url('storage/' . $storagePath);

            return HelperFunction::response([
                'download_url' => $downloadUrl,
                'file_name'    => $fileName,
            ], null, 'PDF generated successfully', 'success', '000', Response::HTTP_OK);

        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to generate challan PDF: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Update an existing Delivery Challan with line items (Issued state only).
     * POST /api/v1/challans/update
     * --------------------------------------------------------------------------------
     * @param  Request $request
     *   id*                 int
     *   dispatch_date       date
     *   estimated_delivery  date
     *   vehicle_number      string
     *   driver_name         string
     *   notes               string
     *   items*              array
     *     items.*.part_name*   string
     *     items.*.part_number  string
     *     items.*.hsn_code     string
     *     items.*.quantity*    numeric
     *     items.*.uom          string
     *     items.*.unit_value   numeric
     *     items.*.description  string
     * @return \Illuminate\Http\JsonResponse
     * --------------------------------------------------------------------------------
     */
    public function update(Request $request)
    {
        try {
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_edit) {
                return HelperFunction::response(null, null, 'You do not have permission to edit delivery challans', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'id'                 => 'required|integer|exists:delivery_challans,id',
                'dispatch_date'      => 'nullable|date',
                'estimated_delivery' => 'nullable|date|after_or_equal:dispatch_date',
                'vehicle_number'     => 'nullable|string|max:20',
                'driver_name'        => 'nullable|string|max:100',
                'notes'              => 'nullable|string',
                'items'              => 'required|array|min:1',
                'items.*.part_name'  => 'required|string|max:255',
                'items.*.part_number'=> 'nullable|string|max:100',
                'items.*.hsn_code'   => 'nullable|string|max:20',
                'items.*.quantity'   => 'required|numeric|min:0.01',
                'items.*.uom'        => 'nullable|string|max:20',
                'items.*.unit_value' => 'nullable|numeric|min:0',
                'items.*.description'=> 'nullable|string',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $challan = DeliveryChallan::find($request->input('id'));

            $workspace = $this->resolveWorkspace($challan->workspace_id, $user);
            if (!$workspace) {
                return HelperFunction::response(null, null, 'You do not have access to this challan', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            // Only Issued status can be edited
            if ($challan->status !== DeliveryChallan::STATUS_ISSUED) {
                return HelperFunction::response(null, null, 'Only challans in Issued status can be edited', 'error', '004', Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            DB::beginTransaction();

            $challan->update([
                'dispatch_date'      => $request->input('dispatch_date'),
                'estimated_delivery' => $request->input('estimated_delivery'),
                'vehicle_number'     => $request->input('vehicle_number'),
                'driver_name'        => $request->input('driver_name'),
                'notes'              => $request->input('notes'),
            ]);

            // Recreate items to ensure sync matches perfectly
            ChallanItem::where('challan_id', $challan->id)->delete();

            foreach ($request->input('items') as $item) {
                $unitValue  = (float) ($item['unit_value'] ?? 0);
                $quantity   = (float) $item['quantity'];
                $totalValue = $unitValue * $quantity;

                ChallanItem::create([
                    'challan_id'   => $challan->id,
                    'part_name'    => $item['part_name'],
                    'part_number'  => $item['part_number'] ?? null,
                    'hsn_code'     => $item['hsn_code'] ?? null,
                    'quantity'     => $quantity,
                    'uom'          => $item['uom'] ?? 'Nos',
                    'unit_value'   => $unitValue,
                    'total_value'  => $totalValue,
                    'description'  => $item['description'] ?? null,
                ]);
            }

            DB::commit();

            $challan->load('items', 'vendor', 'jobOrder');

            return HelperFunction::response($challan, null, 'Delivery Challan updated successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            DB::rollBack();
            return HelperFunction::response(null, null, 'Failed to update delivery challan: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
