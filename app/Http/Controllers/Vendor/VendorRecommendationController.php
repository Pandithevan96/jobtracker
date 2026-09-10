<?php

namespace App\Http\Controllers\Vendor;

use App\Http\Controllers\Controller;
use App\Helpers\HelperFunction;
use App\Models\Workspace\Workspace;
use App\Services\VendorRecommendationService;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class VendorRecommendationController extends Controller
{
    public function __construct(
        protected VendorRecommendationService $recommendationService
    ) {}

    /**
     * Get ranked vendor recommendations for a process type.
     * GET / POST /api/v1/vendors/recommendations
     */
    public function index(Request $request)
    {
        try {
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
                return HelperFunction::response([], null, 'Vendor recommendations fetched successfully', 'success', '000', Response::HTTP_OK);
            }

            $processType = $request->input('process_type');
            $recommendations = $this->recommendationService->recommendVendors($workspace->id, $processType);

            return HelperFunction::response($recommendations, null, 'Vendor recommendations calculated successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to fetch vendor recommendations: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
