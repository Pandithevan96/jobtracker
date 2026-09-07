<?php

namespace App\Http\Controllers\Billing;

use App\Http\Controllers\Controller;
use App\Helpers\HelperFunction;
use App\Models\Billing\JobWorkInvoice;
use App\Models\Billing\JobWorkInvoiceItem;
use App\Models\Challan\DeliveryChallan;
use App\Models\Job\JobOrder;
use App\Models\Vendor\Vendor;
use App\Models\Workspace\Workspace;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response;

class JobWorkInvoiceController extends Controller
{
    private function resolveWorkspace(int $workspaceId, $user): ?Workspace
    {
        return Workspace::where('id', $workspaceId)
            ->where(function ($q) use ($user) {
                $q->where('owner_id', $user->id)
                  ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
            })
            ->first();
    }

    /**
     * Create a new Vendor Job Work Tax Invoice.
     * POST /api/v1/invoices/create
     */
    public function store(Request $request)
    {
        try {
            $validation = Validator::make($request->all(), [
                'workspace_id'        => 'required|integer|exists:workspaces,id',
                'vendor_id'           => 'required|integer|exists:vendors,id',
                'job_order_id'        => 'nullable|integer|exists:job_orders,id',
                'delivery_challan_id' => 'nullable|integer|exists:delivery_challans,id',
                'invoice_number'      => 'required|string|max:50',
                'invoice_date'        => 'required|date',
                'due_date'            => 'nullable|date|after_or_equal:invoice_date',
                'sac_code'            => 'nullable|string|max:20',
                'gst_rate'            => 'nullable|numeric|min:0|max:28',
                'items'               => 'required|array|min:1',
                'items.*.service_description' => 'required|string|max:255',
                'items.*.sac_code'    => 'nullable|string|max:20',
                'items.*.quantity'    => 'required|numeric|min:0.01',
                'items.*.uom'         => 'nullable|string|max:20',
                'items.*.rate'        => 'required|numeric|min:0',
                'notes'               => 'nullable|string',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $workspaceId = $request->input('workspace_id');

            $workspace = $this->resolveWorkspace($workspaceId, $user);
            if (!$workspace) {
                return HelperFunction::response(null, null, 'Workspace not found or access denied', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $vendor = Vendor::where('id', $request->input('vendor_id'))
                ->where('workspace_id', $workspaceId)
                ->first();

            if (!$vendor) {
                return HelperFunction::response(null, null, 'Vendor not found in workspace', 'error', '003', Response::HTTP_NOT_FOUND);
            }

            DB::beginTransaction();

            $gstRate = (float) $request->input('gst_rate', 12.00); // Default 12% for job work SAC 9988
            $taxableTotal = 0;

            foreach ($request->input('items') as $item) {
                $qty = (float) $item['quantity'];
                $rate = (float) $item['rate'];
                $taxableTotal += ($qty * $rate);
            }

            // Calculate GST splits (assumes intra-state CGST+SGST = 50% each)
            $gstAmount = ($taxableTotal * $gstRate) / 100;
            $cgst = $gstAmount / 2;
            $sgst = $gstAmount / 2;
            $igst = 0.00;
            $totalAmount = $taxableTotal + $gstAmount;

            $invoice = JobWorkInvoice::create([
                'workspace_id'        => $workspaceId,
                'vendor_id'           => $vendor->id,
                'job_order_id'        => $request->input('job_order_id'),
                'delivery_challan_id' => $request->input('delivery_challan_id'),
                'created_by'          => $user->id,
                'invoice_number'      => $request->input('invoice_number'),
                'invoice_date'        => $request->input('invoice_date'),
                'due_date'            => $request->input('due_date'),
                'sac_code'            => $request->input('sac_code', '9988'),
                'taxable_amount'      => $taxableTotal,
                'gst_rate'            => $gstRate,
                'cgst_amount'         => $cgst,
                'sgst_amount'         => $sgst,
                'igst_amount'         => $igst,
                'total_amount'        => $totalAmount,
                'payment_status'      => JobWorkInvoice::PAYMENT_UNPAID,
                'amount_paid'         => 0.00,
                'notes'               => $request->input('notes'),
            ]);

            foreach ($request->input('items') as $item) {
                $qty = (float) $item['quantity'];
                $rate = (float) $item['rate'];
                $taxable = $qty * $rate;

                JobWorkInvoiceItem::create([
                    'invoice_id'          => $invoice->id,
                    'service_description' => $item['service_description'],
                    'sac_code'            => $item['sac_code'] ?? $request->input('sac_code', '9988'),
                    'quantity'            => $qty,
                    'uom'                 => $item['uom'] ?? 'Nos',
                    'rate'                => $rate,
                    'taxable_amount'      => $taxable,
                ]);
            }

            DB::commit();

            $invoice->load('items', 'vendor', 'jobOrder', 'deliveryChallan');

            return HelperFunction::response($invoice, null, 'Job work invoice created successfully', 'success', '000', Response::HTTP_CREATED);

        } catch (Exception $e) {
            DB::rollBack();
            return HelperFunction::response(null, null, 'Failed to create job work invoice: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * List Job Work Invoices in a workspace.
     * POST /api/v1/invoices/list
     */
    public function list(Request $request)
    {
        try {
            $user = Auth::user();
            $workspaceId = $request->input('workspace_id');

            $workspace = null;
            if ($workspaceId) {
                $workspace = $this->resolveWorkspace((int)$workspaceId, $user);
            }

            if (!$workspace) {
                $workspace = Workspace::where(function ($q) use ($user) {
                    $q->where('owner_id', $user->id)
                      ->orWhereHas('members', fn($m) => $m->where('users.id', $user->id));
                })->first();
            }

            if (!$workspace) {
                return HelperFunction::response([], null, 'Invoices fetched successfully', 'success', '000', Response::HTTP_OK);
            }

            $query = JobWorkInvoice::with(['vendor', 'jobOrder', 'deliveryChallan', 'creator'])
                ->where('workspace_id', $workspace->id);

            if ($request->filled('vendor_id')) {
                $query->where('vendor_id', $request->input('vendor_id'));
            }
            if ($request->filled('payment_status')) {
                $query->where('payment_status', $request->input('payment_status'));
            }

            $invoices = $query->orderBy('invoice_date', 'desc')->get();

            return HelperFunction::response($invoices, null, 'Job work invoices fetched successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to list invoices: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get details of a single invoice.
     * POST /api/v1/invoices/details
     */
    public function details(Request $request)
    {
        try {
            $validation = Validator::make($request->all(), [
                'id' => 'required|integer|exists:job_work_invoices,id',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $invoice = JobWorkInvoice::with(['items', 'vendor', 'jobOrder', 'deliveryChallan', 'creator'])
                ->find($request->input('id'));

            $workspace = $this->resolveWorkspace($invoice->workspace_id, $user);
            if (!$workspace) {
                return HelperFunction::response(null, null, 'Access denied to this invoice', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            return HelperFunction::response($invoice, null, 'Invoice details fetched successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to fetch invoice details: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Update payment status of an invoice.
     * POST /api/v1/invoices/update-status
     */
    public function updateStatus(Request $request)
    {
        try {
            $validation = Validator::make($request->all(), [
                'id'             => 'required|integer|exists:job_work_invoices,id',
                'payment_status' => 'required|integer|in:1,2,3', // 1-Unpaid, 2-Partially Paid, 3-Paid
                'amount_paid'    => 'nullable|numeric|min:0',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $invoice = JobWorkInvoice::find($request->input('id'));

            $workspace = $this->resolveWorkspace($invoice->workspace_id, $user);
            if (!$workspace) {
                return HelperFunction::response(null, null, 'Access denied', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $paymentStatus = (int) $request->input('payment_status');
            $amountPaid = (float) $request->input('amount_paid', $invoice->amount_paid);

            if ($paymentStatus === JobWorkInvoice::PAYMENT_PAID && $amountPaid == 0) {
                $amountPaid = $invoice->total_amount;
            }

            $invoice->update([
                'payment_status' => $paymentStatus,
                'amount_paid'    => $amountPaid,
            ]);

            return HelperFunction::response($invoice->fresh(), null, 'Invoice payment status updated successfully', 'success', '000', Response::HTTP_OK);
        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to update invoice status: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
