<?php

namespace App\Http\Controllers\Report;

use App\Http\Controllers\Controller;
use App\Helpers\HelperFunction;
use App\Models\Challan\DeliveryChallan;
use App\Models\Workspace\Workspace;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response;

class GstItc04Controller extends Controller
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
     * Generate Form GST ITC-04 dataset for a given period.
     * POST /api/v1/reports/itc04
     */
    public function getReport(Request $request)
    {
        try {
            $validation = Validator::make($request->all(), [
                'workspace_id' => 'required|integer|exists:workspaces,id',
                'from_date'    => 'nullable|date',
                'to_date'      => 'nullable|date|after_or_equal:from_date',
            ]);

            if ($validation->fails()) {
                return HelperFunction::response(null, null, $validation->errors()->first(), 'error', '001', Response::HTTP_BAD_REQUEST);
            }

            $user = Auth::user();
            $workspaceId = (int) $request->input('workspace_id');

            $workspace = $this->resolveWorkspace($workspaceId, $user);
            if (!$workspace) {
                return HelperFunction::response(null, null, 'Workspace access denied', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $fromDate = $request->input('from_date', now()->startOfQuarter()->toDateString());
            $toDate   = $request->input('to_date', now()->endOfQuarter()->toDateString());

            // Table 4: Details of inputs/capital goods sent to job worker
            $table4Outward = DeliveryChallan::with(['vendor', 'items'])
                ->where('workspace_id', $workspaceId)
                ->where('type', DeliveryChallan::TYPE_OUTWARD)
                ->whereBetween('dispatch_date', [$fromDate, $toDate])
                ->get()
                ->flatMap(function ($challan) {
                    return $challan->items->map(function ($item) use ($challan) {
                        return [
                            'table_type'         => 'Table 4 (Outward)',
                            'job_worker_gstin'   => $challan->vendor->gstin ?? 'URP',
                            'job_worker_name'    => $challan->vendor->shop_name,
                            'challan_number'     => $challan->challan_number,
                            'challan_date'       => $challan->dispatch_date ? $challan->dispatch_date->format('Y-m-d') : '',
                            'goods_type'         => 'Inputs',
                            'part_name'          => $item->part_name,
                            'hsn_code'           => $item->hsn_code ?? '9988',
                            'quantity'           => (float) $item->quantity,
                            'uom'                => $item->uom,
                            'taxable_value'      => (float) ($item->quantity * ($item->unit_value ?? 0)),
                            'state_code'         => substr($challan->vendor->gstin ?? '', 0, 2),
                        ];
                    });
                });

            // Table 5: Details of inputs/capital goods received back from job worker
            $table5Inward = DeliveryChallan::with(['vendor', 'items', 'parentChallan'])
                ->where('workspace_id', $workspaceId)
                ->where('type', DeliveryChallan::TYPE_INWARD)
                ->whereBetween('dispatch_date', [$fromDate, $toDate])
                ->get()
                ->flatMap(function ($challan) {
                    return $challan->items->map(function ($item) use ($challan) {
                        return [
                            'table_type'         => 'Table 5 (Inward Return)',
                            'job_worker_gstin'   => $challan->vendor->gstin ?? 'URP',
                            'job_worker_name'    => $challan->vendor->shop_name,
                            'original_dc_number' => $challan->parentChallan ? $challan->parentChallan->challan_number : ($challan->vendor_dc_number ?? '—'),
                            'original_dc_date'   => $challan->parentChallan && $challan->parentChallan->dispatch_date ? $challan->parentChallan->dispatch_date->format('Y-m-d') : '',
                            'inward_dc_number'   => $challan->challan_number,
                            'inward_dc_date'     => $challan->dispatch_date ? $challan->dispatch_date->format('Y-m-d') : '',
                            'part_name'          => $item->part_name,
                            'hsn_code'           => $item->hsn_code ?? '9988',
                            'quantity_received'  => (float) $item->quantity,
                            'uom'                => $item->uom,
                            'taxable_value'      => (float) ($item->quantity * ($item->unit_value ?? 0)),
                            'loss_scrap_qty'     => 0.00,
                        ];
                    });
                });

            return HelperFunction::response([
                'workspace_gstin' => $workspace->gstin ?? 'Not Declared',
                'from_date'       => $fromDate,
                'to_date'         => $toDate,
                'table_4_outward' => $table4Outward,
                'table_5_inward'  => $table5Inward,
                'summary'         => [
                    'total_outward_dcs'   => $table4Outward->count(),
                    'total_inward_dcs'    => $table5Inward->count(),
                    'total_outward_val'   => $table4Outward->sum('taxable_value'),
                    'total_inward_val'    => $table5Inward->sum('taxable_value'),
                ]
            ], null, 'Form GST ITC-04 report generated successfully', 'success', '000', Response::HTTP_OK);

        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to generate ITC-04 report: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Export Form GST ITC-04 report as CSV.
     * POST /api/v1/reports/itc04/export-csv
     */
    public function exportCsv(Request $request)
    {
        try {
            $user = Auth::user();
            $workspaceId = (int) $request->input('workspace_id');

            $workspace = $this->resolveWorkspace($workspaceId, $user);
            if (!$workspace) {
                return HelperFunction::response(null, null, 'Workspace access denied', 'error', '005', Response::HTTP_FORBIDDEN);
            }

            $fromDate = $request->input('from_date', now()->startOfQuarter()->toDateString());
            $toDate   = $request->input('to_date', now()->endOfQuarter()->toDateString());

            $outward = DeliveryChallan::with(['vendor', 'items'])
                ->where('workspace_id', $workspaceId)
                ->where('type', DeliveryChallan::TYPE_OUTWARD)
                ->whereBetween('dispatch_date', [$fromDate, $toDate])
                ->get();

            $csvLines = [];
            $csvLines[] = "Table,Job Worker GSTIN,Job Worker Name,Challan No,Challan Date,Part Name,HSN,Quantity,UOM,Taxable Value (Rs)";

            foreach ($outward as $ch) {
                foreach ($ch->items as $it) {
                    $val = $it->quantity * ($it->unit_value ?? 0);
                    $csvLines[] = sprintf(
                        '"Table 4","%s","%s","%s","%s","%s","%s",%.2f,"%s",%.2f',
                        $ch->vendor->gstin ?? 'URP',
                        $ch->vendor->shop_name,
                        $ch->challan_number,
                        $ch->dispatch_date ? $ch->dispatch_date->format('Y-m-d') : '',
                        $it->part_name,
                        $it->hsn_code ?? '9988',
                        $it->quantity,
                        $it->uom,
                        $val
                    );
                }
            }

            $csvContent = implode("\n", $csvLines);
            $base64Csv = base64_encode($csvContent);

            return HelperFunction::response([
                'file_name'  => 'Form_GST_ITC04_' . $fromDate . '_to_' . $toDate . '.csv',
                'base64_csv' => 'data:text/csv;base64,' . $base64Csv,
            ], null, 'ITC-04 CSV exported successfully', 'success', '000', Response::HTTP_OK);

        } catch (Exception $e) {
            return HelperFunction::response(null, null, 'Failed to export ITC-04 CSV: ' . $e->getMessage(), 'error', '002', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
