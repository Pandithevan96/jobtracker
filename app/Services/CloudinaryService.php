<?php

namespace App\Services;

use Cloudinary\Cloudinary;
use Cloudinary\Configuration\Configuration;

class CloudinaryService
{
    protected Cloudinary $cloudinary;

    public function __construct()
    {
        Configuration::instance([
            'cloud' => [
                'cloud_name' => config('cloudinary.cloud_name'),
                'api_key'    => config('cloudinary.api_key'),
                'api_secret' => config('cloudinary.api_secret'),
            ],
            'url' => [
                'secure' => true,
            ],
        ]);

        $this->cloudinary = new Cloudinary();
    }

    /**
     * Upload any file (image or raw document) to Cloudinary.
     * Returns the secure CDN URL or throws on failure.
     */
    public function upload(\Illuminate\Http\UploadedFile $file, string $folder = 'jobtracker'): array
    {
        $ext         = strtolower($file->getClientOriginalExtension());
        $isImage     = in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp']);
        $resourceType = $isImage ? 'image' : 'raw';

        $result = $this->cloudinary->uploadApi()->upload(
            $file->getRealPath(),
            [
                'folder'        => $folder,
                'resource_type' => $resourceType,
                'use_filename'  => true,
                'unique_filename' => true,
                'overwrite'     => false,
            ]
        );

        return [
            'url'  => $result['secure_url'],
            'type' => $isImage ? 'image' : ($ext === 'pdf' ? 'pdf' : 'file'),
        ];
    }
}
