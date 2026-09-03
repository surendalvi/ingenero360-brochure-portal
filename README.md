# ingeneroX360AI Suite - Marketing Brochure & Demos Portal

A web application designed for marketing teams to access, search, preview, download, and upload product brochures, as well as manage live interactive dashboard & demo video links for **ingeneroX360AI Suite**.

![ingeneroX360AI Logo](static/logo.png)

---

## 🌟 Top-Level Tabs & Demo Hub

1. **📂 Product Brochures Tab**:
   - Access all product brochures (PDF & PPTX).
   - Search, category filter, preview, download individually or mass download as ZIP.
2. **🚀 Demos & Video Portals Tab**:
   - **Furnace Dashboard Demo**: [https://furnace.ingenero360.ai/](https://furnace.ingenero360.ai/)
   - **Ingenero360 Demo Videos**: [https://demos.ingenero360.ai/public/](https://demos.ingenero360.ai/public/)
   - **In-Portal Link Management**: Admins and users can add, edit, or remove demo links directly through the portal UI.
   - **GitHub Auto-Backup**: All demo links are persisted in `demos.json` and automatically staged, committed, and pushed to your GitHub repository whenever changes occur!

---

## 🔑 Admin Access & Management

- **Admin Login Button**: Click **"Admin Access"** in the top navigation bar.
- **Default Admin Password**: `ingenero360` (Configurable via `ADMIN_PASSWORD` environment variable).
- **Admin Capabilities**:
  - **Upload & Modify Brochures**: Upload new brochures, edit titles, rename files.
  - **Delete Brochures**: Permanently remove brochures with 1-click confirmation.
  - **Manage Demo Links**: Add, edit, and delete live demo dashboard and video links.
  - **GitHub Auto-Sync**: All actions are automatically synced to your GitHub repository.

---

## 📁 Repository Folder Structure

```
├── brochures/                  # All PDF and PPT/PPTX brochure files
│   ├── CDUX360_R0 2.pdf
│   ├── CokerX360_One_Pager R3.pdf
│   ├── EnergyX360 Brochure (1).pdf
│   ├── OutlierX360_One-Pager 1 1.pdf
│   ├── ReliabilityX360_One_Pager_Rev0.pptx
│   ├── VDUX360_R0 1.pdf
│   ├── controllerX360_details.pdf
│   ├── furnaceX360_One_Pager 5.pptx
│   ├── genX360_Brochure.pdf
│   ├── maintenanceX360_One-Page_Brochure.pdf
│   └── outlierX360_Final.pdf
├── demos.json                  # Persistent demo links store (auto-synced to GitHub)
├── static/                     # Static assets (CSS, JS, Images, Favicon)
│   ├── css/style.css
│   ├── js/app.js
│   ├── thumbnails/             # Auto-generated PDF preview thumbnails
│   ├── logo.png                # ingeneroX360AI brand logo
│   └── favicon.png             # Browser address bar icon
├── templates/
│   └── index.html              # Main Portal UI with Brochures & Demos tabs
├── app.py                      # Flask backend app & dynamic scanner
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Production container definition
├── docker-compose.yml          # Docker Compose configuration
├── nginx.conf                  # Nginx SSL reverse proxy config for ingenero360.ai
├── ingenero360_portal.service  # Systemd daemon config
├── DEPLOYMENT.md               # Step-by-step production deployment guide
├── .gitignore                  # Git ignore file
└── README.md
```

---

## 🚀 Local Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/ingenero360-brochure-portal.git
   cd ingenero360-brochure-portal
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Flask application:**
   ```bash
   python app.py
   ```

4. **Access the web portal:**
   Open your browser at `http://localhost:5000`.
