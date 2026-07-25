<?php

namespace App\Helpers;

use App\Models\User\RolePermission;
use Throwable;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * --------------------------------------------------------------------------------
 * Helper Function
 * --------------------------------------------------------------------------------
 * This helper function is used to encrypt and decrypt data.
 *
 * @author Development Team
 *
 * @version 1.0.0
 *
 * @since 2025-11-21
 * --------------------------------------------------------------------------------
 */
class HelperFunction
{
    /**
     * Encrypt Data using AES-256-ECB
     */
    public static function encryptData($data, $client_secret)
    {
        try {
            $key = hash('sha256', $client_secret, true);
            $ciphertext = openssl_encrypt(json_encode($data), 'AES-256-ECB', $key, 0, '');

            return bin2hex(base64_decode($ciphertext));
        } catch (Throwable $exception) {
            Log::error($exception->getMessage(), ['data' => $data, 'client_secret' => $client_secret]);
            return '';
        }
    }

    /**
     * Decrypt Data using AES-256-ECB
     */
    public static function decryptData($encryptedData, $mac, $client_secret)
    {
        try {
            if ($mac != self::generateMac($encryptedData, $client_secret)) {
                Log::error('MAC verification failed', ['encrypted_data' => $encryptedData, 'mac' => $mac]);
                return null;
            }

            $key = hash('sha256', $client_secret, true);
            $ciphertext = base64_encode(hex2bin($encryptedData));
            $decrypted = openssl_decrypt($ciphertext, 'AES-256-ECB', $key, 0, '');

            return json_decode($decrypted, true);
        } catch (Throwable $exception) {
            Log::error($exception->getMessage(), ['encrypted_data' => $encryptedData, 'mac' => $mac]);
            return null;
        }
    }

    /**
     * Generate Message Authentication Code (MAC)
     */
    public static function generateMac($data, $client_secret)
    {
        try {
            return hash('sha256', $data . $client_secret);
        } catch (Throwable $exception) {
            Log::error($exception->getMessage(), ['data' => $data]);
            return '';
        }
    }

    /**
     * Standardized API Response
     */
    public static function response($data, $mac, $message, $status = 'success', $code = '000', $http_code = 200)
    {
        try {
            $response = [
                'status'  => $status,
                'message' => $message,
                'code'    => $code,
            ];

            // Only include data and mac for success responses
            if ($status === 'success') {
                $response['data'] = $data;
                $response['mac']  = $mac;
            }

            if ($status === 'error') {
                $response['error'] = $data;
            }

            $response['timestamp'] = now()->toIso8601String();

            return response()->json($response, $http_code);
        } catch (Throwable $exception) {
            Log::error($exception->getMessage());
            return response()->json(['status' => 'error', 'message' => $exception->getMessage(), 'code' => '002'], $http_code);
        }
    }

    /**
     * Role Permission Lookup
     */
    public static function rolePermission($moduleId)
    {
        try {
            $role = Auth::user()->role_id;
            $permission = RolePermission::select('can_access', 'can_view', 'can_create', 'can_edit', 'can_delete')
                ->where('role_id', $role)
                ->where('module_id', $moduleId)
                ->first();

            return $permission;
        } catch (Throwable $exception) {
            Log::error($exception->getMessage());
            return null;
        }
    }
}
