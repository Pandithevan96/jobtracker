<?php

namespace App\Models\Billing;

use App\Models\Challan\DeliveryChallan;
use App\Models\Job\JobOrder;
use App\Models\User\User;
use App\Models\Vendor\Vendor;
use App\Models\Workspace\Workspace;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobWorkInvoice extends Model
{
    use HasFactory;

    const PAYMENT_UNPAID = 1;

    const PAYMENT_PARTIAL = 2;

    const PAYMENT_PAID = 3;

    protected $table = 'job_work_invoices';

    protected $fillable = [
        'workspace_id',
        'vendor_id',
        'job_order_id',
        'delivery_challan_id',
        'created_by',
        'invoice_number',
        'invoice_date',
        'due_date',
        'sac_code',
        'taxable_amount',
        'gst_rate',
        'cgst_amount',
        'sgst_amount',
        'igst_amount',
        'total_amount',
        'payment_status',
        'amount_paid',
        'notes',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'due_date' => 'date',
        'taxable_amount' => 'decimal:2',
        'gst_rate' => 'decimal:2',
        'cgst_amount' => 'decimal:2',
        'sgst_amount' => 'decimal:2',
        'igst_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'payment_status' => 'integer',
    ];

    public function workspace()
    {
        return $this->belongsTo(Workspace::class, 'workspace_id');
    }

    public function vendor()
    {
        return $this->belongsTo(Vendor::class, 'vendor_id');
    }

    public function jobOrder()
    {
        return $this->belongsTo(JobOrder::class, 'job_order_id');
    }

    public function deliveryChallan()
    {
        return $this->belongsTo(DeliveryChallan::class, 'delivery_challan_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items()
    {
        return $this->hasMany(JobWorkInvoiceItem::class, 'invoice_id');
    }
}
