<?php

namespace App\Models\Billing;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobWorkInvoiceItem extends Model
{
    use HasFactory;

    protected $table = 'job_work_invoice_items';

    protected $fillable = [
        'invoice_id',
        'service_description',
        'sac_code',
        'quantity',
        'uom',
        'rate',
        'taxable_amount',
    ];

    protected $casts = [
        'quantity'       => 'decimal:2',
        'rate'           => 'decimal:2',
        'taxable_amount' => 'decimal:2',
    ];

    public function invoice()
    {
        return $this->belongsTo(JobWorkInvoice::class, 'invoice_id');
    }
}
