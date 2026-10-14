/**
 * IngeneroX360AI Suite Brochure & Demos Portal JavaScript App
 * Supports both Flask Server API and GitHub Pages Static Hosting via brochures.json & demos.json
 * Features GitHub REST API direct auto-sync for instant worldwide visitor updates
 */

document.addEventListener('DOMContentLoaded', () => {
    const GITHUB_OWNER = 'surendalvi';
    const GITHUB_REPO = 'ingenero360-brochure-portal';

    const INDUSTRY_CATEGORIES = [
        'Ammonia and Methanol',
        'Diagnostic and Agentic AI Tools',
        'Gas',
        'Maintenance and Reliability',
        'Olefin',
        'Polymer',
        'Refinery',
        'Utility'
    ];

    const LOCAL_RENAMES_KEY = 'ingenero_custom_titles';
    const LOCAL_UPLOADS_KEY = 'ingenero_custom_uploads';
    const LOCAL_DELETIONS_KEY = 'ingenero_custom_deletions';
    const GITHUB_PAT_KEY = 'ingenero_github_pat';

    function getGitHubPAT() {
        return localStorage.getItem(GITHUB_PAT_KEY) || '';
    }

    function saveGitHubPAT(token) {
        localStorage.setItem(GITHUB_PAT_KEY, token.trim());
    }

    function fileToBase64(fileOrBlob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result;
                const base64 = dataUrl.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
            reader.readAsDataURL(fileOrBlob);
        });
    }

    async function syncFileToGitHub(repoPath, base64Content, commitMsg) {
        const pat = getGitHubPAT();
        if (!pat) return false;

        const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${repoPath}`;
        
        let sha = null;
        try {
            const getRes = await fetch(url, {
                headers: { 'Authorization': `token ${pat}` }
            });
            if (getRes.ok) {
                const fileInfo = await getRes.json();
                sha = fileInfo.sha;
            }
        } catch(e) {}

        const payload = {
            message: commitMsg,
            content: base64Content
        };
        if (sha) payload.sha = sha;

        try {
            const putRes = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${pat}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            return putRes.ok;
        } catch(e) {
            console.error('GitHub API upload error:', e);
            return false;
        }
    }

    async function deleteFileFromGitHub(repoPath, commitMsg) {
        const pat = getGitHubPAT();
        if (!pat) return false;

        const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${repoPath}`;
        let sha = null;
        try {
            const getRes = await fetch(url, {
                headers: { 'Authorization': `token ${pat}` }
            });
            if (getRes.ok) {
                const fileInfo = await getRes.json();
                sha = fileInfo.sha;
            }
        } catch(e) {}

        if (!sha) return false;

        try {
            const delRes = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `token ${pat}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: commitMsg, sha: sha })
            });
            return delRes.ok;
        } catch(e) {
            console.error('GitHub API delete error:', e);
            return false;
        }
    }

    async function syncCatalogToGitHub() {
        const pat = getGitHubPAT();
        if (!pat) return false;
        const catalogJson = JSON.stringify(brochures, null, 2);
        const catalogBase64 = btoa(unescape(encodeURIComponent(catalogJson)));
        return await syncFileToGitHub('brochures.json', catalogBase64, 'Update brochures.json catalog');
    }

    function getSavedCustomTitles() {
        try {
            return JSON.parse(localStorage.getItem(LOCAL_RENAMES_KEY)) || {};
        } catch(e) {
            return {};
        }
    }

    function saveCustomTitle(filename, newTitle) {
        const titles = getSavedCustomTitles();
        titles[filename] = newTitle;
        localStorage.setItem(LOCAL_RENAMES_KEY, JSON.stringify(titles));
    }

    function getSavedCustomUploads() {
        try {
            return JSON.parse(localStorage.getItem(LOCAL_UPLOADS_KEY)) || [];
        } catch(e) {
            return [];
        }
    }

    function saveCustomUpload(brochureObj) {
        const uploads = getSavedCustomUploads();
        const filtered = uploads.filter(u => u.filename !== brochureObj.filename);
        filtered.unshift(brochureObj);
        try {
            localStorage.setItem(LOCAL_UPLOADS_KEY, JSON.stringify(filtered));
        } catch(e) {
            console.warn('LocalStorage limit for upload data, saved metadata.');
        }
    }

    function getSavedCustomDeletions() {
        try {
            return JSON.parse(localStorage.getItem(LOCAL_DELETIONS_KEY)) || [];
        } catch(e) {
            return [];
        }
    }

    function saveCustomDeletion(filename) {
        const deletions = getSavedCustomDeletions();
        if (!deletions.includes(filename)) {
            deletions.push(filename);
            localStorage.setItem(LOCAL_DELETIONS_KEY, JSON.stringify(deletions));
        }
        const uploads = getSavedCustomUploads().filter(u => u.filename !== filename);
        localStorage.setItem(LOCAL_UPLOADS_KEY, JSON.stringify(uploads));
    }

    function mergeSavedCustomUploads(list) {
        const savedUploads = getSavedCustomUploads();
        savedUploads.forEach(upload => {
            const existingIdx = list.findIndex(b => b.filename === upload.filename);
            if (existingIdx >= 0) {
                list[existingIdx] = upload;
            } else {
                list.unshift(upload);
            }
        });
    }

    function filterOutSavedDeletions(list) {
        const deletions = getSavedCustomDeletions();
        return list.filter(b => !deletions.includes(b.filename));
    }

    function getFileCategory(nameString) {
        if (!nameString) return 'Other Products';
        const strUpper = nameString.toUpperCase();
        for (const cat of INDUSTRY_CATEGORIES) {
            if (strUpper.includes(cat.toUpperCase())) {
                return cat;
            }
        }
        const match = nameString.match(/([a-zA-Z0-9]+[xX]360)/i);
        if (match) {
            return match[1];
        }
        return 'Other Products';
    }

    function formatFileSize(sizeInBytes) {
        if (!sizeInBytes) return '0 B';
        if (sizeInBytes < 1024) return sizeInBytes + ' B';
        if (sizeInBytes < 1024 * 1024) return (sizeInBytes / 1024).toFixed(1) + ' KB';
        return (sizeInBytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    async function generateClientPdfThumbnail(fileOrBlob) {
        if (typeof pdfjsLib === 'undefined' || !fileOrBlob) return null;
        try {
            const arrayBuffer = await fileOrBlob.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            if (!pdf || pdf.numPages < 1) return null;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            return canvas.toDataURL('image/png');
        } catch(e) {
            console.error('PDF.js thumbnail generation error:', e);
            return null;
        }
    }

    // Static fallback data with cover page thumbnails for GitHub Pages hosting
    const staticBrochuresFallback = [
        {
                "filename": "ammoniaX360.pdf",
                "rel_path": "Ammonia and Methanol/ammoniaX360.pdf",
                "title": "AmmoniaX360",
                "subtitle": "Predictive Decision Support for Ammonia Plant",
                "category": "Ammonia and Methanol",
                "category_slug": "ammonia-and-methanol",
                "format": "PDF",
                "ext": ".pdf",
                "size": 513452,
                "size_formatted": "501.4 KB",
                "modified_time": 1790181177,
                "modified_date": "Sep 23, 2026",
                "thumbnail_url": "static/thumbnails/ammoniaX360.png",
                "download_url": "brochures/Ammonia and Methanol/ammoniaX360.pdf",
                "preview_url": "brochures/Ammonia and Methanol/ammoniaX360.pdf"
        },
        {
                "filename": "MethanolX360.pdf",
                "rel_path": "Ammonia and Methanol/MethanolX360.pdf",
                "title": "MethanolX360",
                "subtitle": "Predictive Decision Support for Methanol Complex",
                "category": "Ammonia and Methanol",
                "category_slug": "ammonia-and-methanol",
                "format": "PDF",
                "ext": ".pdf",
                "size": 358679,
                "size_formatted": "350.3 KB",
                "modified_time": 1788864367,
                "modified_date": "Sep 08, 2026",
                "thumbnail_url": "static/thumbnails/MethanolX360.png",
                "download_url": "brochures/Ammonia and Methanol/MethanolX360.pdf",
                "preview_url": "brochures/Ammonia and Methanol/MethanolX360.pdf"
        },
        {
                "filename": "controllerX360_brochure.pdf",
                "rel_path": "Diagnostic and Agentic AI Tools/controllerX360_brochure.pdf",
                "title": "ControllerX360",
                "subtitle": "Control Loop Performance Diagnosis & Autonomous Tuning",
                "category": "Diagnostic and Agentic AI Tools",
                "category_slug": "diagnostic-and-agentic-ai-tools",
                "format": "PDF",
                "ext": ".pdf",
                "size": 418263,
                "size_formatted": "408.5 KB",
                "modified_time": 1791633785,
                "modified_date": "Oct 10, 2026",
                "thumbnail_url": "static/thumbnails/controllerX360_brochure.png",
                "download_url": "brochures/Diagnostic and Agentic AI Tools/controllerX360_brochure.pdf",
                "preview_url": "brochures/Diagnostic and Agentic AI Tools/controllerX360_brochure.pdf"
        },
        {
                "filename": "genX360_Brochure.pdf",
                "rel_path": "Diagnostic and Agentic AI Tools/genX360_Brochure.pdf",
                "title": "GenX360",
                "subtitle": "Autonomous Generative AI Decision Support for Process Manufacturing",
                "category": "Diagnostic and Agentic AI Tools",
                "category_slug": "diagnostic-and-agentic-ai-tools",
                "format": "PDF",
                "ext": ".pdf",
                "size": 193516,
                "size_formatted": "189.0 KB",
                "modified_time": 1791633788,
                "modified_date": "Oct 10, 2026",
                "thumbnail_url": "static/thumbnails/genX360_Brochure.png",
                "download_url": "brochures/Diagnostic and Agentic AI Tools/genX360_Brochure.pdf",
                "preview_url": "brochures/Diagnostic and Agentic AI Tools/genX360_Brochure.pdf"
        },
        {
                "filename": "outlierX360_brochure.pdf",
                "rel_path": "Diagnostic and Agentic AI Tools/outlierX360_brochure.pdf",
                "title": "OutlierX360",
                "subtitle": "Outlier Detection & Plant Sensor Data Diagnostics",
                "category": "Diagnostic and Agentic AI Tools",
                "category_slug": "diagnostic-and-agentic-ai-tools",
                "format": "PDF",
                "ext": ".pdf",
                "size": 397711,
                "size_formatted": "388.4 KB",
                "modified_time": 1791633789,
                "modified_date": "Oct 10, 2026",
                "thumbnail_url": "static/thumbnails/outlierX360_brochure.png",
                "download_url": "brochures/Diagnostic and Agentic AI Tools/outlierX360_brochure.pdf",
                "preview_url": "brochures/Diagnostic and Agentic AI Tools/outlierX360_brochure.pdf"
        },
        {
                "filename": "workflowX360_brochure.pdf",
                "rel_path": "Diagnostic and Agentic AI Tools/workflowX360_brochure.pdf",
                "title": "WorkflowX360",
                "subtitle": "Standard Workflow Orchestration for Industrial AI",
                "category": "Diagnostic and Agentic AI Tools",
                "category_slug": "diagnostic-and-agentic-ai-tools",
                "format": "PDF",
                "ext": ".pdf",
                "size": 235174,
                "size_formatted": "229.7 KB",
                "modified_time": 1791635005,
                "modified_date": "Oct 10, 2026",
                "thumbnail_url": "static/thumbnails/workflowX360_brochure.png",
                "download_url": "brochures/Diagnostic and Agentic AI Tools/workflowX360_brochure.pdf",
                "preview_url": "brochures/Diagnostic and Agentic AI Tools/workflowX360_brochure.pdf"
        },
        {
                "filename": "gasnetX360.pdf",
                "rel_path": "Gas/gasnetX360.pdf",
                "title": "GasnetX360",
                "subtitle": "Highest-Margin, Constraint-Feasible Pipeline Network Optimization",
                "category": "Gas",
                "category_slug": "gas",
                "format": "PDF",
                "ext": ".pdf",
                "size": 505690,
                "size_formatted": "493.8 KB",
                "modified_time": 1791795647,
                "modified_date": "Oct 12, 2026",
                "thumbnail_url": "static/thumbnails/gasnetX360.png",
                "download_url": "brochures/Gas/gasnetX360.pdf",
                "preview_url": "brochures/Gas/gasnetX360.pdf"
        },
        {
                "filename": "gasX360.pdf",
                "rel_path": "Gas/gasX360.pdf",
                "title": "GasX360",
                "subtitle": "Predictive Decision Support for Gas Processing Plants",
                "category": "Gas",
                "category_slug": "gas",
                "format": "PDF",
                "ext": ".pdf",
                "size": 1008672,
                "size_formatted": "985.0 KB",
                "modified_time": 1790232444,
                "modified_date": "Sep 24, 2026",
                "thumbnail_url": "static/thumbnails/gasX360.png",
                "download_url": "brochures/Gas/gasX360.pdf",
                "preview_url": "brochures/Gas/gasX360.pdf"
        },
        {
                "filename": "maintenanceX360_brochure.pdf",
                "rel_path": "Maintenance and Reliability/maintenanceX360_brochure.pdf",
                "title": "MaintenanceX360",
                "subtitle": "Predictive Maintenance & Dynamic Scheduling",
                "category": "Maintenance and Reliability",
                "category_slug": "maintenance-and-reliability",
                "format": "PDF",
                "ext": ".pdf",
                "size": 272177,
                "size_formatted": "265.8 KB",
                "modified_time": 1791633788,
                "modified_date": "Oct 10, 2026",
                "thumbnail_url": "static/thumbnails/maintenanceX360_brochure.png",
                "download_url": "brochures/Maintenance and Reliability/maintenanceX360_brochure.pdf",
                "preview_url": "brochures/Maintenance and Reliability/maintenanceX360_brochure.pdf"
        },
        {
                "filename": "reliabilityX360_brochure.pdf",
                "rel_path": "Maintenance and Reliability/reliabilityX360_brochure.pdf",
                "title": "ReliabilityX360",
                "subtitle": "Predictive Decision Support for Critical Rotating Assets",
                "category": "Maintenance and Reliability",
                "category_slug": "maintenance-and-reliability",
                "format": "PDF",
                "ext": ".pdf",
                "size": 680971,
                "size_formatted": "665.0 KB",
                "modified_time": 1791633790,
                "modified_date": "Oct 10, 2026",
                "thumbnail_url": "static/thumbnails/reliabilityX360_brochure.png",
                "download_url": "brochures/Maintenance and Reliability/reliabilityX360_brochure.pdf",
                "preview_url": "brochures/Maintenance and Reliability/reliabilityX360_brochure.pdf"
        },
        {
                "filename": "acetyleneX360_brochure.pdf",
                "rel_path": "Olefin/acetyleneX360_brochure.pdf",
                "title": "AcetyleneX360",
                "subtitle": "Acetylene Hydrogenation & Cold Ethylene Recovery Optimization",
                "category": "Olefin",
                "category_slug": "olefin",
                "format": "PDF",
                "ext": ".pdf",
                "size": 468308,
                "size_formatted": "457.3 KB",
                "modified_time": 1790238891,
                "modified_date": "Sep 24, 2026",
                "thumbnail_url": "static/thumbnails/acetyleneX360_brochure.png",
                "download_url": "brochures/Olefin/acetyleneX360_brochure.pdf",
                "preview_url": "brochures/Olefin/acetyleneX360_brochure.pdf"
        },
        {
                "filename": "cgcX360_brochure.pdf",
                "rel_path": "Olefin/cgcX360_brochure.pdf",
                "title": "CgcX360",
                "subtitle": "Cracked Gas Compression Train Performance & Anti-Surge Diagnostics",
                "category": "Olefin",
                "category_slug": "olefin",
                "format": "PDF",
                "ext": ".pdf",
                "size": 464610,
                "size_formatted": "453.7 KB",
                "modified_time": 1790238897,
                "modified_date": "Sep 24, 2026",
                "thumbnail_url": "static/thumbnails/cgcX360_brochure.png",
                "download_url": "brochures/Olefin/cgcX360_brochure.pdf",
                "preview_url": "brochures/Olefin/cgcX360_brochure.pdf"
        },
        {
                "filename": "furnaceX360_Brochure.pdf",
                "rel_path": "Olefin/furnaceX360_Brochure.pdf",
                "title": "FurnaceX360",
                "subtitle": "Olefin Cracking Furnace Yield & Run-Length Optimization",
                "category": "Olefin",
                "category_slug": "olefin",
                "format": "PDF",
                "ext": ".pdf",
                "size": 288831,
                "size_formatted": "282.1 KB",
                "modified_time": 1791633787,
                "modified_date": "Oct 10, 2026",
                "thumbnail_url": "static/thumbnails/furnaceX360_Brochure.png",
                "download_url": "brochures/Olefin/furnaceX360_Brochure.pdf",
                "preview_url": "brochures/Olefin/furnaceX360_Brochure.pdf"
        },
        {
                "filename": "olefinX360_brochure.pdf",
                "rel_path": "Olefin/olefinX360_brochure.pdf",
                "title": "OlefinX360",
                "subtitle": "Comprehensive Ethylene & Olefin Complex Optimization",
                "category": "Olefin",
                "category_slug": "olefin",
                "format": "PDF",
                "ext": ".pdf",
                "size": 1713617,
                "size_formatted": "1.6 MB",
                "modified_time": 1790266729,
                "modified_date": "Sep 24, 2026",
                "thumbnail_url": "static/thumbnails/olefinX360_brochure.png",
                "download_url": "brochures/Olefin/olefinX360_brochure.pdf",
                "preview_url": "brochures/Olefin/olefinX360_brochure.pdf"
        },
        {
                "filename": "quenchX360_brochure.pdf",
                "rel_path": "Olefin/quenchX360_brochure.pdf",
                "title": "QuenchX360",
                "subtitle": "Quench & Dilution Steam System Process Optimization",
                "category": "Olefin",
                "category_slug": "olefin",
                "format": "PDF",
                "ext": ".pdf",
                "size": 473813,
                "size_formatted": "462.7 KB",
                "modified_time": 1790238917,
                "modified_date": "Sep 24, 2026",
                "thumbnail_url": "static/thumbnails/quenchX360_brochure.png",
                "download_url": "brochures/Olefin/quenchX360_brochure.pdf",
                "preview_url": "brochures/Olefin/quenchX360_brochure.pdf"
        },
        {
                "filename": "recoveryX360_brochure.pdf",
                "rel_path": "Olefin/recoveryX360_brochure.pdf",
                "title": "RecoveryX360",
                "subtitle": "Cold Section & Ethylene Recovery Train Optimization",
                "category": "Olefin",
                "category_slug": "olefin",
                "format": "PDF",
                "ext": ".pdf",
                "size": 473901,
                "size_formatted": "462.8 KB",
                "modified_time": 1790238934,
                "modified_date": "Sep 24, 2026",
                "thumbnail_url": "static/thumbnails/recoveryX360_brochure.png",
                "download_url": "brochures/Olefin/recoveryX360_brochure.pdf",
                "preview_url": "brochures/Olefin/recoveryX360_brochure.pdf"
        },
        {
                "filename": "polymerX360_brochure.pdf",
                "rel_path": "Polymer/polymerX360_brochure.pdf",
                "title": "PolymerX360",
                "subtitle": "Predictive Decision Support for Polymer & Polyolefin Units",
                "category": "Polymer",
                "category_slug": "polymer",
                "format": "PDF",
                "ext": ".pdf",
                "size": 692698,
                "size_formatted": "676.5 KB",
                "modified_time": 1791634801,
                "modified_date": "Oct 10, 2026",
                "thumbnail_url": "static/thumbnails/polymerX360_brochure.png",
                "download_url": "brochures/Polymer/polymerX360_brochure.pdf",
                "preview_url": "brochures/Polymer/polymerX360_brochure.pdf"
        },
        {
                "filename": "cduX360_brochure.pdf",
                "rel_path": "Refinery/cduX360_brochure.pdf",
                "title": "CDUX360",
                "subtitle": "Predictive Decision Support for Crude Distillation Units",
                "category": "Refinery",
                "category_slug": "refinery",
                "format": "PDF",
                "ext": ".pdf",
                "size": 796854,
                "size_formatted": "778.2 KB",
                "modified_time": 1791633784,
                "modified_date": "Oct 10, 2026",
                "thumbnail_url": "static/thumbnails/cduX360_brochure.png",
                "download_url": "brochures/Refinery/cduX360_brochure.pdf",
                "preview_url": "brochures/Refinery/cduX360_brochure.pdf"
        },
        {
                "filename": "cokerX360_brochure.pdf",
                "rel_path": "Refinery/cokerX360_brochure.pdf",
                "title": "CokerX360",
                "subtitle": "Delayed Coking Unit Cycle & Throughput Optimization",
                "category": "Refinery",
                "category_slug": "refinery",
                "format": "PDF",
                "ext": ".pdf",
                "size": 582249,
                "size_formatted": "568.6 KB",
                "modified_time": 1791633785,
                "modified_date": "Oct 10, 2026",
                "thumbnail_url": "static/thumbnails/cokerX360_brochure.png",
                "download_url": "brochures/Refinery/cokerX360_brochure.pdf",
                "preview_url": "brochures/Refinery/cokerX360_brochure.pdf"
        },
        {
                "filename": "vduX360_brochure.pdf",
                "rel_path": "Refinery/vduX360_brochure.pdf",
                "title": "VDUX360",
                "subtitle": "Vacuum Distillation Unit Cut-Point & Energy Optimization",
                "category": "Refinery",
                "category_slug": "refinery",
                "format": "PDF",
                "ext": ".pdf",
                "size": 797536,
                "size_formatted": "778.8 KB",
                "modified_time": 1791633791,
                "modified_date": "Oct 10, 2026",
                "thumbnail_url": "static/thumbnails/vduX360_brochure.png",
                "download_url": "brochures/Refinery/vduX360_brochure.pdf",
                "preview_url": "brochures/Refinery/vduX360_brochure.pdf"
        },
        {
                "filename": "energyX360_brochure.pdf",
                "rel_path": "Utility/energyX360_brochure.pdf",
                "title": "EnergyX360",
                "subtitle": "Site-Wide Energy, Steam, Power & Emissions Optimization",
                "category": "Utility",
                "category_slug": "utility",
                "format": "PDF",
                "ext": ".pdf",
                "size": 4186645,
                "size_formatted": "4.0 MB",
                "modified_time": 1791633787,
                "modified_date": "Oct 10, 2026",
                "thumbnail_url": "static/thumbnails/energyX360_brochure.png",
                "download_url": "brochures/Utility/energyX360_brochure.pdf",
                "preview_url": "brochures/Utility/energyX360_brochure.pdf"
        }
];

    // App State
    let brochures = [];
    let categories = [];
    let demos = [];
    let ktVideos = [];
    let selectedFiles = new Set();
    let activeCategory = 'ALL';
    let activeFormat = 'ALL';
    let searchQuery = '';
    let sortBy = 'newest';
    let currentView = 'grid';
    let activeMainTab = 'brochures';
    let uploadFile = null;
    let isAdminLoggedIn = sessionStorage.getItem('ingenero_admin_token') === 'ADMIN_AUTH_VALID';

    let activeTargetFilename = null;
    let activeEditDemoId = null;

    // DOM Elements
    const tabBrochures = document.getElementById('tabBrochures');
    const tabKtVideos = document.getElementById('tabKtVideos');
    const tabDemos = document.getElementById('tabDemos');
    const brochuresSection = document.getElementById('brochuresSection');
    const ktVideosSection = document.getElementById('ktVideosSection');
    const demosSection = document.getElementById('demosSection');
    const demosGrid = document.getElementById('demosGrid');
    const ktVideosGrid = document.getElementById('ktVideosGrid');
    const ktVideoCountBadge = document.getElementById('ktVideoCountBadge');

    const ktVideoPlayerModal = document.getElementById('ktVideoPlayerModal');
    const btnCloseKtModal = document.getElementById('btnCloseKtModal');
    const btnDownloadKtModal = document.getElementById('btnDownloadKtModal');
    const ktModalTitle = document.getElementById('ktModalTitle');
    const ktMediaContainer = document.getElementById('ktMediaContainer');
    const ktModalBadge = document.getElementById('ktModalBadge');
    const ktModalFormat = document.getElementById('ktModalFormat');
    const ktModalSize = document.getElementById('ktModalSize');
    const ktModalDesc = document.getElementById('ktModalDesc');
    const ktModalTopicsList = document.getElementById('ktModalTopicsList');

    const gridView = document.getElementById('brochuresGrid');
    const listViewWrapper = document.getElementById('brochuresListWrapper');
    const tableBody = document.getElementById('brochuresTableBody');
    const emptyState = document.getElementById('emptyState');
    const categoryPillsContainer = document.getElementById('categoryPills');
    const searchInput = document.getElementById('searchInput');
    const btnClearSearch = document.getElementById('btnClearSearch');
    const formatFilter = document.getElementById('formatFilter');
    const sortSelect = document.getElementById('sortSelect');
    const btnGridView = document.getElementById('btnGridView');
    const btnListView = document.getElementById('btnListView');
    const selectionBar = document.getElementById('selectionBar');
    const selectedCountSpan = document.getElementById('selectedCount');
    const selectedItemsText = document.getElementById('selectedItemsText');
    const btnBulkDownload = document.getElementById('btnBulkDownload');
    const btnBulkDownloadText = document.getElementById('btnBulkDownloadText');
    const btnDownloadSelected = document.getElementById('btnDownloadSelected');
    const btnDownloadAll = document.getElementById('btnDownloadAll');
    const btnToggleSelectAll = document.getElementById('btnToggleSelectAll');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const selectAllTableCheckbox = document.getElementById('selectAllTableCheckbox');
    const btnSync = document.getElementById('btnSync');
    const statTotal = document.getElementById('statTotal');
    const statProducts = document.getElementById('statProducts');

    const btnAdminAccess = document.getElementById('btnAdminAccess');
    const adminBtnText = document.getElementById('adminBtnText');
    const adminIcon = document.getElementById('adminIcon');
    const adminLoginModal = document.getElementById('adminLoginModal');
    const btnCloseAdminLogin = document.getElementById('btnCloseAdminLogin');
    const btnCancelAdminLogin = document.getElementById('btnCancelAdminLogin');
    const btnSubmitAdminLogin = document.getElementById('btnSubmitAdminLogin');
    const adminPasswordInput = document.getElementById('adminPasswordInput');

    const githubTokenModal = document.getElementById('githubTokenModal');
    const btnCloseGitHubToken = document.getElementById('btnCloseGitHubToken');
    const btnCancelGitHubToken = document.getElementById('btnCancelGitHubToken');
    const btnSaveGitHubToken = document.getElementById('btnSaveGitHubToken');
    const githubTokenInput = document.getElementById('githubTokenInput');

    const adminRenameModal = document.getElementById('adminRenameModal');
    const btnCloseAdminRename = document.getElementById('btnCloseAdminRename');
    const btnCancelAdminRename = document.getElementById('btnCancelAdminRename');
    const btnSubmitRename = document.getElementById('btnSubmitRename');
    const renameOriginalInput = document.getElementById('renameOriginalInput');
    const renameNewInput = document.getElementById('renameNewInput');

    const adminDeleteModal = document.getElementById('adminDeleteModal');
    const btnCloseAdminDelete = document.getElementById('btnCloseAdminDelete');
    const btnCancelAdminDelete = document.getElementById('btnCancelAdminDelete');
    const btnConfirmDelete = document.getElementById('btnConfirmDelete');
    const deleteTargetFilename = document.getElementById('deleteTargetFilename');

    const demoModal = document.getElementById('demoModal');
    const demoModalTitle = document.getElementById('demoModalTitle');
    const btnOpenAddDemo = document.getElementById('btnOpenAddDemo');
    const btnCloseDemoModal = document.getElementById('btnCloseDemoModal');
    const btnCancelDemoModal = document.getElementById('btnCancelDemoModal');
    const btnSubmitDemo = document.getElementById('btnSubmitDemo');
    const demoTitleInput = document.getElementById('demoTitleInput');
    const demoUrlInput = document.getElementById('demoUrlInput');
    const demoCategoryInput = document.getElementById('demoCategoryInput');
    const demoDescInput = document.getElementById('demoDescInput');

    const uploadModal = document.getElementById('uploadModal');
    const btnOpenUpload = document.getElementById('btnOpenUpload');
    const btnCloseUpload = document.getElementById('btnCloseUpload');
    const btnCancelUpload = document.getElementById('btnCancelUpload');
    const btnSubmitUpload = document.getElementById('btnSubmitUpload');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const selectedFileArea = document.getElementById('selectedFileArea');
    const selectedFileName = document.getElementById('selectedFileName');
    const selectedFileSize = document.getElementById('selectedFileSize');
    const btnRemoveFile = document.getElementById('btnRemoveFile');

    const previewModal = document.getElementById('previewModal');
    const btnClosePreview = document.getElementById('btnClosePreview');
    const previewTitle = document.getElementById('previewTitle');
    const previewIframe = document.getElementById('previewIframe');
    const btnOpenNewTab = document.getElementById('btnOpenNewTab');
    const btnDownloadPreview = document.getElementById('btnDownloadPreview');

    init();

    function init() {
        updateAdminNavUI();
        fetchBrochures();
        fetchKtVideos();
        fetchDemos();
        setupEventListeners();
    }

    function applySavedCustomTitles(list) {
        const saved = getSavedCustomTitles();
        list.forEach(b => {
            if (saved[b.filename]) {
                b.title = saved[b.filename];
                b.category = getFileCategory(b.title);
            }
        });
    }

    function updateAdminNavUI() {
        if (isAdminLoggedIn) {
            btnAdminAccess.classList.add('admin-active');
            adminBtnText.textContent = 'Admin Mode (Active)';
            adminIcon.className = 'fa-solid fa-user-shield';
        } else {
            btnAdminAccess.classList.remove('admin-active');
            adminBtnText.textContent = 'Admin Access';
            adminIcon.className = 'fa-solid fa-shield-halved';
        }
    }

    function switchTab(tabName) {
        activeMainTab = tabName;
        // Reset all tabs
        tabBrochures.classList.remove('active');
        if (tabKtVideos) tabKtVideos.classList.remove('active');
        tabDemos.classList.remove('active');

        brochuresSection.style.display = 'none';
        if (ktVideosSection) ktVideosSection.style.display = 'none';
        demosSection.style.display = 'none';

        if (tabName === 'brochures') {
            tabBrochures.classList.add('active');
            brochuresSection.style.display = 'block';
        } else if (tabName === 'ktVideos') {
            if (tabKtVideos) tabKtVideos.classList.add('active');
            if (ktVideosSection) ktVideosSection.style.display = 'block';
            fetchKtVideos();
        } else if (tabName === 'demos') {
            tabDemos.classList.add('active');
            demosSection.style.display = 'block';
            fetchDemos();
        }
    }

    async function fetchBrochures(showToastNotification = false) {
        try {
            let res = await fetch('/api/brochures');
            if (!res.ok) {
                res = await fetch('brochures.json');
            }
            if (res.ok) {
                const data = await res.json();
                brochures = Array.isArray(data) ? data : (data.brochures || []);
                applySavedCustomTitles(brochures);
                mergeSavedCustomUploads(brochures);
                brochures = filterOutSavedDeletions(brochures);
                categories = sortedCategories(brochures);
                updateStats();
                renderCategoryPills();
                renderBrochures();
                if (showToastNotification) showToast('Portal refreshed successfully.', 'success');
                return;
            }
            throw new Error('API & brochures.json unavailable');
        } catch (err) {
            brochures = JSON.parse(JSON.stringify(staticBrochuresFallback));
            applySavedCustomTitles(brochures);
            mergeSavedCustomUploads(brochures);
            brochures = filterOutSavedDeletions(brochures);
            categories = sortedCategories(brochures);
            updateStats();
            renderCategoryPills();
            renderBrochures();
        }
    }

    const staticKtVideosFallback = [
        {
            "id": "kt-coker",
            "title": "CokerX360 Knowledge Transfer & Walkthrough",
            "suite": "Refinery",
            "product": "CokerX360",
            "filename": "CokerX360.mp4",
            "url": "videos/CokerX360.mp4",
            "drive_url": "https://ingenero0-my.sharepoint.com/:f:/g/personal/sdalvi_ingenero_com/IgCDbuyBG5dHRIGc04CqPmuHAQ5OoguLQwiHg3spGTobzRc?e=FdLckG",
            "type": "video/mp4",
            "format": "MP4 Video",
            "size": "34.2 MB",
            "badge": "Refinery Upgrading",
            "description": "Knowledge transfer session on Delayed Coking Unit cycle acceleration, thermal stress guarding, velocity steam optimization, and HCGO yield maximization co-pilot.",
            "topics": ["Drum switch & quench cycle optimization", "Fired heater velocity steam control", "Anti-foam injection & foam-over mitigation", "Downstream hydrocracker yield boost"]
        },
        {
            "id": "kt-furnace",
            "title": "FurnaceX360 Knowledge Transfer & Technical Briefing",
            "suite": "Olefin",
            "product": "FurnaceX360",
            "filename": "FurnaceX360.m4a",
            "url": "videos/FurnaceX360.m4a",
            "drive_url": "https://ingenero0-my.sharepoint.com/:f:/g/personal/sdalvi_ingenero_com/IgCDbuyBG5dHRIGc04CqPmuHAQ5OoguLQwiHg3spGTobzRc?e=FdLckG",
            "type": "audio/mp4",
            "format": "M4A Audio / Briefing",
            "size": "35.7 MB",
            "badge": "Ethylene Complex",
            "description": "Detailed walkthrough of Olefins Cracking Furnace yield maximization, coil outlet temperature (COT) & tube metal temperature (TMT) balancing, and 10-15% run-length extension.",
            "topics": ["COT balancing across cracking passes", "Coking rate prediction & run-length extension", "Decoking schedule optimization", "Cross-coil feed distribution control"]
        },
        {
            "id": "kt-gen",
            "title": "GenX360 Knowledge Transfer & Platform Walkthrough",
            "suite": "Diagnostic & Agentic AI Tools",
            "product": "GenX360",
            "filename": "GenX360.m4a",
            "url": "videos/GenX360.m4a",
            "drive_url": "https://ingenero0-my.sharepoint.com/:f:/g/personal/sdalvi_ingenero_com/IgCDbuyBG5dHRIGc04CqPmuHAQ5OoguLQwiHg3spGTobzRc?e=FdLckG",
            "type": "audio/mp4",
            "format": "M4A Audio / Briefing",
            "size": "35.5 MB",
            "badge": "Industrial GenAI",
            "description": "In-depth overview of GenX360 conversational generative AI co-pilot, grounded retrieval-augmented generation (RAG) over plant SOPs, and automated shift handover reports.",
            "topics": ["Natural-language plant historian querying", "Grounded SOP & vendor manual parsing", "Automated shift handover & incident debriefs", "Enterprise guardrails & role-based governance"]
        },
        {
            "id": "kt-outlier",
            "title": "OutlierX360 Knowledge Transfer & Sensor Diagnostics",
            "suite": "Diagnostic & Agentic AI Tools",
            "product": "OutlierX360",
            "filename": "OutlierX360.mp4",
            "url": "videos/OutlierX360.mp4",
            "drive_url": "https://ingenero0-my.sharepoint.com/:f:/g/personal/sdalvi_ingenero_com/IgCDbuyBG5dHRIGc04CqPmuHAQ5OoguLQwiHg3spGTobzRc?e=FdLckG",
            "type": "video/mp4",
            "format": "MP4 Video",
            "size": "89.9 MB",
            "badge": "Sensor Diagnostics",
            "description": "Complete video demo on multivariate sensor validation, distinguishing sensor drift vs. process grade shifts, cutting nuisance alarms by 80%+, and APC input sanitization.",
            "topics": ["Multivariate correlation envelopes across 10,000+ tags", "Sensor drift vs. process upset autonomous isolation", "80%+ nuisance alarm reduction", "Pristine data pipeline for advanced process controllers"]
        },
        {
            "id": "kt-reliability",
            "title": "ReliabilityX360 Knowledge Transfer & Machinery Health",
            "suite": "Maintenance & Reliability",
            "product": "ReliabilityX360",
            "filename": "ReliabilityX360.mp4",
            "url": "videos/ReliabilityX360.mp4",
            "drive_url": "https://ingenero0-my.sharepoint.com/:f:/g/personal/sdalvi_ingenero_com/IgCDbuyBG5dHRIGc04CqPmuHAQ5OoguLQwiHg3spGTobzRc?e=FdLckG",
            "type": "video/mp4",
            "format": "MP4 Video",
            "size": "29.6 MB",
            "badge": "Critical Assets",
            "description": "Comprehensive knowledge session on physics-informed predictive maintenance for critical compressors, pumps, and turbines with 14-30 day lead anomaly detection.",
            "topics": ["Physics-informed rotating asset machine learning models", "Vibration spectral signature & bearing thermal warning", "Lube oil degradation & mechanical seal monitoring", "14 to 30 day pre-trip actionable maintenance horizon"]
        }
    ];

    async function fetchKtVideos() {
        try {
            let res = await fetch('/api/kt-videos');
            if (!res.ok) {
                res = await fetch('kt_videos.json');
            }
            if (res.ok) {
                const data = await res.json();
                ktVideos = Array.isArray(data) ? data : (data.videos || []);
                renderKtVideos();
                return;
            }
            throw new Error('Fallback to static KT videos');
        } catch (err) {
            ktVideos = staticKtVideosFallback;
            renderKtVideos();
        }
    }

    function renderKtVideos() {
        if (!ktVideosGrid) return;
        if (ktVideoCountBadge) {
            ktVideoCountBadge.textContent = `${ktVideos.length} Sessions`;
        }

        if (ktVideos.length === 0) {
            ktVideosGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; padding: 3rem 1rem;">
                    <i class="fa-solid fa-film empty-icon"></i>
                    <h3>No KT Videos Available</h3>
                    <p>Knowledge transfer sessions will appear here once uploaded.</p>
                </div>
            `;
            return;
        }

        ktVideosGrid.innerHTML = ktVideos.map(kt => {
            const isAudio = (kt.type || '').includes('audio') || (kt.filename || '').endsWith('.m4a');
            const mediaIcon = isAudio ? 'fa-headphones' : 'fa-film';
            const actionPlayText = isAudio ? 'Listen Audio' : 'Watch Video';

            const topicsHTML = (kt.topics || []).map(t => `
                <li><i class="fa-solid fa-check"></i> <span>${t}</span></li>
            `).join('');

            return `
                <div class="kt-card" id="card-${kt.id}">
                    <div>
                        <div class="demo-card-top">
                            <span class="kt-card-badge">${kt.badge || kt.suite}</span>
                            <span class="badge" style="background: rgba(148, 163, 184, 0.15); color: var(--slate-700); font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 6px;">
                                <i class="fa-solid ${mediaIcon}"></i> ${kt.format}
                            </span>
                        </div>
                        <div class="kt-card-suite">${kt.suite}</div>
                        <h3 class="kt-card-title">${kt.title}</h3>
                        <div class="kt-card-meta">
                            <span><i class="fa-regular fa-hard-drive"></i> ${kt.size}</span>
                            <span>&bull;</span>
                            <span><i class="fa-solid fa-layer-group"></i> ${kt.product}</span>
                        </div>
                        <p class="kt-card-desc">${kt.description}</p>
                        <ul class="kt-card-topics">
                            ${topicsHTML}
                        </ul>
                    </div>

                    <div class="demo-card-actions">
                        <button class="btn btn-primary btn-play-kt" data-id="${kt.id}" title="Play session in modal">
                            <i class="fa-solid fa-play"></i> ${actionPlayText}
                        </button>
                        ${kt.drive_url ? `
                            <a href="${kt.drive_url}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" title="Watch on Microsoft OneDrive / Stream">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i> OneDrive
                            </a>
                        ` : `
                            <a href="${kt.url}" download class="btn btn-secondary" title="Direct download session file (${kt.size})">
                                <i class="fa-solid fa-download"></i> Download
                            </a>
                        `}
                    </div>
                </div>
            `;
        }).join('');

        // Attach play click listeners
        document.querySelectorAll('.btn-play-kt').forEach(btn => {
            btn.addEventListener('click', () => {
                const ktId = btn.getAttribute('data-id');
                const kt = ktVideos.find(v => v.id === ktId);
                if (kt) openKtVideoModal(kt);
            });
        });
    }

    function openKtVideoModal(kt) {
        if (!ktVideoPlayerModal) return;
        const isAudio = (kt.type || '').includes('audio') || (kt.filename || '').endsWith('.m4a');
        
        ktModalTitle.innerHTML = `<i class="fa-solid ${isAudio ? 'fa-headphones' : 'fa-film'}" style="color: #60a5fa;"></i> ${kt.title}`;
        if (kt.drive_url) {
            btnDownloadKtModal.href = kt.drive_url;
            btnDownloadKtModal.target = '_blank';
            btnDownloadKtModal.removeAttribute('download');
            btnDownloadKtModal.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square"></i> Open in OneDrive';
        } else {
            btnDownloadKtModal.href = kt.url;
            btnDownloadKtModal.target = '_self';
            btnDownloadKtModal.setAttribute('download', kt.filename);
            btnDownloadKtModal.innerHTML = '<i class="fa-solid fa-download"></i> Download Media';
        }
        
        ktModalBadge.textContent = kt.suite;
        ktModalFormat.textContent = kt.format;
        ktModalSize.textContent = kt.size;
        ktModalDesc.textContent = kt.description;

        if (ktModalTopicsList) {
            ktModalTopicsList.innerHTML = (kt.topics || []).map(t => `
                <div style="color: #94a3b8; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;">
                    <i class="fa-solid fa-chevron-right" style="color: #60a5fa; font-size: 0.7rem;"></i> <span>${t}</span>
                </div>
            `).join('');
        }

        const driveUrl = kt.drive_url || '#';
        const hasDriveUrl = !!kt.drive_url;

        if (isAudio) {
            ktMediaContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; min-height: 340px; padding: 2.5rem 1.5rem; background: linear-gradient(180deg, #0f172a, #020617); text-align: center;">
                    <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(59, 130, 246, 0.2); border: 2px solid #3b82f6; display: flex; align-items: center; justify-content: center; margin-bottom: 1.25rem;">
                        <i class="fa-solid fa-headphones" style="font-size: 2.2rem; color: #60a5fa;"></i>
                    </div>
                    <h4 style="color: #fff; font-size: 1.25rem; font-weight: 700; margin-bottom: 0.35rem;">${kt.product} Technical Briefing</h4>
                    <p style="color: #94a3b8; font-size: 0.88rem; margin-bottom: 1.5rem;">IngeneroX360AI Engineering Audio Knowledge Transfer &bull; ${kt.size}</p>
                    
                    <audio id="ktAudioElement" controls autoplay style="width: 100%; max-width: 550px; outline: none; border-radius: 30px;">
                        <source src="${kt.url}" type="${kt.type}">
                        Your browser does not support audio playback.
                    </audio>

                    <div id="ktAudioFallback" style="display: none; width: 100%; max-width: 550px; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(59, 130, 246, 0.35); border-radius: 12px; padding: 1.5rem; text-align: center; margin-top: 1rem;">
                        <p style="color: #e2e8f0; font-size: 0.95rem; margin-bottom: 1rem;">
                            <i class="fa-solid fa-cloud-arrow-down" style="color: #60a5fa; margin-right: 0.4rem;"></i>
                            Audio briefing is hosted on Ingenero Cloud Storage (${kt.size}).
                        </p>
                        ${hasDriveUrl ? `
                            <a href="${driveUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="padding: 0.65rem 1.5rem; font-weight: 600;">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i> Open & Listen on OneDrive
                            </a>
                        ` : `
                            <span style="color: #94a3b8; font-size: 0.85rem;">Cloud streaming link will be available once configured.</span>
                        `}
                    </div>
                </div>
            `;
        } else {
            ktMediaContainer.innerHTML = `
                <div style="width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 360px; background: #000; border-radius: 8px; overflow: hidden; position: relative;">
                    <video id="ktVideoElement" controls autoplay style="width: 100%; max-height: 520px; outline: none; background: #000;">
                        <source src="${kt.url}" type="${kt.type}">
                        Your browser does not support video playback.
                    </video>

                    <div id="ktVideoFallback" style="display: none; width: 100%; padding: 3rem 1.5rem; background: linear-gradient(180deg, #0b1528, #030816); text-align: center;">
                        <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(59, 130, 246, 0.15); border: 2px solid #3b82f6; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 1.25rem;">
                            <i class="fa-solid fa-video" style="font-size: 2rem; color: #60a5fa;"></i>
                        </div>
                        <h4 style="color: #fff; font-size: 1.25rem; font-weight: 700; margin-bottom: 0.4rem;">${kt.product} Knowledge Transfer Session</h4>
                        <p style="color: #94a3b8; font-size: 0.9rem; max-width: 520px; margin: 0 auto 1.5rem auto; line-height: 1.5;">
                            This high-definition session (${kt.size}) is hosted securely in Cloud Storage. Click below to stream in full resolution.
                        </p>
                        ${hasDriveUrl ? `
                            <a href="${driveUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="padding: 0.75rem 2rem; font-size: 1rem; font-weight: 600; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4); display: inline-flex; align-items: center; gap: 0.6rem;">
                                <i class="fa-solid fa-play"></i> Watch Full Session on OneDrive / Stream
                            </a>
                        ` : `
                            <span style="color: #94a3b8; font-size: 0.85rem;">Cloud streaming link will be updated shortly.</span>
                        `}
                    </div>
                </div>
            `;
        }

        // Attach error listener to switch to fallback when static media fails to load (e.g. on GitHub Pages)
        const mediaElem = isAudio ? document.getElementById('ktAudioElement') : document.getElementById('ktVideoElement');
        const fallbackElem = isAudio ? document.getElementById('ktAudioFallback') : document.getElementById('ktVideoFallback');
        if (mediaElem && fallbackElem) {
            const handleMediaError = () => {
                mediaElem.style.display = 'none';
                fallbackElem.style.display = 'block';
            };
            const sourceElem = mediaElem.querySelector('source');
            if (sourceElem) {
                sourceElem.addEventListener('error', handleMediaError);
            }
            mediaElem.addEventListener('error', handleMediaError);

            // Timeout check: if media hasn't loaded any data within 1.5 seconds and has error/no source
            setTimeout(() => {
                if (mediaElem.readyState === 0 && (mediaElem.networkState === 3 || mediaElem.error)) {
                    handleMediaError();
                }
            }, 1500);
        }

        ktVideoPlayerModal.classList.add('active');
    }

    function closeKtVideoModal() {
        if (!ktVideoPlayerModal) return;
        ktVideoPlayerModal.classList.remove('active');
        if (ktMediaContainer) {
            ktMediaContainer.innerHTML = '';
        }
    }

    async function fetchDemos() {
        try {
            let res = await fetch('/api/demos');
            if (!res.ok) {
                res = await fetch('demos.json');
            }
            if (res.ok) {
                const data = await res.json();
                demos = Array.isArray(data) ? data : (data.demos || []);
                renderDemos();
            }
        } catch (err) {
            console.error('Error fetching demos:', err);
        }
    }

    function sortedCategories(list) {
        return Array.from(new Set(list.map(b => b.category))).sort();
    }

    function updateStats() {
        statTotal.textContent = brochures.length;
        const uniqueCategories = new Set(brochures.map(b => b.category));
        statProducts.textContent = uniqueCategories.size;
    }

    const CATEGORY_ICONS = {
        'Ammonia and Methanol': 'fa-flask',
        'Diagnostic and Agentic AI Tools': 'fa-brain',
        'Gas': 'fa-fire-flame-simple',
        'Maintenance and Reliability': 'fa-gears',
        'Olefin': 'fa-industry',
        'Polymer': 'fa-cubes-stacked',
        'Refinery': 'fa-oil-well',
        'Utility': 'fa-bolt'
    };

    function renderCategoryPills() {
        const totalCount = brochures.length;
        let pillsHTML = `<button class="pill-btn ${activeCategory === 'ALL' ? 'active' : ''}" data-category="ALL"><i class="fa-solid fa-layer-group"></i> All Products <span class="pill-count">${totalCount}</span></button>`;
        categories.forEach(cat => {
            const isActive = activeCategory === cat ? 'active' : '';
            const count = brochures.filter(b => b.category === cat).length;
            const icon = CATEGORY_ICONS[cat] || 'fa-folder';
            pillsHTML += `<button class="pill-btn ${isActive}" data-category="${cat}"><i class="fa-solid ${icon}"></i> ${cat} <span class="pill-count">${count}</span></button>`;
        });
        categoryPillsContainer.innerHTML = pillsHTML;
    }

    function getFilteredBrochures() {
        return brochures.filter(item => {
            if (activeCategory !== 'ALL' && item.category !== activeCategory) return false;
            if (activeFormat !== 'ALL' && item.format !== activeFormat) return false;
            if (searchQuery.trim() !== '') {
                const q = searchQuery.toLowerCase();
                const matchTitle = (item.title || '').toLowerCase().includes(q);
                const matchSubtitle = (item.subtitle || '').toLowerCase().includes(q);
                const matchFilename = (item.filename || '').toLowerCase().includes(q);
                const matchCategory = (item.category || '').toLowerCase().includes(q);
                const matchFormat = (item.format || '').toLowerCase().includes(q);
                if (!matchTitle && !matchSubtitle && !matchFilename && !matchCategory && !matchFormat) return false;
            }
            return true;
        }).sort((a, b) => {
            if (sortBy === 'newest') return b.modified_time - a.modified_time;
            else if (sortBy === 'title_asc') return a.title.localeCompare(b.title);
            else if (sortBy === 'size_desc') return (b.size || 0) - (a.size || 0);
            return 0;
        });
    }

    function renderBrochures() {
        const filtered = getFilteredBrochures();
        if (filtered.length === 0) {
            gridView.style.display = 'none';
            listViewWrapper.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        if (currentView === 'grid') {
            listViewWrapper.style.display = 'none';
            gridView.style.display = 'grid';
            renderGrid(filtered);
        } else {
            gridView.style.display = 'none';
            listViewWrapper.style.display = 'block';
            renderList(filtered);
        }

        updateSelectionUI();
    }

    function renderGrid(items) {
        gridView.innerHTML = items.map(item => {
            const isChecked = selectedFiles.has(item.filename);
            const cardClass = isChecked ? 'brochure-card selected' : 'brochure-card';
            
            const iconClass = item.format === 'PDF' ? 'pdf-icon' : 'pptx-icon';
            const faIcon = item.format === 'PDF' ? 'fa-file-pdf' : 'fa-file-powerpoint';
            const fallbackHTML = `
                <div class="thumb-fallback ${iconClass}">
                    <i class="fa-solid ${faIcon}"></i>
                    <span>${item.format} Document</span>
                </div>`;

            let thumbHTML = '';
            if (item.thumbnail_url) {
                thumbHTML = `
                    <img src="${item.thumbnail_url}" alt="${item.title}" class="card-thumb-img" loading="lazy" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';">
                    <div class="thumb-fallback ${iconClass}" style="display:none;">
                        <i class="fa-solid ${faIcon}"></i>
                        <span>${item.format} Document</span>
                    </div>`;
            } else {
                thumbHTML = fallbackHTML;
            }

            const catIcon = CATEGORY_ICONS[item.category] || 'fa-folder';
            const categoryTagHTML = `<span class="card-category-tag"><i class="fa-solid ${catIcon}"></i> ${item.category}</span>`;
            const subtitleHTML = item.subtitle ? `<p class="card-subtitle" title="${item.subtitle}">${item.subtitle}</p>` : '';

            const badgeClass = item.format === 'PDF' ? 'badge-pdf' : (item.format === 'PPTX' ? 'badge-pptx' : 'badge-doc');
            const adminButtons = isAdminLoggedIn ? `
                <div style="display:flex; gap:0.4rem; grid-column: span 2; margin-top:0.3rem;">
                    <button class="btn btn-sm btn-warning btn-edit-file" data-filename="${item.filename}" data-title="${item.title}" style="flex:1;">
                        <i class="fa-solid fa-pen-to-square"></i> Modify Name
                    </button>
                    <button class="btn btn-sm btn-danger btn-delete-file" data-filename="${item.filename}" style="flex:1;">
                        <i class="fa-solid fa-trash-can"></i> Delete
                    </button>
                </div>
            ` : '';

            return `
                <div class="${cardClass}" data-filename="${item.filename}">
                    <div class="card-thumb-area">
                        <span class="format-badge ${badgeClass}">${item.format}</span>
                        ${thumbHTML}
                    </div>

                    <div class="card-body">
                        <div class="card-header-row">
                            ${categoryTagHTML}
                            <label class="card-select-inline ${isChecked ? 'selected' : ''}" onclick="event.stopPropagation();">
                                <input type="checkbox" class="file-checkbox" data-filename="${item.filename}" ${isChecked ? 'checked' : ''}>
                                <span class="checkmark"></span>
                                <span>${isChecked ? 'Selected' : 'Select'}</span>
                            </label>
                        </div>
                        <h3 class="card-title" title="${item.title}">${item.title}</h3>
                        ${subtitleHTML}
                        
                        <div class="card-meta">
                            <span><i class="fa-regular fa-hard-drive"></i> ${item.size_formatted}</span>
                            <span><i class="fa-regular fa-calendar"></i> ${item.modified_date}</span>
                        </div>
                    </div>

                    <div class="card-actions">
                        <button class="btn btn-secondary btn-preview" data-filename="${item.filename}" data-title="${item.title}" data-preview="${item.preview_url}" data-format="${item.format}">
                            <i class="fa-regular fa-eye"></i> Preview
                        </button>
                        <a href="${item.download_url}" class="btn btn-primary" download title="Download file">
                            <i class="fa-solid fa-download"></i> Download
                        </a>
                        ${adminButtons}
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderList(items) {
        tableBody.innerHTML = items.map(item => {
            const isChecked = selectedFiles.has(item.filename);
            const badgeClass = item.format === 'PDF' ? 'badge-pdf' : (item.format === 'PPTX' ? 'badge-pptx' : 'badge-doc');

            const faIcon = item.format === 'PDF' ? 'fa-file-pdf' : 'fa-file-powerpoint';
            const iconColor = item.format === 'PDF' ? 'var(--pdf-red)' : 'var(--pptx-orange)';
            const listFallbackHTML = `<div class="table-thumb-fallback" style="color: ${iconColor}"><i class="fa-solid ${faIcon}"></i></div>`;

            let thumbHTML = '';
            if (item.thumbnail_url) {
                thumbHTML = `
                    <img src="${item.thumbnail_url}" class="table-thumb" alt="thumb" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='inline-block';">
                    <div class="table-thumb-fallback" style="display:none; color: ${iconColor}"><i class="fa-solid ${faIcon}"></i></div>
                `;
            } else {
                thumbHTML = listFallbackHTML;
            }

            const adminActions = isAdminLoggedIn ? `
                <button class="btn btn-sm btn-warning btn-edit-file" data-filename="${item.filename}" data-title="${item.title}" title="Modify File">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn btn-sm btn-danger btn-delete-file" data-filename="${item.filename}" title="Delete File">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            ` : '';

            const catIcon = CATEGORY_ICONS[item.category] || 'fa-folder';
            return `
                <tr data-filename="${item.filename}">
                    <td>
                        <label class="checkbox-container">
                            <input type="checkbox" class="file-checkbox" data-filename="${item.filename}" ${isChecked ? 'checked' : ''}>
                            <span class="checkmark"></span>
                        </label>
                    </td>
                    <td>${thumbHTML}</td>
                    <td>
                        <div style="font-weight: 800; color: var(--slate-900); font-size: 0.95rem;">${item.title}</div>
                        ${item.subtitle ? `<div style="font-size: 0.78rem; color: var(--slate-500); margin-top: 2px;">${item.subtitle}</div>` : ''}
                    </td>
                    <td><span class="card-category-tag"><i class="fa-solid ${catIcon}"></i> ${item.category}</span></td>
                    <td><span class="format-badge ${badgeClass}">${item.format}</span></td>
                    <td>${item.size_formatted}</td>
                    <td>${item.modified_date}</td>
                    <td>
                        <div style="display: flex; gap: 0.4rem; justify-content: flex-end;">
                            <button class="btn btn-sm btn-secondary btn-preview" data-filename="${item.filename}" data-title="${item.title}" data-preview="${item.preview_url}" data-format="${item.format}">
                                <i class="fa-regular fa-eye"></i>
                            </button>
                            <a href="${item.download_url}" class="btn btn-sm btn-primary" download>
                                <i class="fa-solid fa-download"></i>
                            </a>
                            ${adminActions}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderDemos() {
        if (demos.length === 0) {
            demosGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fa-solid fa-desktop empty-icon"></i>
                    <h3>No Demo Links Found</h3>
                    <p>Click "Add Demo Link" to configure live dashboard or video portal links.</p>
                </div>
            `;
            return;
        }

        demosGrid.innerHTML = demos.map(demo => {
            const adminButtons = isAdminLoggedIn ? `
                <button class="btn btn-sm btn-warning btn-edit-demo" data-id="${demo.id}" title="Edit Demo Link">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn btn-sm btn-danger btn-delete-demo" data-id="${demo.id}" title="Delete Demo Link">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            ` : '';

            const iconClass = demo.category.includes('Video') ? 'fa-video' : 'fa-gauge-high';
            const actionText = demo.category.includes('Video') ? 'Watch Video Portal' : 'Launch Live Demo';

            return `
                <div class="demo-card">
                    <div>
                        <div class="demo-card-top">
                            <span class="demo-category-badge">${demo.category}</span>
                            <i class="fa-solid ${iconClass}" style="color: var(--primary); font-size: 1.3rem;"></i>
                        </div>
                        <h3 class="demo-card-title">${demo.title}</h3>
                        <p class="demo-card-desc">${demo.description || 'Access live dashboard and prototype walkthrough.'}</p>
                    </div>

                    <div class="demo-card-actions">
                        <a href="${demo.url}" target="_blank" class="btn btn-primary">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i> ${actionText}
                        </a>
                        ${adminButtons}
                    </div>
                </div>
            `;
        }).join('');
    }

    function updateSelectionUI() {
        const count = selectedFiles.size;
        selectedCountSpan.textContent = count;
        selectedItemsText.textContent = `${count} brochure${count === 1 ? '' : 's'} selected`;

        if (btnBulkDownloadText) {
            btnBulkDownloadText.textContent = count > 0 ? 'Download Selected ZIP' : 'Mass Download All ZIP';
        }

        selectionBar.style.display = 'flex';
        btnBulkDownload.disabled = false;

        const filtered = getFilteredBrochures();
        const allSelected = filtered.length > 0 && filtered.every(b => selectedFiles.has(b.filename));
        if (selectAllCheckbox) selectAllCheckbox.checked = allSelected;
        if (selectAllTableCheckbox) selectAllTableCheckbox.checked = allSelected;
    }

    function handleFileSelected(file) {
        if (!file) return;
        uploadFile = file;
        dropZone.style.display = 'none';
        selectedFileArea.style.display = 'flex';
        selectedFileName.textContent = file.name;
        selectedFileSize.textContent = formatFileSize(file.size);

        const selectedFileIcon = document.getElementById('selectedFileIcon');
        if (selectedFileIcon) {
            const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            if (ext === '.pdf') {
                selectedFileIcon.className = 'fa-solid fa-file-pdf file-icon-large';
                selectedFileIcon.style.color = '#e63946';
            } else if (ext === '.pptx' || ext === '.ppt') {
                selectedFileIcon.className = 'fa-solid fa-file-powerpoint file-icon-large';
                selectedFileIcon.style.color = '#ff6b00';
            } else {
                selectedFileIcon.className = 'fa-solid fa-file-lines file-icon-large';
                selectedFileIcon.style.color = '#3a86ff';
            }
        }

        if (btnSubmitUpload) {
            btnSubmitUpload.disabled = false;
        }
    }

    function closeUploadModal() {
        uploadModal.classList.remove('active');
        uploadFile = null;
        if (fileInput) fileInput.value = '';
        if (dropZone) dropZone.style.display = 'flex';
        if (selectedFileArea) selectedFileArea.style.display = 'none';
        if (btnSubmitUpload) {
            btnSubmitUpload.disabled = true;
            btnSubmitUpload.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Upload Brochure';
        }
    }

    function setupEventListeners() {
        tabBrochures.addEventListener('click', () => switchTab('brochures'));
        if (tabKtVideos) tabKtVideos.addEventListener('click', () => switchTab('ktVideos'));
        tabDemos.addEventListener('click', () => switchTab('demos'));

        // Direct fallback delegation for tabs in case of touch / nested icon click
        document.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('.main-tab-btn');
            if (tabBtn) {
                if (tabBtn.id === 'tabBrochures') switchTab('brochures');
                else if (tabBtn.id === 'tabKtVideos') switchTab('ktVideos');
                else if (tabBtn.id === 'tabDemos') switchTab('demos');
            }
        });

        if (btnCloseKtModal) btnCloseKtModal.addEventListener('click', closeKtVideoModal);
        if (ktVideoPlayerModal) {
            ktVideoPlayerModal.addEventListener('click', (e) => {
                if (e.target === ktVideoPlayerModal) closeKtVideoModal();
            });
        }

        btnAdminAccess.addEventListener('click', () => {
            if (isAdminLoggedIn) {
                isAdminLoggedIn = false;
                sessionStorage.removeItem('ingenero_admin_token');
                updateAdminNavUI();
                renderBrochures();
                renderDemos();
                showToast('Exited Admin Mode', 'info');
            } else {
                adminLoginModal.classList.add('active');
                adminPasswordInput.value = '';
                adminPasswordInput.focus();
            }
        });

        btnCloseAdminLogin.addEventListener('click', () => adminLoginModal.classList.remove('active'));
        btnCancelAdminLogin.addEventListener('click', () => adminLoginModal.classList.remove('active'));
        btnSubmitAdminLogin.addEventListener('click', handleAdminLogin);

        const btnOpenGitHubToken = document.getElementById('btnOpenGitHubToken');
        if (btnOpenGitHubToken) {
            btnOpenGitHubToken.addEventListener('click', () => {
                if (githubTokenInput) githubTokenInput.value = getGitHubPAT();
                if (githubTokenModal) {
                    githubTokenModal.classList.add('active');
                    if (githubTokenInput) githubTokenInput.focus();
                }
            });
        }

        if (btnCloseGitHubToken) btnCloseGitHubToken.addEventListener('click', () => githubTokenModal.classList.remove('active'));
        if (btnCancelGitHubToken) btnCancelGitHubToken.addEventListener('click', () => githubTokenModal.classList.remove('active'));
        if (btnSaveGitHubToken) {
            btnSaveGitHubToken.addEventListener('click', () => {
                const token = githubTokenInput.value.trim();
                if (token) {
                    saveGitHubPAT(token);
                    githubTokenModal.classList.remove('active');
                    showToast('GitHub Personal Access Token saved! Background Auto-Sync activated.', 'success');
                } else {
                    showToast('Please enter a valid GitHub token', 'error');
                }
            });
        }

        adminPasswordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleAdminLogin();
        });

        btnOpenAddDemo.addEventListener('click', () => {
            activeEditDemoId = null;
            demoModalTitle.innerHTML = '<i class="fa-solid fa-link"></i> Add New Demo Link';
            demoTitleInput.value = '';
            demoUrlInput.value = '';
            demoCategoryInput.value = 'Live Dashboard';
            demoDescInput.value = '';
            demoModal.classList.add('active');
        });

        btnCloseDemoModal.addEventListener('click', () => demoModal.classList.remove('active'));
        btnCancelDemoModal.addEventListener('click', () => demoModal.classList.remove('active'));
        btnSubmitDemo.addEventListener('click', handleSaveDemo);

        // Upload Modal Event Listeners
        if (dropZone) {
            dropZone.addEventListener('click', (e) => {
                if (e.target.closest('#btnRemoveFile')) return;
                if (fileInput) {
                    fileInput.value = '';
                    fileInput.click();
                }
            });

            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });

            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('dragover');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFileSelected(e.dataTransfer.files[0]);
                }
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    handleFileSelected(e.target.files[0]);
                }
            });
        }

        if (btnRemoveFile) {
            btnRemoveFile.addEventListener('click', (e) => {
                e.stopPropagation();
                uploadFile = null;
                if (fileInput) fileInput.value = '';
                dropZone.style.display = 'flex';
                selectedFileArea.style.display = 'none';
                btnSubmitUpload.disabled = true;
            });
        }

        if (btnSubmitUpload) {
            btnSubmitUpload.addEventListener('click', async () => {
                if (!uploadFile) return;

                btnSubmitUpload.disabled = true;
                btnSubmitUpload.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing & Uploading...';

                const formData = new FormData();
                formData.append('file', uploadFile);

                try {
                    const res = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                    });
                    if (res.ok) {
                        const data = await res.json();
                        showToast(data.message, 'success');
                        closeUploadModal();
                        fetchBrochures();
                        return;
                    }
                } catch (err) {
                    console.log('Backend upload route unavailable, rendering client side.');
                }

                // Client-side thumbnail generation using PDF.js
                const ext = uploadFile.name.substring(uploadFile.name.lastIndexOf('.')).toLowerCase();
                const format = ext.replace('.', '').toUpperCase();
                const category = getFileCategory(uploadFile.name);
                const title = uploadFile.name.replace(/\.[^/.]+$/, "").replace(/[_]/g, ' ');
                const fileObjectUrl = URL.createObjectURL(uploadFile);

                let clientThumbUrl = null;
                if (ext === '.pdf') {
                    clientThumbUrl = await generateClientPdfThumbnail(uploadFile);
                }

                const newBrochure = {
                    filename: uploadFile.name,
                    title: title,
                    category: category,
                    format: format,
                    ext: ext,
                    size_formatted: formatFileSize(uploadFile.size),
                    modified_time: Math.floor(Date.now() / 1000),
                    modified_date: 'Just now',
                    thumbnail_url: clientThumbUrl,
                    download_url: `brochures/${uploadFile.name}`,
                    preview_url: `brochures/${uploadFile.name}`
                };

                saveCustomUpload(newBrochure);

                brochures.unshift(newBrochure);
                brochures = filterOutSavedDeletions(brochures);
                categories = sortedCategories(brochures);
                updateStats();
                renderCategoryPills();
                renderBrochures();

                closeUploadModal();

                // Direct GitHub REST API Auto-Commit
                let pat = getGitHubPAT();
                if (!pat) {
                    const tokenPrompt = prompt("GitHub Access Token Required: Enter your GitHub PAT once to automatically save all uploaded files & cover thumbnails directly to GitHub for all visitors worldwide:");
                    if (tokenPrompt && tokenPrompt.trim()) {
                        saveGitHubPAT(tokenPrompt.trim());
                        pat = tokenPrompt.trim();
                    }
                }

                if (pat) {
                    try {
                        showToast(`Saving "${uploadFile.name}" & cover thumbnail directly to GitHub...`, 'info');
                        const fileBase64 = await fileToBase64(uploadFile);
                        const fileUploaded = await syncFileToGitHub(`brochures/${uploadFile.name}`, fileBase64, `Auto-upload brochure ${uploadFile.name}`);
                        
                        if (clientThumbUrl && clientThumbUrl.startsWith('data:image')) {
                            const thumbBase64 = clientThumbUrl.split(',')[1];
                            const thumbStem = uploadFile.name.replace(/\.[^/.]+$/, "");
                            await syncFileToGitHub(`static/thumbnails/${thumbStem}.png`, thumbBase64, `Add thumbnail for ${uploadFile.name}`);
                            newBrochure.thumbnail_url = `static/thumbnails/${thumbStem}.png`;
                        } else {
                            newBrochure.thumbnail_url = `static/thumbnails/${uploadFile.name.replace(/\.[^/.]+$/, "")}.png`;
                        }

                        await syncCatalogToGitHub();

                        if (fileUploaded) {
                            showToast(`Brochure "${uploadFile.name}" & thumbnail saved directly to GitHub! Live for all visitors in ~30s.`, 'success');
                        } else {
                            showToast(`Saved locally. GitHub commit failed (please check PAT repo permissions).`, 'warning');
                        }
                    } catch(e) {
                        console.error('GitHub Direct Commit failed:', e);
                        showToast(`Saved locally. GitHub direct commit error: ${e.message}`, 'error');
                    }
                } else {
                    showToast(`Brochure "${uploadFile.name}" saved locally! Click "Refresh & Sync" to enter your GitHub PAT and enable direct worldwide sync.`, 'info');
                }
            });
        }

        document.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.btn-edit-file');
            if (editBtn) {
                activeTargetFilename = editBtn.dataset.filename;
                const currentItem = brochures.find(b => b.filename === activeTargetFilename);
                renameOriginalInput.value = activeTargetFilename;
                renameNewInput.value = currentItem ? currentItem.title : editBtn.dataset.title;
                adminRenameModal.classList.add('active');
                renameNewInput.focus();
            }

            const deleteBtn = e.target.closest('.btn-delete-file');
            if (deleteBtn) {
                activeTargetFilename = deleteBtn.dataset.filename;
                deleteTargetFilename.textContent = activeTargetFilename;
                adminDeleteModal.classList.add('active');
            }
        });

        btnCloseAdminRename.addEventListener('click', () => adminRenameModal.classList.remove('active'));
        btnCancelAdminRename.addEventListener('click', () => adminRenameModal.classList.remove('active'));
        btnSubmitRename.addEventListener('click', handleAdminRename);

        btnCloseAdminDelete.addEventListener('click', () => adminDeleteModal.classList.remove('active'));
        btnCancelAdminDelete.addEventListener('click', () => adminDeleteModal.classList.remove('active'));
        btnConfirmDelete.addEventListener('click', handleAdminDelete);

        categoryPillsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('pill-btn')) {
                activeCategory = e.target.dataset.category;
                renderCategoryPills();
                renderBrochures();
            }
        });

        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            btnClearSearch.style.display = searchQuery ? 'block' : 'none';
            renderBrochures();
        });

        btnClearSearch.addEventListener('click', () => {
            searchInput.value = '';
            searchQuery = '';
            btnClearSearch.style.display = 'none';
            renderBrochures();
        });

        formatFilter.addEventListener('change', (e) => {
            activeFormat = e.target.value;
            renderBrochures();
        });

        sortSelect.addEventListener('change', (e) => {
            sortBy = e.target.value;
            renderBrochures();
        });

        btnGridView.addEventListener('click', () => {
            currentView = 'grid';
            btnGridView.classList.add('active');
            btnListView.classList.remove('active');
            renderBrochures();
        });

        btnListView.addEventListener('click', () => {
            currentView = 'list';
            btnListView.classList.add('active');
            btnGridView.classList.remove('active');
            renderBrochures();
        });

        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('file-checkbox')) {
                const fname = e.target.dataset.filename;
                if (e.target.checked) selectedFiles.add(fname);
                else selectedFiles.delete(fname);
                renderBrochures();
            }
        });

        if (selectAllCheckbox) selectAllCheckbox.addEventListener('change', (e) => toggleSelectAll(e.target.checked));
        if (selectAllTableCheckbox) selectAllTableCheckbox.addEventListener('change', (e) => toggleSelectAll(e.target.checked));

        if (btnToggleSelectAll) {
            btnToggleSelectAll.addEventListener('click', () => {
                const filtered = getFilteredBrochures();
                const allSelected = filtered.length > 0 && filtered.every(b => selectedFiles.has(b.filename));
                toggleSelectAll(!allSelected);
            });
        }

        function toggleSelectAll(checked) {
            const filtered = getFilteredBrochures();
            filtered.forEach(b => {
                if (checked) selectedFiles.add(b.filename);
                else selectedFiles.delete(b.filename);
            });
            renderBrochures();
        }

        document.addEventListener('click', (e) => {
            const previewBtn = e.target.closest('.btn-preview');
            if (previewBtn) {
                openPreview(previewBtn.dataset.filename, previewBtn.dataset.title, previewBtn.dataset.preview, previewBtn.dataset.format);
            }
        });

        btnSync.addEventListener('click', async () => {
            btnSync.querySelector('i').classList.add('fa-spin');
            await fetchBrochures(true);
            await fetchDemos();
            
            const pat = getGitHubPAT();
            if (!pat) {
                if (githubTokenInput) githubTokenInput.value = '';
                if (githubTokenModal) githubTokenModal.classList.add('active');
            }
            
            setTimeout(() => btnSync.querySelector('i').classList.remove('fa-spin'), 500);
        });

        btnBulkDownload.addEventListener('click', downloadSelectedZIP);
        btnDownloadSelected.addEventListener('click', downloadSelectedZIP);
        btnDownloadAll.addEventListener('click', downloadAllZIP);

        document.getElementById('btnResetFilters')?.addEventListener('click', () => {
            activeCategory = 'ALL';
            activeFormat = 'ALL';
            searchQuery = '';
            searchInput.value = '';
            formatFilter.value = 'ALL';
            sortSelect.value = 'newest';
            renderCategoryPills();
            renderBrochures();
        });

        btnOpenUpload.addEventListener('click', () => uploadModal.classList.add('active'));
        btnCloseUpload.addEventListener('click', closeUploadModal);
        btnCancelUpload.addEventListener('click', closeUploadModal);

        btnClosePreview.addEventListener('click', () => {
            previewModal.classList.remove('active');
            previewIframe.src = '';
        });
    }

    async function handleAdminLogin() {
        const password = adminPasswordInput.value;
        if (password === 'ingenero360') {
            isAdminLoggedIn = true;
            sessionStorage.setItem('ingenero_admin_token', 'ADMIN_AUTH_VALID');
            updateAdminNavUI();
            adminLoginModal.classList.remove('active');
            renderBrochures();
            renderDemos();
            showToast('Admin Mode unlocked successfully!', 'success');
        } else {
            showToast('Incorrect admin password', 'error');
        }
    }

    async function handleAdminRename() {
        const newTitle = renameNewInput.value.trim();
        if (!newTitle || !activeTargetFilename) return;

        saveCustomTitle(activeTargetFilename, newTitle);

        try {
            const res = await fetch('/api/admin/rename', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ old_filename: activeTargetFilename, new_filename: newTitle })
            });
            if (res.ok) {
                const data = await res.json();
                showToast(data.message, 'success');
                adminRenameModal.classList.remove('active');
                fetchBrochures();
                return;
            }
        } catch (err) {
            console.log('Backend API unavailable, updating local client state.');
        }

        const item = brochures.find(b => b.filename === activeTargetFilename);
        if (item) {
            item.title = newTitle;
            item.category = getFileCategory(newTitle);
            saveCustomUpload(item);
            categories = sortedCategories(brochures);
            updateStats();
            renderCategoryPills();
            renderBrochures();
            adminRenameModal.classList.remove('active');
            
            if (getGitHubPAT()) {
                syncCatalogToGitHub();
                showToast(`Title modified and synced to GitHub!`, 'success');
            } else {
                showToast(`Brochure title modified & product tag updated to "${item.category}"`, 'success');
            }
        }
    }

    async function handleAdminDelete() {
        if (!activeTargetFilename) return;

        saveCustomDeletion(activeTargetFilename);

        try {
            const res = await fetch(`/api/delete/${encodeURIComponent(activeTargetFilename)}`, { method: 'DELETE' });
            if (res.ok) {
                const data = await res.json();
                showToast(data.message, 'success');
                adminDeleteModal.classList.remove('active');
                fetchBrochures();
                return;
            }
        } catch (err) {
            console.log('Backend delete route unavailable, updating local client state.');
        }

        const filenameToDelete = activeTargetFilename;
        brochures = brochures.filter(b => b.filename !== filenameToDelete);
        brochures = filterOutSavedDeletions(brochures);
        selectedFiles.delete(filenameToDelete);

        categories = sortedCategories(brochures);
        updateStats();
        renderCategoryPills();
        renderBrochures();
        adminDeleteModal.classList.remove('active');
        showToast('Brochure removed.', 'success');

        if (getGitHubPAT()) {
            deleteFileFromGitHub(`brochures/${filenameToDelete}`, `Delete brochure ${filenameToDelete}`);
            const stem = filenameToDelete.replace(/\.[^/.]+$/, "");
            deleteFileFromGitHub(`static/thumbnails/${stem}.png`, `Delete thumbnail for ${filenameToDelete}`);
            syncCatalogToGitHub();
            showToast('Brochure and catalog deletion synced directly to GitHub!', 'success');
        }
    }

    async function handleSaveDemo() {
        const title = demoTitleInput.value.trim();
        const url = demoUrlInput.value.trim();
        const category = demoCategoryInput.value;
        const description = demoDescInput.value.trim();

        if (!title || !url) {
            showToast('Title and URL are required', 'error');
            return;
        }

        const newDemo = { id: `demo-${Date.now()}`, title, url, category, description };
        demos.push(newDemo);
        renderDemos();
        demoModal.classList.remove('active');
        showToast('Demo link added!', 'success');

        if (getGitHubPAT()) {
            const demosBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(demos, null, 2))));
            syncFileToGitHub('demos.json', demosBase64, `Add demo link: ${title}`);
        }
    }

    function openPreview(filename, title, previewUrl, format) {
        previewTitle.innerHTML = `<i class="fa-solid ${format === 'PDF' ? 'fa-file-pdf' : 'fa-file-powerpoint'}"></i> ${title}`;
        
        const brochureItem = brochures.find(b => b.filename === filename);
        const actualPreviewUrl = (brochureItem && brochureItem.preview_url) ? brochureItem.preview_url : previewUrl;
        const actualDownloadUrl = (brochureItem && brochureItem.download_url) ? brochureItem.download_url : previewUrl;

        btnOpenNewTab.href = actualPreviewUrl;
        btnDownloadPreview.href = actualDownloadUrl;

        if (format === 'PDF') {
            previewIframe.src = actualPreviewUrl;
        } else {
            previewIframe.srcdoc = `
                <html>
                <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #090b0e; color: #fff;">
                    <h2 style="color:#ff6b00;">PowerPoint Presentation (.pptx)</h2>
                    <p>Click below to download or view presentation directly.</p>
                    <br>
                    <a href="${actualDownloadUrl}" download style="padding: 10px 20px; background: #ff6b00; color: white; border-radius: 6px; text-decoration: none; font-weight: bold;">
                        Download ${filename}
                    </a>
                </body>
                </html>
            `;
        }

        previewModal.classList.add('active');
    }

    function downloadSelectedZIP() {
        const filesToDownload = Array.from(selectedFiles);
        const targetList = filesToDownload.length > 0 ? filesToDownload : brochures.map(b => b.filename);
        
        targetList.forEach(fname => {
            const item = brochures.find(b => b.filename === fname);
            if (item) {
                const a = document.createElement('a');
                a.href = item.download_url;
                a.download = fname;
                document.body.appendChild(a);
                a.click();
                a.remove();
            }
        });
        showToast(`Downloaded ${targetList.length} brochure file(s).`, 'success');
    }

    function downloadAllZIP() {
        brochures.forEach(item => {
            const a = document.createElement('a');
            a.href = item.download_url;
            a.download = item.filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
        });
        showToast('Downloaded all brochure files.', 'success');
    }

    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'fa-circle-info';
        if (type === 'success') icon = 'fa-circle-check';
        if (type === 'error') icon = 'fa-triangle-exclamation';

        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
});
