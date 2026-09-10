<?php

namespace App\Events;

use App\Models\Job\MaterialAnomaly;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MaterialAnomalyDetected implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly MaterialAnomaly $anomaly
    ) {}

    /**
     * Broadcast on the private channel for the workspace.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("workspace.{$this->anomaly->workspace_id}"),
        ];
    }

    /**
     * The event name that Echo listens for on the client.
     */
    public function broadcastAs(): string
    {
        return 'material.anomaly.detected';
    }

    /**
     * The data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'anomaly' => [
                'id'            => $this->anomaly->id,
                'job_order_id'  => $this->anomaly->job_order_id,
                'variance_qty'  => $this->anomaly->variance_qty,
                'variance_pct'  => $this->anomaly->variance_pct,
                'status'        => $this->anomaly->status,
                'detected_at'   => $this->anomaly->detected_at?->toIso8601String(),
            ],
        ];
    }
}
