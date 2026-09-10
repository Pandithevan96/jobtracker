<?php

namespace App\Jobs;

use App\Events\MaterialAnomalyDetected;
use App\Models\Job\JobOrder;
use App\Models\Job\MaterialAnomaly;
use App\Services\MaterialReconciliationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;

class DetectMaterialAnomaliesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public readonly ?int $jobOrderId = null,
        public readonly ?int $workspaceId = null
    ) {}

    public function handle(MaterialReconciliationService $service): void
    {
        $query = JobOrder::query();

        if ($this->jobOrderId) {
            $query->where('id', $this->jobOrderId);
        } elseif ($this->workspaceId) {
            $query->where('workspace_id', $this->workspaceId);
        } else {
            // Reconcile open / active jobs by default
            $query->whereIn('status', [
                JobOrder::STATUS_PENDING,
                JobOrder::STATUS_IN_PROGRESS,
                JobOrder::STATUS_PARTIAL_DELIVERY,
                JobOrder::STATUS_COMPLETED,
            ]);
        }

        $jobs = $query->get();

        foreach ($jobs as $job) {
            $result = $service->reconcile($job);

            $existingAnomaly = MaterialAnomaly::where('job_order_id', $job->id)
                ->where('resolved', false)
                ->first();

            if ($result['status'] === 'anomaly') {
                $anomalyData = [
                    'workspace_id'    => $job->workspace_id,
                    'job_order_id'    => $job->id,
                    'dispatched_qty'  => $result['dispatched_qty'],
                    'returned_qty'    => $result['returned_qty'],
                    'scrap_qty'       => $result['scrap_qty'],
                    'rework_qty'      => $result['rework_qty'],
                    'implied_wip_qty' => $result['implied_wip_qty'],
                    'variance_qty'    => $result['variance_qty'],
                    'variance_pct'    => $result['variance_pct'],
                    'status'          => 'open',
                ];

                if (!$existingAnomaly) {
                    $anomalyData['detected_at'] = Carbon::now();
                    $anomalyData['resolved'] = false;
                    $anomaly = MaterialAnomaly::create($anomalyData);
                    event(new MaterialAnomalyDetected($anomaly));
                } else {
                    $existingAnomaly->update($anomalyData);
                }
            } elseif ($existingAnomaly) {
                // Auto-resolve if numbers normalized back within tolerance
                $existingAnomaly->update([
                    'status'           => 'auto_resolved',
                    'resolved'         => true,
                    'resolution_notes' => 'Auto-resolved: Reconciliation within tolerance',
                    'resolved_at'      => Carbon::now(),
                ]);
            }
        }
    }
}
