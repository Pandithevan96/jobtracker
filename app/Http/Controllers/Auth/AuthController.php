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
use Carbon\Carbon;

class AuthController extends Controller
{
    /**
     * Register a new user.
     * POST /api/auth/register
     */
    public function register(Request $request)
    {
        try {
            // Ensure JSON body is merged for php artisan serve / CLI environments
            if ($request->isJson() && empty($request->all())) {
                $request->merge((array) $request->json()->all());
            }

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
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
                'code'    => '500',
            ], 500);
        }
    }

    /**
     * Login an existing user.
     * POST /api/auth/login
     */
    public function login(Request $request)
    {
        try {
            // Ensure JSON body is merged for php artisan serve / CLI environments
            if ($request->isJson() && empty($request->all())) {
                $request->merge((array) $request->json()->all());
            }

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
            'current_password'  => 'required|string',
            'new_password'      => 'required|string|min:8|different:current_password',
            'confirm_password'  => 'required|string|same:new_password',
        ], [
            'new_password.min'              => 'New password must be at least 8 characters.',
            'new_password.different'        => 'New password must be different from your current password.',
            'confirm_password.same'         => 'Passwords do not match.',
        ]);

        if ($validation->fails()) {
            return HelperFunction::response(
                null, null,
                $validation->errors()->first(),
                'error', '001', Response::HTTP_BAD_REQUEST
            );
        }

        $user = $request->user();

        if (!Hash::check($request->input('current_password'), $user->password)) {
            return HelperFunction::response(
                null, null,
                'Current password is incorrect.',
                'error', '005', Response::HTTP_BAD_REQUEST
            );
        }

        $user->update([
            'password' => Hash::make($request->input('new_password')),
            'status'   => User::STATUS_ACTIVE,
        ]);

        return HelperFunction::response(
            null, null,
            'Password changed successfully.',
            'success', '000', Response::HTTP_OK
        );
    }

    /**
     * Request a password reset OTP (forgot password).
     * POST /api/auth/forgot-password
     */
    public function forgotPassword(Request $request)
    {
        try {
            $validation = Validator::make($request->all(), [
                'email' => 'required|email',
            ], [
                'email.required' => 'Email address is required.',
                'email.email'    => 'Please enter a valid email address.',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(
                    null, null,
                    $validation->errors()->first(),
                    'error', '001', Response::HTTP_BAD_REQUEST
                );
            }

            $email = strtolower(trim($request->input('email')));
            $user  = User::where('email', $email)->first();

            if (!$user) {
                // Return success anyway to prevent email enumeration
                return HelperFunction::response(
                    null, null,
                    'If this email is registered, a reset code has been generated.',
                    'success', '000', Response::HTTP_OK
                );
            }

            // Invalidate any previous tokens for this email
            DB::table('password_reset_tokens')
                ->where('email', $email)
                ->update(['used' => true]);

            // Generate a 6-digit OTP
            $otp = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);

            DB::table('password_reset_tokens')->insert([
                'email'      => $email,
                'token'      => $otp,
                'expires_at' => Carbon::now()->addMinutes(15),
                'used'       => false,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);

            // In a real system, this OTP would be sent via SMS/Email/WhatsApp.
            // For now, we return it in the response for development/demo purposes.
            return HelperFunction::response(
                ['otp' => $otp, 'expires_in_minutes' => 15],
                null,
                'Reset code generated successfully. In production, this would be sent via SMS/Email.',
                'success', '000', Response::HTTP_OK
            );
        } catch (\Throwable $e) {
            return HelperFunction::response(
                null, null,
                'Failed to process request: ' . $e->getMessage(),
                'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Verify OTP without resetting (optional pre-check step).
     * POST /api/auth/verify-otp
     */
    public function verifyOtp(Request $request)
    {
        $validation = Validator::make($request->all(), [
            'email' => 'required|email',
            'otp'   => 'required|string|size:6',
        ], [
            'otp.size' => 'Reset code must be exactly 6 digits.',
        ]);

        if ($validation->fails()) {
            return HelperFunction::response(
                null, null,
                $validation->errors()->first(),
                'error', '001', Response::HTTP_BAD_REQUEST
            );
        }

        $email = strtolower(trim($request->input('email')));
        $otp   = $request->input('otp');

        $record = DB::table('password_reset_tokens')
            ->where('email', $email)
            ->where('token', $otp)
            ->where('used', false)
            ->where('expires_at', '>', Carbon::now())
            ->first();

        if (!$record) {
            return HelperFunction::response(
                null, null,
                'Invalid or expired reset code. Please request a new one.',
                'error', '003', Response::HTTP_BAD_REQUEST
            );
        }

        return HelperFunction::response(
            null, null,
            'Code verified successfully.',
            'success', '000', Response::HTTP_OK
        );
    }

    /**
     * Reset the password using an OTP.
     * POST /api/auth/reset-password
     */
    public function resetPassword(Request $request)
    {
        try {
            $validation = Validator::make($request->all(), [
                'email'            => 'required|email',
                'otp'              => 'required|string|size:6',
                'new_password'     => 'required|string|min:8',
                'confirm_password' => 'required|string|same:new_password',
            ], [
                'otp.size'                  => 'Reset code must be exactly 6 digits.',
                'new_password.min'          => 'New password must be at least 8 characters.',
                'confirm_password.same'     => 'Passwords do not match.',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(
                    null, null,
                    $validation->errors()->first(),
                    'error', '001', Response::HTTP_BAD_REQUEST
                );
            }

            $email = strtolower(trim($request->input('email')));
            $otp   = $request->input('otp');

            $record = DB::table('password_reset_tokens')
                ->where('email', $email)
                ->where('token', $otp)
                ->where('used', false)
                ->where('expires_at', '>', Carbon::now())
                ->first();

            if (!$record) {
                return HelperFunction::response(
                    null, null,
                    'Invalid or expired reset code. Please request a new one.',
                    'error', '003', Response::HTTP_BAD_REQUEST
                );
            }

            $user = User::where('email', $email)->first();
            if (!$user) {
                return HelperFunction::response(
                    null, null,
                    'Account not found.',
                    'error', '004', Response::HTTP_NOT_FOUND
                );
            }

            // Mark OTP as used
            DB::table('password_reset_tokens')
                ->where('id', $record->id)
                ->update(['used' => true, 'updated_at' => Carbon::now()]);

            // Update user password
            $user->update([
                'password' => Hash::make($request->input('new_password')),
                'status'   => User::STATUS_ACTIVE,
            ]);

            return HelperFunction::response(
                null, null,
                'Password reset successfully. You can now sign in with your new password.',
                'success', '000', Response::HTTP_OK
            );
        } catch (\Throwable $e) {
            return HelperFunction::response(
                null, null,
                'Failed to reset password: ' . $e->getMessage(),
                'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR
            );
        }
    }
}

