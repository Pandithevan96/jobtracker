<?php

namespace App\Http\Controllers\Vendor;

use App\Http\Controllers\Controller;
use App\Helpers\HelperFunction;
use App\Models\Vendor\Vendor;
use App\Models\Workspace\Workspace;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response;

/**
 * --------------------------------------------------------------------------------
 * Vendor Controller
 * --------------------------------------------------------------------------------
 * Manages vendor lifecycle within a workspace: create, list, details, update.
 * Permissions are enforced via HelperFunction::rolePermission(MODULE_ID).
 * Workspace scoping is enforced by checking workspace_id ownership/membership.
 *
 * @package App\Http\Controllers\Vendor
 * @author  Development Team
 * @version 1.0.0
 * @since   2026-07-03
 * --------------------------------------------------------------------------------
 */
class VendorController extends Controller
{
    /**
     * Module ID for Vendor Management (from module seeder, id = 3).
     */
    const MODULE_ID = 3;

    /**
     * --------------------------------------------------------------------------------
     * Create a new vendor in a workspace.
     * POST /api/v1/vendors/create
     * --------------------------------------------------------------------------------
     * @param  Request $request  workspace_id*, shop_name*, phone*, contact_person, whatsapp_number,
     *                           email, gstin, address, city, pincode, preferred_language
     * @return \Illuminate\Http\JsonResponse
     * --------------------------------------------------------------------------------
     */
    public function store(Request $request)
    {
        try {
            // Check permission
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_create) {
                return HelperFunction::response(null, null, 'You do not have permission to create vendors', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'workspace_id'       => 'required|integer|exists:workspaces,id',
                'shop_name'          => 'required|string|max:255',
                'contact_person'     => 'nullable|string|max:255',
                'phone'              => 'required|string|max:20',
                'whatsapp_number'    => 'nullable|string|max:20',
                'email'              => 'nullable|email|max:255',
                'gstin'              => 'nullable|string|max:15',
                'address'            => 'nullable|string|max:255',
                'city'               => 'nullable|string|max:100',
                'pincode'            => 'nullable|string|max:10',
                'preferred_language' => 'nullable|integer|in:1,2', // 1-English, 2-Tamil
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $workspaceId = $request->input('workspace_id');

            // Workspace scope: confirm user belongs to this workspace
            $workspace = Workspace::where('id', $workspaceId)
                ->where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                        ->orWhereHas('members', fn($m) => $m->where('users.id', $user->id));
                })
                ->first();

            if (!$workspace) {
                return HelperFunction::response(null, null, 'Workspace not found or you do not belong to it', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            // Plan constraint: Free plan max 10 vendors, Factory plan max 20 vendors
            $currentCount = Vendor::where('workspace_id', $workspaceId)->count();
            if ($workspace->plan === Workspace::PLAN_FREE && $currentCount >= 10) {
                return HelperFunction::response(null, null, 'Free plan is limited to 10 vendors. Please upgrade.', 'error', '004', Response::HTTP_FORBIDDEN);
            }
            if ($workspace->plan === Workspace::PLAN_FACTORY && $currentCount >= 20) {
                return HelperFunction::response(null, null, 'Factory plan is limited to 20 vendors. Please upgrade to Industrial plan.', 'error', '004', Response::HTTP_FORBIDDEN);
            }

            $vendor = Vendor::create([
                'workspace_id'       => $workspaceId,
                'shop_name'          => $request->input('shop_name'),
                'contact_person'     => $request->input('contact_person'),
                'phone'              => $request->input('phone'),
                'whatsapp_number'    => $request->input('whatsapp_number') ?? $request->input('phone'),
                'email'              => $request->input('email'),
                'gstin'              => $request->input('gstin'),
                'address'            => $request->input('address'),
                'city'               => $request->input('city'),
                'pincode'            => $request->input('pincode'),
                'preferred_language' => $request->input('preferred_language', Vendor::LANG_ENGLISH),
                'status'             => Vendor::STATUS_ACTIVE,
            ]);

            return HelperFunction::response($vendor, null, 'Vendor created successfully', 'success', '000', Response::HTTP_CREATED);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to create vendor: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * List vendors under a workspace.
     * POST /api/v1/vendors/list
     * --------------------------------------------------------------------------------
     * @param  Request $request  workspace_id*
     * @return \Illuminate\Http\JsonResponse
     * --------------------------------------------------------------------------------
     */
    public function list(Request $request)
    {
        try {
            // Check permission
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_view) {
                return HelperFunction::response(null, null, 'You do not have permission to view vendors', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'workspace_id' => 'required|integer|exists:workspaces,id',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $workspaceId = $request->input('workspace_id');

            // Workspace scope check
            $workspace = Workspace::where('id', $workspaceId)
                ->where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                        ->orWhereHas('members', fn($m) => $m->where('users.id', $user->id));
                })
                ->first();

            if (!$workspace) {
                return HelperFunction::response(null, null, 'Workspace not found or you do not belong to it', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $vendors = Vendor::where('workspace_id', $workspaceId)
                ->orderBy('shop_name')
                ->get();

            return HelperFunction::response($vendors, null, 'Vendors fetched successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to list vendors: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Get details for a specific vendor.
     * POST /api/v1/vendors/details
     * --------------------------------------------------------------------------------
     * @param  Request $request  id*
     * @return \Illuminate\Http\JsonResponse
     * --------------------------------------------------------------------------------
     */
    public function details(Request $request)
    {
        try {
            // Check permission
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_view) {
                return HelperFunction::response(null, null, 'You do not have permission to view vendor details', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'id' => 'required|integer|exists:vendors,id',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $vendor = Vendor::find($request->input('id'));

            // Workspace scope check
            $workspace = Workspace::where('id', $vendor->workspace_id)
                ->where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                        ->orWhereHas('members', fn($m) => $m->where('users.id', $user->id));
                })
                ->first();

            if (!$workspace) {
                return HelperFunction::response(null, null, 'You do not have access to this vendor', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            return HelperFunction::response($vendor, null, 'Vendor details fetched successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to get vendor details: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Update an existing vendor.
     * POST /api/v1/vendors/update
     * --------------------------------------------------------------------------------
     * @param  Request $request  id*, shop_name, contact_person, phone, whatsapp_number,
     *                           email, gstin, address, city, pincode, preferred_language, status
     * @return \Illuminate\Http\JsonResponse
     * --------------------------------------------------------------------------------
     */
    public function update(Request $request)
    {
        try {
            // Check permission
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_edit) {
                return HelperFunction::response(null, null, 'You do not have permission to update vendors', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'id'                 => 'required|integer|exists:vendors,id',
                'shop_name'          => 'nullable|string|max:255',
                'contact_person'     => 'nullable|string|max:255',
                'phone'              => 'nullable|string|max:20',
                'whatsapp_number'    => 'nullable|string|max:20',
                'email'              => 'nullable|email|max:255',
                'gstin'              => 'nullable|string|max:15',
                'address'            => 'nullable|string|max:255',
                'city'               => 'nullable|string|max:100',
                'pincode'            => 'nullable|string|max:10',
                'preferred_language' => 'nullable|integer|in:1,2',
                'status'             => 'nullable|integer|in:1,2,3', // 1-Active, 2-Inactive, 3-Suspended
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $vendor = Vendor::find($request->input('id'));

            // Workspace scope check
            $workspace = Workspace::where('id', $vendor->workspace_id)
                ->where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                        ->orWhereHas('members', fn($m) => $m->where('users.id', $user->id));
                })
                ->first();

            if (!$workspace) {
                return HelperFunction::response(null, null, 'You do not have access to update this vendor', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $updateData = array_filter($request->only([
                'shop_name',
                'contact_person',
                'phone',
                'whatsapp_number',
                'email',
                'gstin',
                'address',
                'city',
                'pincode',
                'preferred_language',
                'status',
            ]), fn($value) => !is_null($value));

            $vendor->update($updateData);

            return HelperFunction::response($vendor->fresh(), null, 'Vendor updated successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to update vendor: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
    /**
     * --------------------------------------------------------------------------------
     * Link an existing registered user account to a vendor record, and grant
     * them workspace membership with role = 2 (Vendor) so they can log in
     * and see job orders assigned to them.
     * POST /api/v1/vendors/link-user
     * --------------------------------------------------------------------------------
     * @param  Request $request  vendor_id*, email_or_phone*
     * @return \Illuminate\Http\JsonResponse
     * --------------------------------------------------------------------------------
     */
    public function linkUser(Request $request)
    {
        try {
            $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
            if (!$rolePermission || !$rolePermission->can_access || !$rolePermission->can_edit) {
                return HelperFunction::response(null, null, 'You do not have permission to link a vendor user', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $validation = Validator::make($request->all(), [
                'vendor_id'       => 'required|integer|exists:vendors,id',
                'email_or_phone'  => 'required|string|max:255',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $authUser = Auth::user();
            $vendor = Vendor::find($request->input('vendor_id'));

            // Only the workspace owner/principal can link vendors
            $workspace = Workspace::where('id', $vendor->workspace_id)
                ->where('owner_id', $authUser->id)
                ->first();

            if (!$workspace) {
                return HelperFunction::response(null, null, 'Only the workspace owner can link a vendor user', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $identifier = $request->input('email_or_phone');
            $targetUser = \App\Models\User\User::where('email', $identifier)
                ->orWhere('phone', $identifier)
                ->first();

            if (!$targetUser) {
                return HelperFunction::response(null, null, 'No registered account found with that email or phone. Ask them to register first, then try again.', 'error', '003', Response::HTTP_NOT_FOUND);
            }

            if ($targetUser->id === $authUser->id) {
                return HelperFunction::response(null, null, 'You cannot link yourself as a vendor', 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            // Attach (or update) workspace membership as a Vendor.
            // NOTE: Workspace::MEMBER_ROLE_VENDOR (pivot scale) is distinct
            // from User::ROLE_VENDOR (global account-role scale) — they use
            // the same 1/2/3 values for different things, so always go
            // through the named constant here, never a bare integer.
            $workspace->members()->syncWithoutDetaching([
                $targetUser->id => [
                    'role'   => Workspace::MEMBER_ROLE_VENDOR,
                    'status' => Workspace::MEMBER_STATUS_ACTIVE,
                ],
            ]);

            $vendor->update(['linked_user_id' => $targetUser->id]);

            return HelperFunction::response($vendor->fresh(), null, 'Vendor linked to user account successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to link vendor user: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
