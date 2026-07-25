# JobTrack — Context Constraints (BMAD)

This document outlines the Business, Market, Architecture, and Database constraints governing the **JobTrack** SaaS platform.

---

## 1. Business Constraints (B)
- **Monetization & Subscription Tiers**:
  - **Free**: 1 workspace, maximum 50 Delivery Challans (DCs) per month.
  - **Factory**: ₹1,999/month, limited to 1 principal + 20 vendors.
  - **Industrial**: ₹4,999/month, unlimited usage and advanced analytics.
- **Payment Gateway**: Strictly integrated with **Razorpay** for subscription management, plan upgrades, and recurring billing.
- **Compliance**: All delivery challans and physical handoffs must follow local GST guidelines, specifically conforming to the tracking requirements of **GST Form ITC-04** (Job Work Goods Dispatch and Return).

---

## 2. Market & User Constraints (M)
- **Geography & Target Base**: Tailored specifically for the MSME manufacturing clusters of Tamil Nadu (Ashok Leyland, Titan, TVS ecosystems in Coimbatore, Hosur, and Chennai).
- **Subcontractor Device Profiles**: Subcontractors/vendors operating in small machining workshops usually use low-end Android smartphones. The vendor portal must be an optimized, lightweight Mobile-First Progressive Web App (PWA).
- **Localization**: UI must support the **Tamil language** for vendors to ensure ease of adoption and operation by operators/machinists.
- **Connectivity Fallbacks**: To accommodate vendors with poor network signals or basic feature phones, an automated **WhatsApp bot** must be available for logging status updates.

---

## 3. Architecture & Technical Constraints (A)
- **Framework & Runtime**: Strictly built on **Laravel 13.8** requiring **PHP >= 8.3**.
- **Real-time Event Broadcasting**: Must use **Laravel Reverb** for low-latency WebSocket connection state updates between vendor actions and principal dashboards.
- **Background Jobs**: Heavy operations (generating PDF Delivery Challans, firing delay alerts, dispatching SMS/WhatsApp bot triggers) must be offloaded to **Laravel Horizon** (Redis-backed queues).
- **API Routing & HTTP Methods**:
  - Do **NOT** use `GET` methods for API endpoints. All API routes must strictly use the **`POST`** method (e.g., both data retrieval and actions).
  - Do **NOT** define route parameters like `{id}` (e.g., no `/api/job-orders/{id}`). Lookups must pass the identifier within the `POST` request body payload and be handled entirely inside the Controller (e.g., `$request->input('id')`).
  - **Route Action Syntax**: Use string action format `'Controller@function'` (e.g., `'JobOrderController@store'`) instead of class-array tuple syntax (e.g., do **NOT** use `[JobOrderController::class, 'store']`).
- **Environment**: Must remain fully compatible with local testing inside **Laragon (Windows)**.

---

## 4. Database & Data Constraints (D)
- **Engine**: **MySQL** (database schema: `jobtrack`).
- **Session & Cache Storage**: Configured to use the `database` driver in `.env` to store sessions, requiring structural support for rapid concurrent lock updates.
- **Material Reconciliation**: Records must keep a tight audit trail. Raw input material dispatched to a subcontractor must balance mathematically against finished goods received plus rejects/scrap.
