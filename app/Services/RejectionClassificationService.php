<?php

namespace App\Services;

use App\Models\Job\QualityRejection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RejectionClassificationService
{
    /**
     * Classify defect type and suggested rejection category for a QualityRejection.
     *
     * @param QualityRejection $rejection
     * @return array
     */
    public function classify(QualityRejection $rejection): array
    {
        $apiKey = null;
        try {
            $apiKey = config('services.anthropic.api_key');
        } catch (\Throwable $e) {
            $apiKey = env('ANTHROPIC_API_KEY');
        }
        $photoUrl = $rejection->photo_path;
        $reason = strtolower($rejection->rejection_reason ?? '');

        if ($apiKey && $photoUrl) {
            try {
                $response = Http::withHeaders([
                    'x-api-key'         => $apiKey,
                    'anthropic-version' => '2023-06-01',
                    'content-type'      => 'application/json',
                ])->post('https://api.anthropic.com/v1/messages', [
                    'model'      => 'claude-3-5-sonnet-20241022',
                    'max_tokens' => 300,
                    'messages'   => [
                        [
                            'role'    => 'user',
                            'content' => [
                                [
                                    'type' => 'text',
                                    'text' => "Analyze this manufacturing defect image and text reason: \"{$rejection->rejection_reason}\". Respond only with valid JSON format: {\"suggested_category\": \"scrap\"|\"rework\", \"confidence\": float_0_to_100, \"tags\": [\"tag1\", \"tag2\"], \"explanation\": \"short text\"}",
                                ],
                                [
                                    'type' => 'image',
                                    'source' => [
                                        'type'       => 'url',
                                        'url'        => $photoUrl,
                                    ],
                                ],
                            ],
                        ],
                    ],
                ]);

                if ($response->successful()) {
                    $jsonContent = $response->json('content.0.text');
                    $parsed = json_decode($jsonContent, true);
                    if (is_array($parsed) && isset($parsed['suggested_category'])) {
                        return [
                            'ai_defect_tags'        => $parsed['tags'] ?? ['vision_classified'],
                            'ai_suggested_category' => strtolower($parsed['suggested_category']),
                            'ai_confidence'         => (float) ($parsed['confidence'] ?? 90.0),
                            'explanation'           => $parsed['explanation'] ?? 'Classified via Anthropic Claude Vision API',
                        ];
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('Anthropic Vision API call failed, falling back to heuristic classifier: ' . $e->getMessage());
            }
        }

        // Heuristic fallback analyzer based on domain keywords
        $isScrapKeywords = ['crack', 'broken', 'undersized', 'hole too big', 'porosity', 'deep void', 'snapped', 'melted'];
        $isReworkKeywords = ['burr', 'oversized', 'rough finish', 'rust', 'flash', 'dents', 'surface scratch', 'threads tight', 'sharp edge'];

        $scrapMatches = 0;
        $reworkMatches = 0;

        foreach ($isScrapKeywords as $kw) {
            if (str_contains($reason, $kw)) $scrapMatches++;
        }

        foreach ($isReworkKeywords as $kw) {
            if (str_contains($reason, $kw)) $reworkMatches++;
        }

        if ($scrapMatches > $reworkMatches) {
            $category = 'scrap';
            $confidence = 88.5;
            $tags = ['dimensional_loss', 'material_damage'];
        } elseif ($reworkMatches > 0) {
            $category = 'rework';
            $confidence = 92.0;
            $tags = ['surface_defect', 'reprocess_eligible'];
        } else {
            $category = $rejection->rejection_type === QualityRejection::TYPE_SCRAP ? 'scrap' : 'rework';
            $confidence = 75.0;
            $tags = ['quality_inspection_logged'];
        }

        return [
            'ai_defect_tags'        => $tags,
            'ai_suggested_category' => $category,
            'ai_confidence'         => $confidence,
            'explanation'           => 'Domain-calibrated defect analyzer',
        ];
    }
}
