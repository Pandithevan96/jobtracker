<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Helpers\HelperFunction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use App\Models\User\User;

class AuthController extends Controller
{
    /**
     * Register a new user.
     * POST /api/auth/register
     */
    public function register(Request $request)
    {
        try {
            $validation = Validator::make($request->all(), [
                'name'     => 'required|string|max:255',
                'email'    => 'required|string|email|unique:users,email',
                'phone'    => 'nullable|string|max:20',
                'gender'   => 'nullable|integer|in:1,2,3',   // 1-Male, 2-Female, 3-Other
                'password' => 'required|string|min:8',
                'role_id'  => 'nullable|integer|in:1,2,3',   // 1-Admin, 2-Principal, 3-Vendor
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(
                    null,
                    null,
                    $validation->errors()->first(),
                    'error',
                    '001',
                    Response::HTTP_BAD_REQUEST
                );
            }

            $data = $validation->validated();

            $result = DB::transaction(function () use ($data) {
                $user = User::create([
                    'name'     => $data['name'],
                    'email'    => $data['email'],
                    'phone'    => $data['phone'] ?? null,
                    'gender'   => $data['gender'] ?? null,
                    'password' => $data['password'],
                    'role_id'  => $data['role_id'] ?? User::ROLE_PRINCIPAL,
                    'status'   => User::STATUS_PASSWORD_UNCHANGED,
                ]);

                $token = $user->createToken('auth_token')->plainTextToken;

                return [
                    'user'         => $user->toArray(),
                    'access_token' => $token,
                ];
            });

            return response(json_encode([
                'status'    => 'success',
                'message'   => 'User registered successfully',
                'code'      => '000',
                'data'      => $result,
                'mac'       => null,
                'timestamp' => now()->toIso8601String(),
            ]), 201)->header('Content-Type', 'application/json');
        } catch (\Throwable $e) {
            return response($e->getMessage(), 500)->header('Content-Type', 'text/plain');
        }
    }

    /**
     * Login an existing user.
     * POST /api/auth/login
     */
    public function login(Request $request)
    {
        try {
            $validation = Validator::make($request->all(), [
                'email'    => 'required|string|email',
                'password' => 'required|string',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(
                    null,
                    null,
                    $validation->errors()->first(),
                    'error',
                    '001',
                    Response::HTTP_BAD_REQUEST
                );
            }

            $user = User::where('email', $request->input('email'))->first();

            if (!$user || !Hash::check($request->input('password'), $user->password)) {
                return HelperFunction::response(
                    null,
                    null,
                    'Invalid email or password.',
                    'error',
                    '002',
                    Response::HTTP_UNAUTHORIZED
                );
            }

            if ($user->isSuspended()) {
                return HelperFunction::response(
                    null,
                    null,
                    'Your account has been suspended. Please contact support.',
                    'error',
                    '003',
                    Response::HTTP_FORBIDDEN
                );
            }

            if ($user->isDeleted()) {
                return HelperFunction::response(
                    null,
                    null,
                    'Account not found.',
                    'error',
                    '004',
                    Response::HTTP_UNAUTHORIZED
                );
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'status'    => 'success',
                'message'   => 'Login successful',
                'code'      => '000',
                'data'      => [
                    'user'                     => $user->toArray(),
                    'access_token'             => $token,
                    'password_change_required' => $user->isPasswordUnchanged(),
                ],
                'mac'       => null,
                'timestamp' => now()->toIso8601String(),
            ], 200);
        } catch (\Throwable $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
                'file'    => $e->getFile() . ':' . $e->getLine(),
                'code'    => '500',
            ], 500);
        }
    }

    /**
     * Logout the authenticated user (revoke token).
     * POST /api/auth/logout
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return HelperFunction::response(
            null,
            null,
            'Logged out successfully',
            'success',
            '000',
            Response::HTTP_OK
        );
    }

    /**
     * Get the authenticated user profile.
     * POST /api/auth/me
     */
    public function me(Request $request)
    {
        return HelperFunction::response(
            $request->user(),
            null,
            'User profile fetched',
            'success',
            '000',
            Response::HTTP_OK
        );
    }

    /**
     * Change the authenticated user's password.
     * POST /api/auth/change-password
     */
    public function changePassword(Request $request)
    {
        $validation = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:8|different:current_password',
        ]);

        if ($validation->fails()) {
            return HelperFunction::response(
                null,
                null,
                $validation->errors()->first(),
                'error',
                '001',
                Response::HTTP_BAD_REQUEST
            );
        }

        $user = $request->user();

        if (!Hash::check($request->input('current_password'), $user->password)) {
            return HelperFunction::response(
                null,
                null,
                'Current password is incorrect.',
                'error',
                '005',
                Response::HTTP_BAD_REQUEST
            );
        }

        $user->update([
            'password' => $request->input('new_password'),
            'status'   => User::STATUS_ACTIVE,
        ]);

        return HelperFunction::response(
            null,
            null,
            'Password changed successfully',
            'success',
            '000',
            Response::HTTP_OK
        );
    }
}
