<?php

namespace App\Jobs;

use App\Events\RejectionClassified;
use App\Models\Job\QualityRejection;
use App\Services\RejectionClassificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ClassifyRejectionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public readonly int $rejectionId
    ) {}

    public function handle(RejectionClassificationService $service): void
    {
        $rejection = QualityRejection::find($this->rejectionId);

        if (!$rejection) return;

        $result = $service->classify($rejection);

        $rejection->update([
            'ai_defect_tags'        => $result['ai_defect_tags'],
            'ai_suggested_category' => $result['ai_suggested_category'],
            'ai_confidence'         => $result['ai_confidence'],
        ]);

        event(new RejectionClassified($rejection));
    }
}
