<?php

namespace App\Http\Controllers\Job;

use App\Http\Controllers\Controller;
use App\Helpers\HelperFunction;
use App\Models\Job\DrawingExtractedSpec;
use App\Models\Workspace\Workspace;
use App\Services\DrawingSpecExtractionService;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response;

class DrawingSpecController extends Controller
{
    public function __construct(
        protected DrawingSpecExtractionService $extractionService
    ) {}

    /**
     * Extract engineering specs from drawing file.
     * POST /api/v1/job-orders/extract-drawing-specs
     */
    public function extract(Request $request)
    {
        try {
            $validation = Validator::make($request->all(), [
                'workspace_id' => 'nullable|integer',
                'drawing'      => 'nullable|file|mimes:pdf,jpg,jpeg,png,webp|max:10240',
                'drawing_path' => 'nullable|string',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

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
                return HelperFunction::response(null, null, 'Workspace access denied', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $filePath = $request->input('drawing_path');
            $originalName = null;
            $localFilePath = null;

            if ($request->hasFile('drawing')) {
                $file = $request->file('drawing');
                $originalName = $file->getClientOriginalName();
                $localFilePath = $file->getRealPath();
                $storedPath = $file->store('drawings', 'public');
                $filePath = asset('storage/' . $storedPath);
            }

            if (!$filePath) {
                return HelperFunction::response(null, null, 'Drawing file or path is required for extraction', 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $extracted = $this->extractionService->extractSpecs($filePath, $localFilePath, $originalName);

            $record = DrawingExtractedSpec::create([
                'workspace_id'      => $workspace->id,
                'drawing_path'      => $filePath,
                'extracted_specs'   => $extracted['extracted_specs'],
                'confidence_scores' => $extracted['confidence_scores'],
                'status'            => 'extracted',
                'extracted_at'      => Carbon::now(),
            ]);

            return HelperFunction::response($record, null, 'Drawing specs extracted successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to extract drawing specs: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
