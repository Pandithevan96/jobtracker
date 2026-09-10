<?php

namespace App\Http\Controllers\Job;

use App\Http\Controllers\Controller;
use App\Helpers\HelperFunction;
use App\Models\Job\DelayRiskScore;
use App\Models\Job\JobOrder;
use App\Models\Workspace\Workspace;
use App\Services\DelayRiskPredictionService;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class DelayRiskController extends Controller
{
    public function __construct(
        protected DelayRiskPredictionService $predictionService
    ) {}

    /**
     * Get real-time delay risk prediction for a single JobOrder.
     * GET /api/v1/job-orders/{id}/delay-risk
     */
    public function showJobRisk(Request $request, $id)
    {
        try {
            $user = Auth::user();
            $jobOrder = JobOrder::with(['workspace', 'vendor'])->find($id);

            if (!$jobOrder) {
                return HelperFunction::response(null, null, 'Job Order not found', 'error', '004', Response::HTTP_NOT_FOUND);
            }

            // Workspace scope check
            $workspace = Workspace::where('id', $jobOrder->workspace_id)
                ->where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                        ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
                })
                ->first();

            if (!$workspace) {
                return HelperFunction::response(null, null, 'Workspace access denied', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $riskData = $this->predictionService->calculateJobRisk($jobOrder);

            // Persist / update cached score
            $record = DelayRiskScore::updateOrCreate(
                [
                    'workspace_id' => $jobOrder->workspace_id,
                    'job_order_id' => $jobOrder->id,
                ],
                [
                    'vendor_id'            => $jobOrder->vendor_id,
                    'risk_score'           => $riskData['risk_score'],
                    'risk_level'           => $riskData['risk_level'],
                    'delay_probability'    => $riskData['delay_probability'],
                    'estimated_delay_days' => $riskData['estimated_delay_days'],
                    'risk_factors'         => $riskData['risk_factors'],
                    'calculated_at'        => Carbon::now(),
                ]
            );

            return HelperFunction::response($record, null, 'Job delay risk calculated successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to calculate delay risk: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * List workspace job orders sorted by delay risk score.
     * GET / POST /api/v1/delay-risks
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
                return HelperFunction::response([], null, 'Delay risks fetched successfully', 'success', '000', Response::HTTP_OK);
            }

            // Automatically evaluate open jobs for workspace
            $openJobs = JobOrder::where('workspace_id', $workspace->id)
                ->whereNotIn('status', [JobOrder::STATUS_COMPLETED, JobOrder::STATUS_CANCELLED])
                ->get();

            foreach ($openJobs as $job) {
                $calc = $this->predictionService->calculateJobRisk($job);
                DelayRiskScore::updateOrCreate(
                    [
                        'workspace_id' => $job->workspace_id,
                        'job_order_id' => $job->id,
                    ],
                    [
                        'vendor_id'            => $job->vendor_id,
                        'risk_score'           => $calc['risk_score'],
                        'risk_level'           => $calc['risk_level'],
                        'delay_probability'    => $calc['delay_probability'],
                        'estimated_delay_days' => $calc['estimated_delay_days'],
                        'risk_factors'         => $calc['risk_factors'],
                        'calculated_at'        => Carbon::now(),
                    ]
                );
            }

            $query = DelayRiskScore::with(['jobOrder.vendor', 'vendor'])
                ->where('workspace_id', $workspace->id);

            if ($request->filled('risk_level')) {
                $query->where('risk_level', $request->input('risk_level'));
            }

            $risks = $query->orderBy('risk_score', 'desc')->get();

            return HelperFunction::response($risks, null, 'Delay risk analysis fetched successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to fetch delay risks: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
