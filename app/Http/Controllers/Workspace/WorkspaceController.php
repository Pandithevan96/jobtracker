<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Helpers\HelperFunction;
use App\Models\Workspace\Workspace;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * --------------------------------------------------------------------------------
 * Workspace Controller
 * --------------------------------------------------------------------------------
 * Manages workspace lifecycle: create, list, details, update.
 * Permissions are enforced via HelperFunction::rolePermission(MODULE_ID).
 *
 * @package App\Http\Controllers\Workspace
 * @author  Development Team
 * @version 1.0.0
 * @since   2026-07-03
 * --------------------------------------------------------------------------------
 */
class WorkspaceController extends Controller
{
    /**
     * Module ID for Workspace Management (from module seeder, id = 2).
     */
    const MODULE_ID = 2;

    /**
     * --------------------------------------------------------------------------------
     * Create a new workspace.
     * POST /api/v1/workspaces/create
     * --------------------------------------------------------------------------------
     * @param  Request $request  name*, gstin, address, city, state, pincode, phone
     * @return \Illuminate\Http\JsonResponse
     * --------------------------------------------------------------------------------
     */
    public function store(Request $request)
    {
        try {
            // Check permission
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_create) {
                return HelperFunction::response(null, null, 'You do not have permission to create a workspace', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'name'    => 'required|string|max:255',
                'gstin'   => 'nullable|string|max:15',
                'address' => 'nullable|string|max:255',
                'city'    => 'nullable|string|max:100',
                'state'   => 'nullable|string|max:100',
                'pincode' => 'nullable|string|max:10',
                'phone'   => 'nullable|string|max:20',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();

            // Generate a unique slug
            $slug = Str::slug($request->input('name'));
            $originalSlug = $slug;
            $count = 1;
            while (Workspace::where('slug', $slug)->exists()) {
                $slug = $originalSlug . '-' . $count;
                $count++;
            }

            // Create Workspace
            $workspace = Workspace::create([
                'owner_id'            => $user->id,
                'name'                => $request->input('name'),
                'slug'                => $slug,
                'gstin'               => $request->input('gstin'),
                'address'             => $request->input('address'),
                'city'                => $request->input('city'),
                'state'               => $request->input('state'),
                'pincode'             => $request->input('pincode'),
                'phone'               => $request->input('phone'),
                'plan'                => Workspace::PLAN_FREE,
                'status'              => Workspace::STATUS_ACTIVE,
                'dc_count_this_month' => 0,
            ]);

            // Attach owner as a workspace member with workspace role 1 (Principal)
            $workspace->members()->attach($user->id, [
                'role'   => 1, // 1-Principal, 2-Vendor, 3-Admin
                'status' => 1, // 1-Active
            ]);

            return HelperFunction::response($workspace, null, 'Workspace created successfully', 'success', '000', Response::HTTP_CREATED);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to create workspace: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * List workspaces for the authenticated user.
     * POST /api/v1/workspaces/list
     * --------------------------------------------------------------------------------
     * @param  Request $request
     * @return \Illuminate\Http\JsonResponse
     * --------------------------------------------------------------------------------
     */
    public function list(Request $request)
    {
        try {
            // Check permission: allow view access if rolePermission is granted or missing (member scope below handles data isolation)
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if ($rolePermission && (!$rolePermission->can_access || !$rolePermission->can_view)) {
                return HelperFunction::response(null, null, 'You do not have permission to view workspaces', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $user = Auth::user();

            // Fetch workspaces where user is owner OR a member
            $workspaces = Workspace::where('owner_id', $user->id)
                ->orWhereHas('members', function ($query) use ($user) {
                    $query->where('users.id', $user->id);
                })
                ->get();

            if ($workspaces->isEmpty()) {
                $defaultName = ($user->name ? $user->name . "'s Workspace" : "My Workspace");
                $slug = Str::slug($defaultName);
                $originalSlug = $slug;
                $count = 1;
                while (Workspace::where('slug', $slug)->exists()) {
                    $slug = $originalSlug . '-' . $count;
                    $count++;
                }

                $workspace = Workspace::create([
                    'owner_id'            => $user->id,
                    'name'                => $defaultName,
                    'slug'                => $slug,
                    'plan'                => Workspace::PLAN_FREE,
                    'status'              => Workspace::STATUS_ACTIVE,
                    'dc_count_this_month' => 0,
                ]);

                $workspace->members()->attach($user->id, [
                    'role'   => 1, // Principal
                    'status' => 1, // Active
                ]);

                $workspaces = collect([$workspace]);
            }

            return HelperFunction::response($workspaces, null, 'Workspaces fetched successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to list workspaces: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Get detailed workspace information.
     * POST /api/v1/workspaces/details
     * --------------------------------------------------------------------------------
     * @param  Request $request  id*
     * @return \Illuminate\Http\JsonResponse
     * --------------------------------------------------------------------------------
     */
    public function show(Request $request)
    {
        try {
            // Check permission
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_view) {
                return HelperFunction::response(null, null, 'You do not have permission to view workspace details', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'id' => 'required|integer|exists:workspaces,id',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $workspaceId = $request->input('id');

            $workspace = Workspace::with(['owner', 'members'])->find($workspaceId);

            // Access check: user must be owner or a member
            $isMember = $workspace->owner_id === $user->id || $workspace->members->contains('id', $user->id);
            if (!$isMember) {
                return HelperFunction::response(null, null, 'You do not have access to this workspace', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            return HelperFunction::response($workspace, null, 'Workspace details fetched successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to get workspace details: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Update workspace details.
     * POST /api/v1/workspaces/update
     * --------------------------------------------------------------------------------
     * @param  Request $request  id*, name, gstin, address, city, state, pincode, phone
     * @return \Illuminate\Http\JsonResponse
     * --------------------------------------------------------------------------------
     */
    public function update(Request $request)
    {
        try {
            // Check permission
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_edit) {
                return HelperFunction::response(null, null, 'You do not have permission to update workspaces', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'id'      => 'required|integer|exists:workspaces,id',
                'name'    => 'nullable|string|max:255',
                'gstin'   => 'nullable|string|max:15',
                'address' => 'nullable|string|max:255',
                'city'    => 'nullable|string|max:100',
                'state'   => 'nullable|string|max:100',
                'pincode' => 'nullable|string|max:10',
                'phone'   => 'nullable|string|max:20',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $workspaceId = $request->input('id');
            $workspace = Workspace::find($workspaceId);

            // Ownership check: only workspace owner can update
            if ($workspace->owner_id !== $user->id) {
                return HelperFunction::response(null, null, 'Only the workspace owner can update workspace details', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            // Update fields if provided
            $updateData = array_filter($request->only([
                'name', 'gstin', 'address', 'city', 'state', 'pincode', 'phone', 'logo_path'
            ]), fn ($value) => !is_null($value));

            if (isset($updateData['name']) && $updateData['name'] !== $workspace->name) {
                $slug = Str::slug($updateData['name']);
                $originalSlug = $slug;
                $count = 1;
                while (Workspace::where('slug', $slug)->where('id', '!=', $workspaceId)->exists()) {
                    $slug = $originalSlug . '-' . $count;
                    $count++;
                }
                $updateData['slug'] = $slug;
            }

            $workspace->update($updateData);

            return HelperFunction::response($workspace->fresh(), null, 'Workspace updated successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to update workspace: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Upload Workspace Logo.
     * POST /api/v1/workspaces/upload-logo
     * --------------------------------------------------------------------------------
     * @param  Request $request  id*, file* (file upload or logo parameter)
     * @return \Illuminate\Http\JsonResponse
     * --------------------------------------------------------------------------------
     */
    public function uploadLogo(Request $request)
    {
        try {
            // Check permission
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_edit) {
                return HelperFunction::response(null, null, 'You do not have permission to update workspace logo', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'id'   => 'required|integer|exists:workspaces,id',
                'file' => 'nullable|file|image|max:5120',
                'logo' => 'nullable|file|image|max:5120',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $workspaceId = $request->input('id');
            $workspace = Workspace::find($workspaceId);

            if ($workspace->owner_id !== $user->id) {
                return HelperFunction::response(null, null, 'Only the workspace owner can update workspace logo', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $file = $request->file('file') ?? $request->file('logo');
            if (!$file) {
                return HelperFunction::response(null, null, 'No logo file uploaded', 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            // Store in public storage under workspace_logos
            $path = $file->store('workspace_logos', 'public');

            // Delete old logo if exists
            if ($workspace->logo_path && Storage::disk('public')->exists($workspace->logo_path)) {
                Storage::disk('public')->delete($workspace->logo_path);
            }

            $workspace->update(['logo_path' => $path]);

            $fullUrl = url('storage/' . $path);

            return HelperFunction::response([
                'workspace' => $workspace->fresh(),
                'logo_path' => $path,
                'logo_url'  => $fullUrl,
            ], null, 'Logo uploaded successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to upload logo: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * List all other active network workspaces available to be added as vendors.
     * POST /api/v1/workspaces/available-vendors
     * --------------------------------------------------------------------------------
     * @param  Request $request
     * @return \Illuminate\Http\JsonResponse
     * --------------------------------------------------------------------------------
     */
    public function availableVendors(Request $request)
    {
        try {
            $user = Auth::user();
            $currentWorkspaceId = $request->input('workspace_id');

            $query = Workspace::with('owner:id,name,email,phone')
                ->where('status', Workspace::STATUS_ACTIVE)
                ->where('owner_id', '!=', $user->id);

            if ($currentWorkspaceId) {
                $query->where('id', '!=', $currentWorkspaceId);
            }

            $workspaces = $query->get()->map(function ($ws) {
                return [
                    'id'             => $ws->id,
                    'owner_id'       => $ws->owner_id,
                    'name'           => $ws->name,
                    'gstin'          => $ws->gstin,
                    'city'           => $ws->city,
                    'state'          => $ws->state,
                    'address'        => $ws->address,
                    'phone'          => $ws->phone ?: ($ws->owner ? $ws->owner->phone : null),
                    'email'          => $ws->owner ? $ws->owner->email : null,
                    'contact_person' => $ws->owner ? $ws->owner->name : null,
                ];
            });

            return HelperFunction::response($workspaces, null, 'Available vendor workspaces fetched successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to fetch vendor workspaces: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
