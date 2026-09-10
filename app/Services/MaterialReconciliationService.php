<?php

namespace App\Services;

use App\Models\Job\JobOrder;
use App\Models\Challan\DeliveryChallan;
use App\Models\Job\QualityRejection;

class MaterialReconciliationService
{
    /**
     * Reconcile material dispatch vs returns for a given JobOrder.
     *
     * @param JobOrder $job
     * @return array
     */
    public function reconcile(JobOrder $job): array
    {
        // 1. Calculate Dispatched Quantity
        $outwardChallanIds = DeliveryChallan::where('job_order_id', $job->id)
            ->where('type', DeliveryChallan::TYPE_OUTWARD)
            ->where('status', '!=', DeliveryChallan::STATUS_CANCELLED)
            ->pluck('id');

        if ($outwardChallanIds->isNotEmpty()) {
            $dispatchedQty = (float) \App\Models\Challan\ChallanItem::whereIn('challan_id', $outwardChallanIds)
                ->sum('quantity');
        } else {
            $dispatchedQty = (float) $job->quantity_sent;
        }

        // 2. Calculate Returned Quantity (Inward DCs)
        $inwardChallanIds = DeliveryChallan::where('job_order_id', $job->id)
            ->where('type', DeliveryChallan::TYPE_INWARD)
            ->where('status', '!=', DeliveryChallan::STATUS_CANCELLED)
            ->pluck('id');

        $returnedQty = 0.0;
        if ($inwardChallanIds->isNotEmpty()) {
            $returnedQty = (float) \App\Models\Challan\ChallanItem::whereIn('challan_id', $inwardChallanIds)
                ->sum('quantity');
        }

        // 3. Calculate Scrap & Rework Quantities
        $scrapQty = (float) QualityRejection::where('job_order_id', $job->id)
            ->where('rejection_type', QualityRejection::TYPE_SCRAP)
            ->sum('rejected_qty');

        $reworkQty = (float) QualityRejection::where('job_order_id', $job->id)
            ->where('rejection_type', QualityRejection::TYPE_REWORK)
            ->sum('rejected_qty');

        // 4. Implied WIP (Items still at vendor shop being processed)
        $impliedWipQty = max(0.0, $dispatchedQty - $returnedQty - $scrapQty);

        // 5. Fetch Workspace Loss Tolerance (default 2.0%)
        $tolerancePct = 2.0;
        if ($job->relationLoaded('workspace') && $job->workspace) {
            $tolerancePct = (float) ($job->workspace->material_loss_tolerance_pct ?? 2.0);
        } else {
            $ws = \App\Models\Workspace\Workspace::find($job->workspace_id);
            if ($ws && isset($ws->material_loss_tolerance_pct)) {
                $tolerancePct = (float) $ws->material_loss_tolerance_pct;
            }
        }

        // 6. Variance Calculation
        $accountedQty = $returnedQty + $scrapQty;
        
        // If job is still open (not completed), implied WIP is expected
        $isCompleted = ($job->status === JobOrder::STATUS_COMPLETED);

        if ($accountedQty > $dispatchedQty) {
            // Anomaly: Returned + Scrap exceeds Dispatched
            $varianceQty = $accountedQty - $dispatchedQty;
            $variancePct = $dispatchedQty > 0 ? ($varianceQty / $dispatchedQty) * 100 : 0.0;
            $status = 'anomaly';
        } elseif (!$isCompleted && ($dispatchedQty - $accountedQty) >= 0) {
            // Pending: Open job with expected WIP
            $varianceQty = 0.0;
            $variancePct = 0.0;
            $status = 'pending';
        } else {
            // Completed job or negative WIP: Check shortfall against tolerance
            $shortfallQty = $dispatchedQty - $accountedQty;
            $variancePct = $dispatchedQty > 0 ? ($shortfallQty / $dispatchedQty) * 100 : 0.0;
            $varianceQty = $shortfallQty;

            if ($variancePct > $tolerancePct) {
                $status = 'anomaly';
            } else {
                $status = 'balanced';
            }
        }

        return [
            'job_order_id'    => $job->id,
            'workspace_id'    => $job->workspace_id,
            'dispatched_qty'  => round($dispatchedQty, 2),
            'returned_qty'    => round($returnedQty, 2),
            'scrap_qty'       => round($scrapQty, 2),
            'rework_qty'      => round($reworkQty, 2),
            'implied_wip_qty' => round($impliedWipQty, 2),
            'variance_qty'    => round($varianceQty, 2),
            'variance_pct'    => round($variancePct, 2),
            'tolerance_pct'   => round($tolerancePct, 2),
            'status'          => $status,
        ];
    }
}
