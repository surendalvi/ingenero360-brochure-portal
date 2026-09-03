/**
 * IngeneroX360AI Suite Brochure & Demos Portal JavaScript App
 */

document.addEventListener('DOMContentLoaded', () => {
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
    let activeMainTab = 'brochures'; // 'brochures' or 'demos'
    let uploadFile = null;
    let autoSyncTimer = null;
    let isAdminLoggedIn = sessionStorage.getItem('ingenero_admin_token') === 'ADMIN_AUTH_VALID';

    // Target tracking for edit/delete actions
    let activeTargetFilename = null;
    let activeEditDemoId = null;

    // DOM Elements - Main Tabs & Containers
    const tabBrochures = document.getElementById('tabBrochures');
    const tabDemos = document.getElementById('tabDemos');
    const brochuresSection = document.getElementById('brochuresSection');
    const demosSection = document.getElementById('demosSection');
    const demosGrid = document.getElementById('demosGrid');

    // DOM Elements - Brochure Section
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

    // Admin UI Elements
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

    // Demo Modal Elements
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

    // Upload & Preview Modals
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
    const uploadProgressContainer = document.getElementById('uploadProgressContainer');

    const previewModal = document.getElementById('previewModal');
    const btnClosePreview = document.getElementById('btnClosePreview');
    const previewTitle = document.getElementById('previewTitle');
    const previewIframe = document.getElementById('previewIframe');
    const btnOpenNewTab = document.getElementById('btnOpenNewTab');
    const btnDownloadPreview = document.getElementById('btnDownloadPreview');

    // Initialize App
    init();

    function init() {
        updateAdminNavUI();
        fetchBrochures();
        fetchDemos();
        setupEventListeners();
        startAutoSync();
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

    // Main Tab Switching
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

    // Fetch Brochures from API
    async function fetchBrochures(showToastNotification = false) {
        try {
            const res = await fetch('/api/brochures');
            if (!res.ok) throw new Error('Failed to load brochures');
            const data = await res.json();
            
            if (data.status === 'success') {
                brochures = data.brochures;
                categories = data.categories;
                updateStats();
                renderCategoryPills();
                renderBrochures();
                
                if (showToastNotification) {
                    showToast('Portal refreshed successfully.', 'success');
                }
            }
        } catch (err) {
            console.error('Error fetching brochures:', err);
            showToast('Unable to connect to portal server.', 'error');
        }
    }

    // Fetch Demos from API
    async function fetchDemos() {
        try {
            const res = await fetch('/api/demos');
            if (!res.ok) throw new Error('Failed to load demo links');
            const data = await res.json();
            
            if (data.status === 'success') {
                demos = data.demos;
                renderDemos();
            }
        } catch (err) {
            console.error('Error fetching demos:', err);
        }
    }

    // Auto-Sync Polling every 10 seconds
    function startAutoSync() {
        if (autoSyncTimer) clearInterval(autoSyncTimer);
        autoSyncTimer = setInterval(() => {
            fetchBrochures(false);
            if (activeMainTab === 'demos') fetchDemos();
        }, 10000);
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
            if (activeCategory !== 'ALL' && item.category !== activeCategory) {
                return false;
            }
            if (activeFormat !== 'ALL' && item.format !== activeFormat) {
                return false;
            }
            if (searchQuery.trim() !== '') {
                const q = searchQuery.toLowerCase();
                const matchTitle = item.title.toLowerCase().includes(q);
                const matchFilename = item.filename.toLowerCase().includes(q);
                const matchCategory = item.category.toLowerCase().includes(q);
                const matchFormat = item.format.toLowerCase().includes(q);
                if (!matchTitle && !matchFilename && !matchCategory && !matchFormat) {
                    return false;
                }
            }
            return true;
        }).sort((a, b) => {
            if (sortBy === 'newest') {
                return b.modified_time - a.modified_time;
            } else if (sortBy === 'title_asc') {
                return a.title.localeCompare(b.title);
            } else if (sortBy === 'size_desc') {
                return b.size - a.size;
            }
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
                            <span class="card-category-tag">${item.category}</span>
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

    // Render Demos Cards
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

    function setupEventListeners() {
        // Main Tab Clicks
        tabBrochures.addEventListener('click', () => switchTab('brochures'));
        tabDemos.addEventListener('click', () => switchTab('demos'));

        // Admin Access Button
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

        // Demo Modal Actions
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

        // Edit/Delete Demo Actions (Event Delegation)
        demosGrid.addEventListener('click', (e) => {
            const editDemoBtn = e.target.closest('.btn-edit-demo');
            if (editDemoBtn) {
                const id = editDemoBtn.dataset.id;
                const targetDemo = demos.find(d => d.id === id);
                if (targetDemo) {
                    activeEditDemoId = id;
                    demoModalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Demo Link';
                    demoTitleInput.value = targetDemo.title;
                    demoUrlInput.value = targetDemo.url;
                    demoCategoryInput.value = targetDemo.category;
                    demoDescInput.value = targetDemo.description || '';
                    demoModal.classList.add('active');
                }
            }

            const deleteDemoBtn = e.target.closest('.btn-delete-demo');
            if (deleteDemoBtn) {
                const id = deleteDemoBtn.dataset.id;
                if (confirm('Are you sure you want to delete this demo link?')) {
                    handleDeleteDemo(id);
                }
            }
        });

        document.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.btn-edit-file');
            if (editBtn) {
                activeTargetFilename = editBtn.dataset.filename;
                renameOriginalInput.value = activeTargetFilename;
                renameNewInput.value = activeTargetFilename;
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
                if (e.target.checked) {
                    selectedFiles.add(fname);
                } else {
                    selectedFiles.delete(fname);
                }
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
            try {
                await fetch('/api/git-sync', { method: 'POST' });
            } catch (err) {
                console.log('Git sync error', err);
            }
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

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) handleFileSelected(e.dataTransfer.files[0]);
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) handleFileSelected(e.target.files[0]);
        });

        btnRemoveFile.addEventListener('click', () => {
            uploadFile = null;
            selectedFileArea.style.display = 'none';
            dropZone.style.display = 'flex';
            btnSubmitUpload.disabled = true;
            fileInput.value = '';
        });

        btnSubmitUpload.addEventListener('click', uploadSelectedFile);

        btnClosePreview.addEventListener('click', () => {
            previewModal.classList.remove('active');
            previewIframe.src = '';
        });
    }

    async function handleAdminLogin() {
        const password = adminPasswordInput.value;
        if (!password) return;

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await res.json();

            if (res.ok && data.status === 'success') {
                isAdminLoggedIn = true;
                sessionStorage.setItem('ingenero_admin_token', 'ADMIN_AUTH_VALID');
                updateAdminNavUI();
                adminLoginModal.classList.remove('active');
                renderBrochures();
                renderDemos();
                showToast('Admin Mode unlocked successfully!', 'success');
            } else {
                showToast(data.message || 'Incorrect password', 'error');
            }
        } catch (err) {
            showToast('Error authenticating admin access', 'error');
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

        const endpoint = activeEditDemoId ? '/api/demos/edit' : '/api/demos/add';
        const payload = activeEditDemoId ? 
            { id: activeEditDemoId, title, url, category, description } :
            { title, url, category, description };

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok && data.status === 'success') {
                showToast(data.message, 'success');
                demoModal.classList.remove('active');
                fetchDemos();
            } else {
                showToast(data.message || 'Failed to save demo link', 'error');
            }
        } catch (err) {
            showToast('Error saving demo link', 'error');
        }
    }

    async function handleDeleteDemo(id) {
        try {
            const res = await fetch(`/api/demos/delete/${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (res.ok && data.status === 'success') {
                showToast(data.message, 'success');
                fetchDemos();
            } else {
                showToast(data.message || 'Failed to delete demo link', 'error');
            }
        } catch (err) {
            showToast('Error deleting demo link', 'error');
        }
    }

    async function handleAdminRename() {
        const newName = renameNewInput.value.trim();
        if (!newName || !activeTargetFilename) return;

        try {
            const res = await fetch('/api/admin/rename', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ old_filename: activeTargetFilename, new_filename: newName })
            });
            const data = await res.json();

            if (res.ok && data.status === 'success') {
                showToast(data.message, 'success');
                adminRenameModal.classList.remove('active');
                fetchBrochures();
            } else {
                showToast(data.message || 'Rename failed', 'error');
            }
        } catch (err) {
            showToast('Failed to rename brochure', 'error');
        }
    }

    async function handleAdminDelete() {
        if (!activeTargetFilename) return;

        try {
            const res = await fetch(`/api/delete/${encodeURIComponent(activeTargetFilename)}`, {
                method: 'DELETE'
            });
            const data = await res.json();

            if (res.ok && data.status === 'success') {
                selectedFiles.delete(activeTargetFilename);
                showToast(data.message, 'success');
                adminDeleteModal.classList.remove('active');
                fetchBrochures();
            } else {
                showToast(data.message || 'Delete failed', 'error');
            }
        } catch (err) {
            showToast('Failed to delete brochure', 'error');
        }
    }

    function openPreview(filename, title, previewUrl, format) {
        previewTitle.innerHTML = `<i class="fa-solid ${format === 'PDF' ? 'fa-file-pdf' : 'fa-file-powerpoint'}"></i> ${title}`;
        btnOpenNewTab.href = previewUrl;
        btnDownloadPreview.href = `/download/${filename}`;

        if (format === 'PDF') {
            previewIframe.src = previewUrl;
        } else {
            previewIframe.srcdoc = `
                <html>
                <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: #fff;">
                    <h2>PowerPoint Presentation (.pptx)</h2>
                    <p>In-browser preview is available for PDF files. Click below to download directly.</p>
                    <br>
                    <a href="/download/${filename}" style="padding: 10px 20px; background: #ea580c; color: white; border-radius: 6px; text-decoration: none; font-weight: bold;">
                        Download ${filename}
                    </a>
                </body>
                </html>
            `;
        }

        previewModal.classList.add('active');
    }

    function handleFileSelected(file) {
        uploadFile = file;
        selectedFileName.textContent = file.name;
        selectedFileSize.textContent = formatBytes(file.size);
        
        dropZone.style.display = 'none';
        selectedFileArea.style.display = 'flex';
        btnSubmitUpload.disabled = false;
    }

    async function uploadSelectedFile() {
        if (!uploadFile) return;

        const formData = new FormData();
        formData.append('file', uploadFile);

        uploadProgressContainer.style.display = 'block';
        btnSubmitUpload.disabled = true;

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (res.ok && data.status === 'success') {
                showToast(data.message, 'success');
                closeUploadModal();
                fetchBrochures();
            } else {
                showToast(data.message || 'Upload failed', 'error');
            }
        } catch (err) {
            showToast('Error uploading brochure file', 'error');
        } finally {
            uploadProgressContainer.style.display = 'none';
        }
    }

    function closeUploadModal() {
        uploadModal.classList.remove('active');
        uploadFile = null;
        selectedFileArea.style.display = 'none';
        dropZone.style.display = 'flex';
        btnSubmitUpload.disabled = true;
        fileInput.value = '';
    }

    async function downloadSelectedZIP() {
        const filesToDownload = Array.from(selectedFiles);
        
        showToast('Preparing ZIP download bundle...', 'info');

        try {
            const res = await fetch('/api/download-zip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filenames: filesToDownload })
            });

            if (!res.ok) throw new Error('ZIP generation failed');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filesToDownload.length > 0 ? `ingeneroX360AI_Selected_Brochures_${Date.now()}.zip` : `ingeneroX360AI_All_Brochures_${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            showToast('Failed to generate ZIP archive.', 'error');
        }
    }

    async function downloadAllZIP() {
        showToast('Preparing full brochure ZIP bundle...', 'info');
        try {
            const res = await fetch('/api/download-zip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filenames: [] })
            });

            if (!res.ok) throw new Error('ZIP generation failed');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ingeneroX360AI_All_Brochures_${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            showToast('Failed to download ZIP bundle.', 'error');
        }
    }

    function formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
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
