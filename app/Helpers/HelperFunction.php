<?php

namespace App\Helpers;

use App\Models\Log\ErrorLog;
use App\Models\User\RolePermission;
use Exception;
use Illuminate\Support\Facades\Auth;

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
     * --------------------------------------------------------------------------------
     * Encrypt Data using AES-256-ECB
     * --------------------------------------------------------------------------------
     * Encrypts the provided data using AES-256-ECB encryption algorithm.
     * The data is first JSON encoded, then encrypted with a SHA-256 hashed key.
     *
     * @param  mixed  $data  The data to be encrypted
     * @param  string  $client_secret  The client secret used for key generation
     * @return string The encrypted data in hexadecimal format
     *
     * @author Development Team
     *
     * @version 1.0.0
     *
     * @since 2025-09-24
     * --------------------------------------------------------------------------------
     */
    public static function encryptData($data, $client_secret)
    {
        try {
            $key = hash('sha256', $client_secret, true);
            $ciphertext = openssl_encrypt(json_encode($data), 'AES-256-ECB', $key, 0, '');

            return bin2hex(base64_decode($ciphertext));
        } catch (Exception $exception) {
            // create error log to database
            ErrorLog::logError(
                $exception->getMessage(),
                'ERROR',
                '002',
                __CLASS__,
                __FUNCTION__,
                $exception->getFile(),
                $exception->getLine(),
                $exception->getTraceAsString(),
                ['data' => $data, 'client_secret' => $client_secret]
            );

            return '';
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Decrypt Data using AES-256-ECB
     * --------------------------------------------------------------------------------
     * Decrypts the provided encrypted data using AES-256-ECB decryption algorithm.
     * First validates the MAC (Message Authentication Code) for data integrity,
     * then decrypts and returns the original data.
     *
     * @param  string  $encryptedData  The encrypted data in hexadecimal format
     * @param  string  $mac  The Message Authentication Code for validation
     * @param  string  $client_secret  The client secret used for key generation
     * @return mixed|null The decrypted data or null if MAC validation fails
     *
     * @author Development Team
     *
     * @version 1.0.0
     *
     * @since 2025-09-24
     * --------------------------------------------------------------------------------
     */
    public static function decryptData($encryptedData, $mac, $client_secret)
    {
        try {
            if ($mac != self::generateMac($encryptedData, $client_secret)) {
                // create error log to database
                ErrorLog::logError(
                    'MAC verification failed',
                    'ERROR',
                    '002',
                    __CLASS__,
                    __FUNCTION__,
                    __FILE__,
                    __LINE__,
                    null,
                    ['encrypted_data' => $encryptedData, 'mac' => $mac, 'client_secret' => $client_secret]
                );

                return null;
            }

            $key = hash('sha256', $client_secret, true);
            $ciphertext = base64_encode(hex2bin($encryptedData));
            $decrypted = openssl_decrypt($ciphertext, 'AES-256-ECB', $key, 0, '');

            return json_decode($decrypted, true);
        } catch (Exception $exception) {
            // create error log to database
            ErrorLog::logError(
                $exception->getMessage(),
                'ERROR',
                '002',
                __CLASS__,
                __FUNCTION__,
                $exception->getFile(),
                $exception->getLine(),
                $exception->getTraceAsString(),
                ['encrypted_data' => $encryptedData, 'mac' => $mac, 'client_secret' => $client_secret]
            );

            return null;
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Generate Message Authentication Code (MAC)
     * --------------------------------------------------------------------------------
     * Generates a SHA-256 hash of the concatenated data and client secret.
     * This MAC is used to verify data integrity during decryption.
     *
     * @param  string  $data  The data to be hashed
     * @param  string  $client_secret  The client secret to append to the data
     * @return string The SHA-256 hash of the concatenated string
     *
     * @author Development Team
     *
     * @version 1.0.0
     *
     * @since 2025-09-24
     * --------------------------------------------------------------------------------
     */
    public static function generateMac($data, $client_secret)
    {
        try {
            return hash('sha256', $data . $client_secret);
        } catch (Exception $exception) {
            // create error log to database
            ErrorLog::logError(
                $exception->getMessage(),
                'ERROR',
                '002',
                __CLASS__,
                __FUNCTION__,
                $exception->getFile(),
                $exception->getLine(),
                $exception->getTraceAsString(),
                ['data' => $data, 'client_secret' => $client_secret]
            );

            return '';
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Standardized API Response
     * --------------------------------------------------------------------------------
     * Creates a standardized JSON response following the application's error code format.
     * Includes data, MAC, status, message, code, and timestamp for consistent API responses.
     *
     * Error codes:
     * 000 - Success
     * 001 - Validation Error
     * 002 - Internal Server Error
     * 003 - Not Found
     * 004 - Bad Request
     * 005 - Unauthorized
     * 041 - Already Verified (Custom Success Code)
     *
     * @param  mixed  $data  The response data (null for errors)
     * @param  string|null  $mac  The Message Authentication Code (for success responses)
     * @param  string  $message  The response message
     * @param  string  $status  The response status ('success' or 'error')
     * @param  string  $code  The application-specific error code
     * @param  int  $http_code  The HTTP status code
     * @return \Illuminate\Http\JsonResponse The standardized JSON response
     *
     * @author Development Team
     *
     * @version 1.0.0
     *
     * @since 2025-09-24
     * --------------------------------------------------------------------------------
     */
    public static function response($data, $mac, $message, $status = 'success', $code = '000', $http_code = 200)
    {
        try {

            $response = [
                'status' => $status,
                'message' => $message,
                'code' => $code,
            ];

            // Only include data and mac for success responses
            if ($status === 'success') {
                $response['data'] = $data;
                $response['mac'] = $mac;
            }

            if ($status === 'error') {
                $response['error'] = $data;
            }

            $response['timestamp'] = now()->toISOString();

            return response()->json($response, $http_code);
        } catch (Exception $exception) {
            // create error log to database
            ErrorLog::logError(
                $exception->getMessage(),
                'ERROR',
                '002',
                __CLASS__,
                __FUNCTION__,
                $exception->getFile(),
                $exception->getLine(),
                $exception->getTraceAsString(),
                ['data' => $data, 'mac' => $mac, 'message' => $message, 'status' => $status, 'code' => $code, 'http_code' => $http_code]
            );

            return response()->json(['status' => 'error', 'message' => $exception->getMessage(), 'code' => '002'], $http_code);
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Role Permission Lookup
     * --------------------------------------------------------------------------------
     * Returns the RolePermission record for the currently authenticated user's role
     * and the given module ID. Used by all controllers to authorise access.
     *
     * Usage in controllers:
     *   $rolePermission = HelperFunction::rolePermission(self::MODULE_ID);
     *   if (!$rolePermission || !$rolePermission->can_access) { ... return 403 ... }
     *
     * @param  int|string  $moduleId  The module ID to check permission for
     * @return \App\Models\User\RolePermission|null
     *
     * @author Development Team
     * @version 1.0.0
     * @since 2026-07-03
     * --------------------------------------------------------------------------------
     */
    public static function rolePermission($moduleId)
    {
        try {
            $role = Auth::user()->role_id;
            $permission = RolePermission::select('can_access', 'can_view', 'can_create', 'can_edit', 'can_delete')
                ->where('role_id', $role)
                ->where('module_id', $moduleId)
                ->first();

            // Return the permission object if found, null if not found
            return $permission;
        } catch (Exception $exception) {
            ErrorLog::logError(
                $exception->getMessage(),
                'ERROR',
                '002',
                __CLASS__,
                __FUNCTION__,
                $exception->getFile(),
                $exception->getLine(),
                $exception->getTraceAsString(),
                []
            );

            return null;
        }
    }
}
