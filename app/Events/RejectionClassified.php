<?php

namespace App\Events;

use App\Models\Job\QualityRejection;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RejectionClassified implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly QualityRejection $rejection
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("job-order.{$this->rejection->job_order_id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'rejection.classified';
    }

    public function broadcastWith(): array
    {
        return [
            'rejection' => [
                'id'                    => $this->rejection->id,
                'job_order_id'          => $this->rejection->job_order_id,
                'ai_defect_tags'        => $this->rejection->ai_defect_tags,
                'ai_suggested_category' => $this->rejection->ai_suggested_category,
                'ai_confidence'         => $this->rejection->ai_confidence,
                'ai_reviewed'           => $this->rejection->ai_reviewed,
            ],
        ];
    }
}
