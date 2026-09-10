<?php

namespace App\Services;

use App\Models\Vendor\Vendor;
use App\Models\Vendor\VendorPerformanceScore;
use App\Models\Job\JobOrder;
use App\Models\Job\QualityRejection;
use Illuminate\Support\Carbon;

class VendorRecommendationService
{
    /**
     * Calculate and return performance scores for all vendors in a workspace.
     *
     * @param int $workspaceId
     * @param string|null $processType
     * @return array
     */
    public function recommendVendors(int $workspaceId, ?string $processType = null): array
    {
        $vendors = Vendor::where('workspace_id', $workspaceId)->get();
        $recommendations = [];

        foreach ($vendors as $vendor) {
            // 1. On-time delivery rate
            $completedJobs = JobOrder::where('vendor_id', $vendor->id)
                ->where('status', JobOrder::STATUS_COMPLETED)
                ->get();

            $totalCompleted = $completedJobs->count();
            $onTimeScore = 100.0;

            if ($totalCompleted > 0) {
                $onTimeCount = 0;
                foreach ($completedJobs as $job) {
                    if (!$job->due_date || Carbon::parse($job->updated_at)->lte(Carbon::parse($job->due_date))) {
                        $onTimeCount++;
                    }
                }
                $onTimeScore = round(($onTimeCount / $totalCompleted) * 100.0, 2);
            }

            // 2. Quality Yield Score
            $totalScrapQty = (float) QualityRejection::whereHas('jobOrder', fn($q) => $q->where('vendor_id', $vendor->id))
                ->where('rejection_type', QualityRejection::TYPE_SCRAP)
                ->sum('rejected_qty');

            $totalDispatched = (float) JobOrder::where('vendor_id', $vendor->id)->sum('quantity_sent');

            $qualityScore = 100.0;
            if ($totalDispatched > 0 && $totalScrapQty > 0) {
                $scrapPct = ($totalScrapQty / $totalDispatched) * 100.0;
                $qualityScore = round(max(0.0, 100.0 - ($scrapPct * 3.0)), 2);
            }

            // 3. Capacity & Active WIP Score
            $activeWipCount = JobOrder::where('vendor_id', $vendor->id)
                ->whereIn('status', [JobOrder::STATUS_PENDING, JobOrder::STATUS_IN_PROGRESS, JobOrder::STATUS_PARTIAL_DELIVERY])
                ->count();

            $capacityScore = max(30.0, 100.0 - ($activeWipCount * 12.0));

            // 4. Overall Weighted Score
            $overallScore = round((0.40 * $onTimeScore) + (0.35 * $qualityScore) + (0.25 * $capacityScore), 2);

            // Update database record
            VendorPerformanceScore::updateOrCreate(
                [
                    'workspace_id' => $workspaceId,
                    'vendor_id'    => $vendor->id,
                ],
                [
                    'overall_score'              => $overallScore,
                    'on_time_delivery_score'     => $onTimeScore,
                    'quality_yield_score'        => $qualityScore,
                    'capacity_utilization_score' => round($capacityScore, 2),
                    'total_jobs_completed'       => $totalCompleted,
                    'calculated_at'              => Carbon::now(),
                ]
            );

            // Assign Badge
            $badge = 'Recommended';
            if ($overallScore >= 92.0 && $activeWipCount <= 2) {
                $badge = 'Top Pick';
            } elseif ($qualityScore >= 98.0) {
                $badge = 'Highest Quality';
            } elseif ($onTimeScore >= 95.0) {
                $badge = 'Fastest Delivery';
            } elseif ($activeWipCount === 0) {
                $badge = 'Immediate Capacity';
            }

            $recommendations[] = [
                'vendor_id'                  => $vendor->id,
                'shop_name'                  => $vendor->shop_name,
                'contact_person'             => $vendor->contact_person,
                'phone'                      => $vendor->phone,
                'overall_score'              => $overallScore,
                'on_time_delivery_score'     => $onTimeScore,
                'quality_yield_score'        => $qualityScore,
                'capacity_score'             => round($capacityScore, 2),
                'active_wip_count'           => $activeWipCount,
                'total_jobs_completed'       => $totalCompleted,
                'recommendation_badge'       => $badge,
            ];
        }

        // Sort descending by overall_score
        usort($recommendations, fn($a, $b) => $b['overall_score'] <=> $a['overall_score']);

        return $recommendations;
    }
}
