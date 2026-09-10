<?php

namespace App\Services;

use App\Models\Job\JobOrder;
use App\Models\Job\JobOrderStatusLog;
use Illuminate\Support\Carbon;

class DelayRiskPredictionService
{
    /**
     * Calculate delay risk metrics for a single JobOrder.
     *
     * @param JobOrder $job
     * @return array
     */
    public function calculateJobRisk(JobOrder $job): array
    {
        $score = 0.0;
        $riskFactors = [];
        $now = Carbon::now();

        // If job is already completed or cancelled, risk is 0
        if (in_array($job->status, [JobOrder::STATUS_COMPLETED, JobOrder::STATUS_CANCELLED])) {
            return [
                'job_order_id'         => $job->id,
                'workspace_id'         => $job->workspace_id,
                'vendor_id'            => $job->vendor_id,
                'risk_score'           => 0.0,
                'risk_level'           => 'low',
                'delay_probability'    => 0.0,
                'estimated_delay_days' => 0,
                'risk_factors'         => ['Order completed or cancelled'],
            ];
        }

        // 1. Due Date Overdue / Urgency Analysis
        $estimatedDelayDays = 0;
        if ($job->due_date) {
            $dueDate = Carbon::parse($job->due_date);
            
            if ($now->greaterThan($dueDate)) {
                $daysOverdue = (int) ceil($now->diffInDays($dueDate));
                $score += min(50.0, 30.0 + ($daysOverdue * 5.0));
                $estimatedDelayDays = $daysOverdue;
                $riskFactors[] = "Past due date by {$daysOverdue} day(s)";
            } else {
                $daysRemaining = (int) ceil($now->diffInDays($dueDate, false));
                if ($daysRemaining <= 2 && in_array($job->status, [JobOrder::STATUS_DRAFT, JobOrder::STATUS_IN_PROGRESS])) {
                    $score += 25.0;
                    $riskFactors[] = "Due date in {$daysRemaining} day(s) with early manufacturing status";
                } elseif ($daysRemaining <= 5 && $job->status === JobOrder::STATUS_DRAFT) {
                    $score += 15.0;
                    $riskFactors[] = "Order still in Draft with 5 or fewer days to due date";
                }
            }
        }

        // 2. Vendor Historical Performance
        if ($job->vendor_id) {
            $pastJobs = JobOrder::where('vendor_id', $job->vendor_id)
                ->where('status', JobOrder::STATUS_COMPLETED)
                ->whereNotNull('due_date')
                ->get();

            if ($pastJobs->isNotEmpty()) {
                $lateCount = 0;
                foreach ($pastJobs as $pj) {
                    $lastLog = JobOrderStatusLog::where('job_order_id', $pj->id)
                        ->where('to_status', JobOrder::STATUS_COMPLETED)
                        ->latest()
                        ->first();
                    
                    $completedAt = $lastLog ? $lastLog->created_at : $pj->updated_at;
                    if ($completedAt && Carbon::parse($completedAt)->greaterThan(Carbon::parse($pj->due_date))) {
                        $lateCount++;
                    }
                }

                $lateRate = ($lateCount / $pastJobs->count()) * 100;
                if ($lateRate > 0) {
                    $added = min(30.0, ($lateRate / 100) * 30.0);
                    $score += $added;
                    $rateFormatted = round($lateRate, 1);
                    $riskFactors[] = "Vendor historical late delivery rate: {$rateFormatted}%";
                }
            }
        }

        // 3. Status Stagnation Velocity
        $lastLog = JobOrderStatusLog::where('job_order_id', $job->id)
            ->latest('created_at')
            ->first();

        $lastUpdated = $lastLog ? Carbon::parse($lastLog->created_at) : Carbon::parse($job->updated_at ?? $job->created_at);
        $daysInCurrentStatus = (int) $now->diffInDays($lastUpdated);

        if ($daysInCurrentStatus >= 7) {
            $score += min(20.0, 10.0 + ($daysInCurrentStatus - 7) * 2);
            $riskFactors[] = "Stagnant in current status for {$daysInCurrentStatus} days";
        }

        // Cap score at 100
        $riskScore = round(min(100.0, max(0.0, $score)), 2);

        // Determine Risk Level
        if ($riskScore >= 80.0) {
            $riskLevel = 'critical';
        } elseif ($riskScore >= 50.0) {
            $riskLevel = 'high';
        } elseif ($riskScore >= 25.0) {
            $riskLevel = 'medium';
        } else {
            $riskLevel = 'low';
        }

        $delayProbability = round(min(1.0, $riskScore / 100.0), 3);

        if (empty($riskFactors)) {
            $riskFactors[] = 'Manufacturing progress on schedule';
        }

        return [
            'job_order_id'         => $job->id,
            'workspace_id'         => $job->workspace_id,
            'vendor_id'            => $job->vendor_id,
            'risk_score'           => $riskScore,
            'risk_level'           => $riskLevel,
            'delay_probability'    => $delayProbability,
            'estimated_delay_days' => $estimatedDelayDays,
            'risk_factors'         => $riskFactors,
        ];
    }
}
