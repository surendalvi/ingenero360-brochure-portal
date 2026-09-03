/**
 * IngeneroX360AI Suite Brochure & Demos Portal JavaScript App
 * Supports both Flask Server API and GitHub Pages Static Hosting via brochures.json & demos.json
 */

document.addEventListener('DOMContentLoaded', () => {
    const PRODUCT_CATEGORIES = [
        'CDUX360', 'CokerX360', 'EnergyX360', 'OutlierX360', 
        'ReliabilityX360', 'VDUX360', 'controllerX360', 
        'furnaceX360', 'genX360', 'maintenanceX360'
    ];

    const LOCAL_RENAMES_KEY = 'ingenero_custom_titles';
    const LOCAL_UPLOADS_KEY = 'ingenero_custom_uploads';

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

    function getFileCategory(nameString) {
        if (!nameString) return 'Other Products';
        const strUpper = nameString.toUpperCase();
        for (const cat of PRODUCT_CATEGORIES) {
            if (strUpper.includes(cat.toUpperCase())) {
                return cat;
            }
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
        { filename: 'cduX360.pdf', title: 'cduX360 Brochure', category: 'CDUX360', format: 'PDF', ext: '.pdf', size_formatted: '604.7 KB', modified_time: 1725148800, modified_date: 'Sep 01, 2026', thumbnail_url: 'static/thumbnails/cduX360.png', download_url: 'brochures/cduX360.pdf', preview_url: 'brochures/cduX360.pdf' },
        { filename: 'cokerX360.pdf', title: 'CokerX360 Brochure', category: 'CokerX360', format: 'PDF', ext: '.pdf', size_formatted: '826.1 KB', modified_time: 1725148800, modified_date: 'Sep 01, 2026', thumbnail_url: 'static/thumbnails/cokerX360.png', download_url: 'brochures/cokerX360.pdf', preview_url: 'brochures/cokerX360.pdf' },
        { filename: 'controllerX360.pdf', title: 'controllerX360 Details', category: 'controllerX360', format: 'PDF', ext: '.pdf', size_formatted: '450.0 KB', modified_time: 1725148800, modified_date: 'Sep 01, 2026', thumbnail_url: 'static/thumbnails/controllerX360.png', download_url: 'brochures/controllerX360.pdf', preview_url: 'brochures/controllerX360.pdf' },
        { filename: 'energyX360.pdf', title: 'EnergyX360 Brochure', category: 'EnergyX360', format: 'PDF', ext: '.pdf', size_formatted: '731.5 KB', modified_time: 1725148800, modified_date: 'Sep 01, 2026', thumbnail_url: 'static/thumbnails/energyX360.png', download_url: 'brochures/energyX360.pdf', preview_url: 'brochures/energyX360.pdf' },
        { filename: 'furnaceX360.pptx', title: 'furnaceX360 Presentation', category: 'furnaceX360', format: 'PPTX', ext: '.pptx', size_formatted: '604.7 KB', modified_time: 1725148800, modified_date: 'Sep 01, 2026', thumbnail_url: null, download_url: 'brochures/furnaceX360.pptx', preview_url: 'brochures/furnaceX360.pptx' },
        { filename: 'genX360.pdf', title: 'genX360 Brochure', category: 'genX360', format: 'PDF', ext: '.pdf', size_formatted: '162.7 KB', modified_time: 1725148800, modified_date: 'Sep 01, 2026', thumbnail_url: 'static/thumbnails/genX360.png', download_url: 'brochures/genX360.pdf', preview_url: 'brochures/genX360.pdf' },
        { filename: 'maintenanceX360.pdf', title: 'maintenanceX360 Brochure', category: 'maintenanceX360', format: 'PDF', ext: '.pdf', size_formatted: '520.0 KB', modified_time: 1725148800, modified_date: 'Sep 01, 2026', thumbnail_url: 'static/thumbnails/maintenanceX360.png', download_url: 'brochures/maintenanceX360.pdf', preview_url: 'brochures/maintenanceX360.pdf' },
        { filename: 'outlierX360.pdf', title: 'OutlierX360 One Pager', category: 'OutlierX360', format: 'PDF', ext: '.pdf', size_formatted: '162.7 KB', modified_time: 1725148800, modified_date: 'Sep 01, 2026', thumbnail_url: 'static/thumbnails/outlierX360.png', download_url: 'brochures/outlierX360.pdf', preview_url: 'brochures/outlierX360.pdf' },
        { filename: 'outlierX360_new.pdf', title: 'outlierX360 Final', category: 'OutlierX360', format: 'PDF', ext: '.pdf', size_formatted: '380.0 KB', modified_time: 1725148800, modified_date: 'Sep 01, 2026', thumbnail_url: 'static/thumbnails/outlierX360_new.png', download_url: 'brochures/outlierX360_new.pdf', preview_url: 'brochures/outlierX360_new.pdf' },
        { filename: 'reliabilityX360.pptx', title: 'ReliabilityX360 Presentation', category: 'ReliabilityX360', format: 'PPTX', ext: '.pptx', size_formatted: '751.1 KB', modified_time: 1725148800, modified_date: 'Sep 01, 2026', thumbnail_url: null, download_url: 'brochures/reliabilityX360.pptx', preview_url: 'brochures/reliabilityX360.pptx' },
        { filename: 'vduX360.pdf', title: 'VDUX360 Brochure', category: 'VDUX360', format: 'PDF', ext: '.pdf', size_formatted: '736.7 KB', modified_time: 1725148800, modified_date: 'Sep 01, 2026', thumbnail_url: 'static/thumbnails/vduX360.png', download_url: 'brochures/vduX360.pdf', preview_url: 'brochures/vduX360.pdf' }
    ];

    // App State
    let brochures = [];
    let categories = [];
    let demos = [];
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
    const tabDemos = document.getElementById('tabDemos');
    const brochuresSection = document.getElementById('brochuresSection');
    const demosSection = document.getElementById('demosSection');
    const demosGrid = document.getElementById('demosGrid');

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
        if (tabName === 'brochures') {
            tabBrochures.classList.add('active');
            tabDemos.classList.remove('active');
            brochuresSection.style.display = 'block';
            demosSection.style.display = 'none';
        } else {
            tabDemos.classList.add('active');
            tabBrochures.classList.remove('active');
            brochuresSection.style.display = 'none';
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
            categories = sortedCategories(brochures);
            updateStats();
            renderCategoryPills();
            renderBrochures();
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

    function renderCategoryPills() {
        let pillsHTML = `<button class="pill-btn ${activeCategory === 'ALL' ? 'active' : ''}" data-category="ALL">All Products</button>`;
        categories.forEach(cat => {
            const isActive = activeCategory === cat ? 'active' : '';
            pillsHTML += `<button class="pill-btn ${isActive}" data-category="${cat}">${cat}</button>`;
        });
        categoryPillsContainer.innerHTML = pillsHTML;
    }

    function getFilteredBrochures() {
        return brochures.filter(item => {
            if (activeCategory !== 'ALL' && item.category !== activeCategory) return false;
            if (activeFormat !== 'ALL' && item.format !== activeFormat) return false;
            if (searchQuery.trim() !== '') {
                const q = searchQuery.toLowerCase();
                const matchTitle = item.title.toLowerCase().includes(q);
                const matchFilename = item.filename.toLowerCase().includes(q);
                const matchCategory = item.category.toLowerCase().includes(q);
                const matchFormat = item.format.toLowerCase().includes(q);
                if (!matchTitle && !matchFilename && !matchCategory && !matchFormat) return false;
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
            
            let thumbHTML = '';
            if (item.thumbnail_url) {
                thumbHTML = `<img src="${item.thumbnail_url}" alt="${item.title}" class="card-thumb-img" loading="lazy">`;
            } else {
                const iconClass = item.format === 'PDF' ? 'pdf-icon' : 'pptx-icon';
                const faIcon = item.format === 'PDF' ? 'fa-file-pdf' : 'fa-file-powerpoint';
                thumbHTML = `
                    <div class="thumb-fallback ${iconClass}">
                        <i class="fa-solid ${faIcon}"></i>
                        <span>${item.format} Document</span>
                    </div>`;
            }

            const titleLower = (item.title || '').toLowerCase();
            const catLower = (item.category || '').toLowerCase();
            const isRedundantCategory = catLower === 'other products' || titleLower.includes(catLower) || catLower.includes(titleLower);
            const categoryTagHTML = isRedundantCategory ? '' : `<span class="card-category-tag">${item.category}</span>`;

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

            let thumbHTML = '';
            if (item.thumbnail_url) {
                thumbHTML = `<img src="${item.thumbnail_url}" class="table-thumb" alt="thumb">`;
            } else {
                const faIcon = item.format === 'PDF' ? 'fa-file-pdf' : 'fa-file-powerpoint';
                const iconColor = item.format === 'PDF' ? 'var(--pdf-red)' : 'var(--pptx-orange)';
                thumbHTML = `<div class="table-thumb-fallback" style="color: ${iconColor}"><i class="fa-solid ${faIcon}"></i></div>`;
            }

            const adminActions = isAdminLoggedIn ? `
                <button class="btn btn-sm btn-warning btn-edit-file" data-filename="${item.filename}" data-title="${item.title}" title="Modify File">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn btn-sm btn-danger btn-delete-file" data-filename="${item.filename}" title="Delete File">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            ` : '';

            return `
                <tr data-filename="${item.filename}">
                    <td>
                        <label class="checkbox-container">
                            <input type="checkbox" class="file-checkbox" data-filename="${item.filename}" ${isChecked ? 'checked' : ''}>
                            <span class="checkmark"></span>
                        </label>
                    </td>
                    <td>${thumbHTML}</td>
                    <td><strong>${item.title}</strong></td>
                    <td><span class="card-category-tag">${item.category}</span></td>
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
        btnSubmitUpload.disabled = false;
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
        tabDemos.addEventListener('click', () => switchTab('demos'));

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
                if (fileInput) fileInput.click();
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
                    download_url: fileObjectUrl,
                    preview_url: fileObjectUrl
                };

                // Save persistently to browser storage so it NEVER disappears on refresh
                saveCustomUpload(newBrochure);

                brochures.unshift(newBrochure);
                categories = sortedCategories(brochures);
                updateStats();
                renderCategoryPills();
                renderBrochures();

                closeUploadModal();
                showToast(`Brochure "${uploadFile.name}" uploaded and saved permanently!`, 'success');
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
            fetchBrochures(true);
            fetchDemos();
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

        // Save persistently to browser localStorage
        saveCustomTitle(activeTargetFilename, newTitle);

        // Try Flask backend API if live
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

        // Apply immediately to current memory list
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
            showToast(`Brochure title modified & product tag updated to "${item.category}"`, 'success');
        }
    }

    async function handleAdminDelete() {
        if (!activeTargetFilename) return;

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

        brochures = brochures.filter(b => b.filename !== activeTargetFilename);
        selectedFiles.delete(activeTargetFilename);
        
        // Remove from local persistent uploads
        const uploads = getSavedCustomUploads().filter(u => u.filename !== activeTargetFilename);
        localStorage.setItem(LOCAL_UPLOADS_KEY, JSON.stringify(uploads));

        categories = sortedCategories(brochures);
        updateStats();
        renderCategoryPills();
        renderBrochures();
        adminDeleteModal.classList.remove('active');
        showToast('Brochure removed.', 'success');
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
    }

    function openPreview(filename, title, previewUrl, format) {
        previewTitle.innerHTML = `<i class="fa-solid ${format === 'PDF' ? 'fa-file-pdf' : 'fa-file-powerpoint'}"></i> ${title}`;
        btnOpenNewTab.href = previewUrl;
        btnDownloadPreview.href = previewUrl;

        if (format === 'PDF') {
            previewIframe.src = previewUrl;
        } else {
            previewIframe.srcdoc = `
                <html>
                <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #090b0e; color: #fff;">
                    <h2 style="color:#ff6b00;">PowerPoint Presentation (.pptx)</h2>
                    <p>Click below to download or view presentation directly.</p>
                    <br>
                    <a href="${previewUrl}" download style="padding: 10px 20px; background: #ff6b00; color: white; border-radius: 6px; text-decoration: none; font-weight: bold;">
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
