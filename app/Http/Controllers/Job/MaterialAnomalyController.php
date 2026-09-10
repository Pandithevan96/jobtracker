<?php

namespace App\Http\Controllers\Job;

use App\Http\Controllers\Controller;
use App\Helpers\HelperFunction;
use App\Models\Job\JobOrder;
use App\Models\Job\MaterialAnomaly;
use App\Models\Workspace\Workspace;
use App\Services\MaterialReconciliationService;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response;

class MaterialAnomalyController extends Controller
{
    public function __construct(
        protected MaterialReconciliationService $reconciliationService
    ) {}

    /**
     * Get real-time reconciliation breakdown for a single Job Order.
     * GET /api/v1/job-orders/{id}/reconciliation
     */
    public function showJobReconciliation(Request $request, $id)
    {
        try {
            $user = Auth::user();
            $jobOrder = JobOrder::with(['workspace', 'vendor'])->find($id);

            if (!$jobOrder) {
                return HelperFunction::response(null, null, 'Job Order not found', 'error', '004', Response::HTTP_NOT_FOUND);
            }

            // Scope check: User must belong to the workspace
            $workspace = Workspace::where('id', $jobOrder->workspace_id)
                ->where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                        ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
                })
                ->first();

            if (!$workspace) {
                return HelperFunction::response(null, null, 'Workspace access denied', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $reconciliationData = $this->reconciliationService->reconcile($jobOrder);

            // Also include active anomaly record if present
            $activeAnomaly = MaterialAnomaly::where('job_order_id', $jobOrder->id)
                ->where('resolved', false)
                ->first();

            $reconciliationData['active_anomaly'] = $activeAnomaly;

            return HelperFunction::response($reconciliationData, null, 'Job reconciliation calculated successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to calculate reconciliation: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * List material anomalies for current workspace.
     * GET / POST /api/v1/material-anomalies
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();
            $workspaceId = $request->input('workspace_id');

            if ($workspaceId) {
                $workspace = Workspace::where('id', $workspaceId)
                    ->where(function ($q) use ($user) {
                        $q->where('owner_id', $user->id)
                            ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
                    })
                    ->first();
            } else {
                $workspace = Workspace::where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                        ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
                })->first();
            }

            if (!$workspace) {
                return HelperFunction::response([], null, 'Anomalies fetched successfully', 'success', '000', Response::HTTP_OK);
            }

            $query = MaterialAnomaly::with(['jobOrder.vendor', 'resolver'])
                ->where('workspace_id', $workspace->id);

            $status = $request->input('status', 'open');
            if ($status === 'open') {
                $query->where('resolved', false);
            } elseif ($status === 'resolved') {
                $query->where('resolved', true);
            }

            $anomalies = $query->orderBy('created_at', 'desc')->get();

            return HelperFunction::response($anomalies, null, 'Material anomalies fetched successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to fetch material anomalies: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Manually resolve an anomaly with notes.
     * POST /api/v1/material-anomalies/resolve
     */
    public function resolve(Request $request)
    {
        try {
            $validation = Validator::make($request->all(), [
                'id'               => 'required|integer|exists:material_anomalies,id',
                'resolution_notes' => 'required|string|max:1000',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $anomaly = MaterialAnomaly::with('jobOrder')->find($request->input('id'));

            $workspace = Workspace::where('id', $anomaly->workspace_id)
                ->where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                        ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
                })
                ->first();

            if (!$workspace) {
                return HelperFunction::response(null, null, 'Workspace access denied', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $anomaly->update([
                'status'           => 'resolved',
                'resolved'         => true,
                'resolution_notes' => $request->input('resolution_notes'),
                'resolved_by'      => $user->id,
                'resolved_at'      => Carbon::now(),
            ]);

            return HelperFunction::response($anomaly, null, 'Anomaly resolved successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to resolve anomaly: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
