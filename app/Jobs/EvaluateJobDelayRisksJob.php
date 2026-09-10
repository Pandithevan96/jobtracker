<?php

namespace App\Jobs;

use App\Events\DelayRiskUpdated;
use App\Models\Job\DelayRiskScore;
use App\Models\Job\JobOrder;
use App\Services\DelayRiskPredictionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;

class EvaluateJobDelayRisksJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public readonly ?int $jobOrderId = null,
        public readonly ?int $workspaceId = null
    ) {}

    public function handle(DelayRiskPredictionService $predictionService): void
    {
        $query = JobOrder::query();

        if ($this->jobOrderId) {
            $query->where('id', $this->jobOrderId);
        } elseif ($this->workspaceId) {
            $query->where('workspace_id', $this->workspaceId);
        } else {
            $query->whereNotIn('status', [JobOrder::STATUS_COMPLETED, JobOrder::STATUS_CANCELLED]);
        }

        $jobs = $query->get();

        foreach ($jobs as $job) {
            $riskData = $predictionService->calculateJobRisk($job);

            $record = DelayRiskScore::updateOrCreate(
                [
                    'workspace_id' => $job->workspace_id,
                    'job_order_id' => $job->id,
                ],
                [
                    'vendor_id'            => $job->vendor_id,
                    'risk_score'           => $riskData['risk_score'],
                    'risk_level'           => $riskData['risk_level'],
                    'delay_probability'    => $riskData['delay_probability'],
                    'estimated_delay_days' => $riskData['estimated_delay_days'],
                    'risk_factors'         => $riskData['risk_factors'],
                    'calculated_at'        => Carbon::now(),
                ]
            );

            event(new DelayRiskUpdated($record));
        }
    }
}
