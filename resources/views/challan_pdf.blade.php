<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Delivery Challan - Rule 55</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 11px;
            color: #222;
            line-height: 1.35;
            margin: 0;
            padding: 0;
        }
        .page {
            padding: 12px 15px;
            page-break-after: always;
            position: relative;
        }
        .page:last-child {
            page-break-after: avoid;
        }
        .copy-tag {
            position: absolute;
            top: 12px;
            right: 15px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            border: 1.5px solid #000;
            padding: 3px 8px;
            background-color: #f8f8f8;
            letter-spacing: 0.5px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #222;
            padding-bottom: 8px;
            margin-bottom: 12px;
        }
        .company-name {
            font-size: 18px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 3px;
        }
        .company-sub {
            font-size: 10px;
            color: #555;
        }
        .title-badge {
            display: inline-block;
            background-color: #222;
            color: #fff;
            padding: 3px 14px;
            font-weight: bold;
            font-size: 13px;
            margin-top: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .meta-table, .addresses-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }
        .addresses-table td {
            width: 50%;
            vertical-align: top;
            border: 1px solid #ccc;
            padding: 8px;
        }
        .section-header {
            font-weight: bold;
            font-size: 10px;
            color: #444;
            text-transform: uppercase;
            margin-bottom: 4px;
            border-bottom: 1px dashed #bbb;
            padding-bottom: 2px;
        }
        .party-name {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 3px;
        }
        .gstin {
            font-family: monospace;
            font-weight: bold;
            color: #000;
            margin-top: 4px;
        }
        .meta-table td {
            border: 1px solid #ccc;
            padding: 5px 8px;
        }
        .meta-label {
            font-weight: bold;
            color: #444;
            width: 18%;
        }
        .meta-value {
            width: 32%;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
        }
        .items-table th {
            background-color: #f2f2f2;
            border: 1px solid #ccc;
            font-weight: bold;
            padding: 6px;
            text-align: left;
            text-transform: uppercase;
            font-size: 10px;
        }
        .items-table td {
            border: 1px solid #ccc;
            padding: 6px;
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
            border: 1px solid #ccc;
            padding: 8px;
            background-color: #fafafa;
            margin-bottom: 20px;
            font-size: 9.5px;
            color: #444;
        }
        .declaration-title {
            font-weight: bold;
            margin-bottom: 3px;
            color: #222;
        }
        .footer-sig-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 30px;
        }
        .footer-sig-table td {
            width: 33.3%;
            text-align: center;
            vertical-align: bottom;
            height: 50px;
        }
        .sig-line {
            border-top: 1px solid #333;
            width: 85%;
            margin: 0 auto;
            padding-top: 4px;
            font-size: 10px;
            color: #444;
        }
    </style>
</head>
<body>

@php
    $copies = [
        'ORIGINAL FOR CONSIGNEE',
        'DUPLICATE FOR TRANSPORTER',
        'TRIPLICATE FOR CONSIGNER'
    ];
@endphp

@foreach($copies as $copyTitle)
    <div class="page">
        <!-- Copy Header Tag -->
        <div class="copy-tag">{{ $copyTitle }}</div>

        <!-- Header -->
        <div class="header">
            @if(!empty($workspace->logo_path) && file_exists(public_path('storage/' . $workspace->logo_path)))
                <div style="margin-bottom: 6px;">
                    <img src="{{ public_path('storage/' . $workspace->logo_path) }}" style="max-height: 50px; max-width: 200px;" />
                </div>
            @elseif(!empty($workspace->logo_path))
                <div style="margin-bottom: 6px;">
                    <img src="{{ $workspace->logo_path }}" style="max-height: 50px; max-width: 200px;" />
                </div>
            @endif
            <div class="company-name">{{ $workspace->name }}</div>
            <div class="company-sub">
                {{ $workspace->address ?? 'Industrial Zone' }}
                @if($workspace->phone) | Phone: {{ $workspace->phone }} @endif
            </div>
            <div class="title-badge">
                @if($challan->type === 1) OUTWARD DELIVERY CHALLAN @else INWARD DELIVERY CHALLAN @endif
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
                <td class="meta-label">Purpose:</td>
                <td class="meta-value"><strong>{{ $challan->purpose_of_movement ?? 'Sent for Job Work' }}</strong></td>
                <td class="meta-label">E-Way Bill No:</td>
                <td class="meta-value">{{ $challan->eway_bill_number ?? '—' }}</td>
            </tr>
            <tr>
                <td class="meta-label">Vehicle No:</td>
                <td class="meta-value">{{ $challan->vehicle_number ?? '—' }}</td>
                <td class="meta-label">Driver / Transporter:</td>
                <td class="meta-value">
                    {{ $challan->driver_name ?? '—' }}
                    @if($challan->transporter_id) (ID: {{ $challan->transporter_id }}) @endif
                </td>
            </tr>
            <tr>
                <td class="meta-label">Job Order Ref:</td>
                <td class="meta-value">#{{ $challan->jobOrder->id }} ({{ $challan->jobOrder->order_number }})</td>
                <td class="meta-label">Ref Outward DC:</td>
                <td class="meta-value">
                    @if($challan->parentChallan)
                        {{ $challan->parentChallan->challan_number }}
                    @elseif($challan->vendor_dc_number)
                        {{ $challan->vendor_dc_number }}
                    @else
                        —
                    @endif
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
                    <th style="width: 7%">Sr.</th>
                    <th>Part Name / Description</th>
                    <th style="width: 14%">Part No.</th>
                    <th style="width: 12%">HSN/SAC</th>
                    <th style="width: 10%; text-align: right;">Qty</th>
                    <th style="width: 8%">UOM</th>
                    <th style="width: 14%; text-align: right;">Approx Rate (Rs.)</th>
                    <th style="width: 15%; text-align: right;">Total Value (Rs.)</th>
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
                        <td>
                            <strong>{{ $item->part_name }}</strong>
                            @if($item->description)<br/><small style="color: #555;">{{ $item->description }}</small>@endif
                        </td>
                        <td>{{ $item->part_number ?? '—' }}</td>
                        <td class="text-center">{{ $item->hsn_code ?? '—' }}</td>
                        <td class="text-right">{{ number_format($item->quantity, 2) }}</td>
                        <td>{{ $item->uom }}</td>
                        <td class="text-right">{{ number_format($item->unit_value ?? 0, 2) }}</td>
                        <td class="text-right">{{ number_format($total, 2) }}</td>
                    </tr>
                @endforeach
                <tr class="total-row">
                    <td colspan="4" class="text-right">Total Quantity & Declared Value:</td>
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
            <div class="declaration-title">Terms & GST Rule 55 Declaration:</div>
            1. This Delivery Challan is issued strictly under **Rule 55 of the CGST Rules, 2017** for movement of goods for job work.<br/>
            2. The movement is under **Section 143 of the CGST Act, 2017**. Goods are to be returned within 1 year (or 3 years for capital goods).<br/>
            3. The value declared above is solely for transit and insurance purposes — **THIS IS NOT A SALES INVOICE**.<br/>
            4. Scrap generated during job work must be accounted for or returned along with the processed components.
        </div>

        <!-- Signatures -->
        <table class="footer-sig-table">
            <tr>
                <td>
                    <div class="sig-line">Prepared By</div>
                </td>
                <td>
                    <div class="sig-line">Driver / Receiver Signature</div>
                </td>
                <td>
                    <div class="sig-line">Authorised Signatory (with Stamp)</div>
                </td>
            </tr>
        </table>
    </div>
@endforeach

</body>
</html>
