# 🏪 Lo de Mari — Offline-First Retail POS & ERP

A single-page, zero-dependency, **100% offline-first** Point of Sale (POS) and Enterprise Resource Planning (ERP) application engineered for neighborhood retail, grocery stores, and fast-paced commercial checkouts.

Designed to operate seamlessly on local computers with intermittent or zero internet connectivity, storing all business records locally in high-capacity **IndexedDB** storage with instant zero-latency checkout.

![Status](https://img.shields.io/badge/Status-Live%20in%20Store-success?style=for-the-badge)
![Offline First](https://img.shields.io/badge/Offline-100%25%20Independent-emerald?style=for-the-badge&logo=offline)
![Storage](https://img.shields.io/badge/Engine-IndexedDB-blue?style=for-the-badge&logo=databricks)
![UI](https://img.shields.io/badge/Theme-Luxury%20Teal%20%26%20Gold-df9b28?style=for-the-badge)
[![GitHub stars](https://img.shields.io/github/stars/AgustinMilesi/marierp?style=for-the-badge&logo=github&color=gold)](https://github.com/AgustinMilesi/marierp/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/AgustinMilesi/marierp?style=for-the-badge&logo=github&color=blue)](https://github.com/AgustinMilesi/marierp/network/members)

---

## 🎯 Why Offline-First?

Retail checkouts in neighborhood stores cannot afford downtime caused by Wi-Fi drops, ISP outages, or cloud latency. **Lo de Mari** solves this by bundling all application assets and storage directly on the local machine:

- 🔌 **Zero Cloud Dependency:** Runs 100% offline directly in any browser (`file://` or local server).
- ⚡ **Zero-Latency Checkout:** Barcode search, cart calculations, and receipt generation execute instantly in-memory.
- 💾 **IndexedDB Local Engine:** Overcomes the 5 MB limitation of legacy `localStorage`, storing years of sales history, products, and debtor balances without capacity limits.
- 📦 **Zero-Install Deployment:** Open `ERPmari.html` in Chrome, Edge, or Firefox and start selling immediately.

---

## 🎨 Luxury Teal & Gold Design System

The application features a modern luxury palette inspired by premier financial and retail dashboards:

| Token | Hex | Role |
|---|---|---|
| `--teal-dark` | `#2b413c` | Deep forest teal for sidebar navigation and primary action cards |
| `--gold-accent` | `#df9b28` | Radiant gold for active indicators, totals, and primary CTA buttons |
| `--canvas-bg` | `#dbe6e1` | Soft ambient mint canvas with subtle background glow |
| `--card-container-bg` | `#e6ede9` | Card surfaces with rounded corners and clean contrast |

---

## ✨ Core Modules

### 1. ⚡ Multi-Order Point of Sale (POS)
- Concurrent checkout tabs (`Pedido 1`, `Pedido 2`, `Pedido 3`) allowing cashiers to park an order while serving the next customer.
- Dual item entry: Barcode scanner integration or fast dropdown autocomplete.
- Tender methods: **Efectivo** (Cash), **Transferencia** (Bank Transfer), **Posnet** (Card with automatic 4% fee computation), and **Cuenta Corriente** (Customer credit / fiado).

### 2. ☀️ Shift Management & Blind Cash Drawer Audits
- Live top-bar indicators for current time, date, and shift (`☀️ Mañana` / `🌙 Tarde`).
- Shift closing with cash reconciliation: cash in drawer, electronic payments, and card fees.

### 3. 📦 Atomic Inventory Management
- Dedicated views for general grocery items and produce / fresh produce (Verdulería).
- Instant price updates, stock alerts, and category tagging.

### 4. 👥 Debtor Accounts (Fiados)
- Customer receivables tracking with detailed itemized transaction history.
- Partial and total payments with automatic ledger reconciliation.

### 5. 📊 Sales History & Financial Metrics
- Timeframe filters: Today, Yesterday, This Week, This Month, and Custom Date Ranges.
- Interactive sales accordions and financial balance graphs powered by Chart.js.

### 6. 🔒 Backup & Restore
- Single-click **Guardar** button creates timestamped JSON backups.
- Complete standalone JSON backup export and import for data safety and local recovery.

---

## 📂 Project Structure

```
marierp/
├── ERPmari.html                     # Complete single-page application with luxury UI
├── chart.min.js                     # Local Chart.js library for offline financial charts
├── tailwind.min.js                  # Local Tailwind CSS engine for offline rendering
├── logo.png                         # Store branding asset
└── lo-de-mari-backup-2026-10-15.json # Reference database snapshot
```

---

## 🚀 Getting Started

No `npm install`, build step, or server configuration required:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AgustinMilesi/marierp.git
   cd marierp
   ```

2. **Open the application:**
   Double-click `ERPmari.html` or open it with your favorite browser.

3. **Restore data (Optional):**
   Navigate to **Configuración** > **Importar / Exportar Datos** and load a backup `.json` file to restore your catalog and historical records.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
