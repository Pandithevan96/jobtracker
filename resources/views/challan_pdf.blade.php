<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Delivery Challan</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 12px;
            color: #333;
            line-height: 1.4;
            margin: 0;
            padding: 0;
        }
        .container {
            padding: 10px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .company-name {
            font-size: 20px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 4px;
        }
        .company-sub {
            font-size: 11px;
            color: #666;
        }
        .title-badge {
            display: inline-block;
            background-color: #333;
            color: #fff;
            padding: 4px 15px;
            font-weight: bold;
            font-size: 14px;
            margin-top: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .meta-table, .addresses-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        .addresses-table td {
            width: 50%;
            vertical-align: top;
            border: 1px solid #ddd;
            padding: 10px;
        }
        .section-header {
            font-weight: bold;
            font-size: 11px;
            color: #555;
            text-transform: uppercase;
            margin-bottom: 6px;
            border-bottom: 1px dashed #ccc;
            padding-bottom: 2px;
        }
        .party-name {
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 4px;
        }
        .gstin {
            font-family: monospace;
            font-weight: bold;
            color: #000;
            margin-top: 5px;
        }
        .meta-table td {
            border: 1px solid #ddd;
            padding: 6px 10px;
        }
        .meta-label {
            font-weight: bold;
            color: #555;
            width: 18%;
        }
        .meta-value {
            width: 32%;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .items-table th {
            background-color: #f5f5f5;
            border: 1px solid #ddd;
            font-weight: bold;
            padding: 8px;
            text-align: left;
            text-transform: uppercase;
            font-size: 11px;
        }
        .items-table td {
            border: 1px solid #ddd;
            padding: 8px;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .total-row {
            font-weight: bold;
            background-color: #fafafa;
        }
        .declaration-box {
            border: 1px solid #ddd;
            padding: 10px;
            background-color: #fcfcfc;
            margin-bottom: 25px;
            font-size: 10px;
            color: #555;
        }
        .declaration-title {
            font-weight: bold;
            margin-bottom: 4px;
            color: #333;
        }
        .footer-sig-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 40px;
        }
        .footer-sig-table td {
            width: 33.3%;
            text-align: center;
            vertical-align: bottom;
            height: 60px;
        }
        .sig-line {
            border-top: 1px solid #333;
            width: 80%;
            margin: 0 auto;
            padding-top: 5px;
            font-size: 11px;
            color: #555;
        }
    </style>
</head>
<body>
    <div class="container">
        
        <!-- Header -->
        <div class="header">
            @if(!empty($workspace->logo_path) && file_exists(public_path('storage/' . $workspace->logo_path)))
                <div style="margin-bottom: 8px;">
                    <img src="{{ public_path('storage/' . $workspace->logo_path) }}" style="max-height: 55px; max-width: 220px;" />
                </div>
            @elseif(!empty($workspace->logo_path))
                <div style="margin-bottom: 8px;">
                    <img src="{{ $workspace->logo_path }}" style="max-height: 55px; max-width: 220px;" />
                </div>
            @endif
            <div class="company-name">{{ $workspace->name }}</div>
            <div class="company-sub">
                {{ $workspace->address ?? 'Coimbatore / Hosur MSME Industrial Cluster' }}
                @if($workspace->phone) | Phone: {{ $workspace->phone }} @endif
            </div>
            <div class="title-badge">
                @if($challan->type === 1) Outward Delivery Challan @else Inward Delivery Challan @endif
            </div>
        </div>

        <!-- Meta Details Grid -->
        <table class="meta-table">
            <tr>
                <td class="meta-label">Challan No:</td>
                <td class="meta-value"><strong>{{ $challan->challan_number }}</strong></td>
                <td class="meta-label">Challan Date:</td>
                <td class="meta-value">{{ \Carbon\Carbon::parse($challan->dispatch_date)->format('d-M-Y') }}</td>
            </tr>
            <tr>
                <td class="meta-label">Vehicle No:</td>
                <td class="meta-value">{{ $challan->vehicle_number ?? '—' }}</td>
                <td class="meta-label">Driver Name:</td>
                <td class="meta-value">{{ $challan->driver_name ?? '—' }}</td>
            </tr>
            <tr>
                <td class="meta-label">Job Order Ref:</td>
                <td class="meta-value">#{{ $challan->jobOrder->id }} ({{ $challan->jobOrder->order_number }})</td>
                <td class="meta-label">Est. Return:</td>
                <td class="meta-value">
                    {{ $challan->estimated_delivery ? \Carbon\Carbon::parse($challan->estimated_delivery)->format('d-M-Y') : '—' }}
                </td>
            </tr>
        </table>

        <!-- Addresses -->
        <table class="addresses-table">
            <tr>
                <td>
                    <div class="section-header">Sender (Consigner)</div>
                    <div class="party-name">{{ $workspace->name }}</div>
                    <div>{{ $workspace->address ?? 'Industrial Zone' }}</div>
                    @if($workspace->email)<div>Email: {{ $workspace->email }}</div>@endif
                    <div class="gstin">GSTIN: {{ $workspace->gstin ?? 'Not Declared' }}</div>
                </td>
                <td>
                    <div class="section-header">Receiver (Consignee / Job Worker)</div>
                    <div class="party-name">{{ $challan->vendor->shop_name }}</div>
                    <div>{{ $challan->vendor->address }}</div>
                    <div>Phone: {{ $challan->vendor->phone ?? '—' }}</div>
                    <div class="gstin">GSTIN: {{ $challan->vendor->gstin ?? 'Unregistered' }}</div>
                </td>
            </tr>
        </table>

        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 8%">Sr. No</th>
                    <th>Part Name / Description</th>
                    <th style="width: 15%">Part Number</th>
                    <th style="width: 15%">HSN/SAC</th>
                    <th style="width: 12%; text-align: right;">Qty</th>
                    <th style="width: 10%">UOM</th>
                    <th style="width: 12%; text-align: right;">Rate (Rs.)</th>
                    <th style="width: 15%; text-align: right;">Total (Rs.)</th>
                </tr>
            </thead>
            <tbody>
                @php $grandTotal = 0; @endphp
                @foreach($challan->items as $index => $item)
                    @php 
                        $total = $item->quantity * ($item->unit_value ?? 0);
                        $grandTotal += $total;
                    @endphp
                    <tr>
                        <td class="text-center">{{ $index + 1 }}</td>
                        <td><strong>{{ $item->part_name }}</strong><br/><small style="color: #666;">{{ $item->description }}</small></td>
                        <td>{{ $item->part_number ?? '—' }}</td>
                        <td class="text-center">{{ $item->hsn_code ?? '—' }}</td>
                        <td class="text-right">{{ number_format($item->quantity, 2) }}</td>
                        <td>{{ $item->uom }}</td>
                        <td class="text-right">{{ number_format($item->unit_value ?? 0, 2) }}</td>
                        <td class="text-right">{{ number_format($total, 2) }}</td>
                    </tr>
                @endforeach
                <tr class="total-row">
                    <td colspan="4" class="text-right">Grand Total:</td>
                    <td class="text-right">
                        {{ number_format($challan->items->sum('quantity'), 2) }}
                    </td>
                    <td></td>
                    <td></td>
                    <td class="text-right">Rs. {{ number_format($grandTotal, 2) }}</td>
                </tr>
            </tbody>
        </table>

        <!-- Declaration Box -->
        <div class="declaration-box">
            <div class="declaration-title">Terms & GST Declaration:</div>
            1. This is a Delivery Challan issued under **Rule 55 of the CGST Rules, 2017** for the transportation of goods for job work.<br/>
            2. The movement is under **Section 143 of the CGST Act, 2017**, and the goods are intended to be returned within 1 year of dispatch.<br/>
            3. The value declared above is solely for transport and insurance compliance purposes; this is NOT a commercial sales invoice.<br/>
            4. Scrap generated during job work must be accounted for or returned along with the finished components.
        </div>

        <!-- Signatures -->
        <table class="footer-sig-table">
            <tr>
                <td>
                    <div class="sig-line">Prepared By</div>
                </td>
                <td>
                    <div class="sig-line">Receiver's Signature</div>
                </td>
                <td>
                    <div class="sig-line">Authorised Signatory (with Seal)</div>
                </td>
            </tr>
        </table>

    </div>
</body>
</html>
