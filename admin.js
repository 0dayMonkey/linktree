document.addEventListener('DOMContentLoaded', () => {
    // STATE MANAGEMENT
    let state = {};

    // DOM ELEMENTS
    const profilePicUrlInput = document.getElementById('profile-pic-url');
    const profileTitleInput = document.getElementById('profile-title');
    const themeSelector = document.getElementById('theme-selector');
    const linksEditorList = document.getElementById('links-editor-list');
    const socialsEditorList = document.getElementById('socials-editor-list');
    const addLinkBtn = document.getElementById('add-link-btn');
    const addSocialBtn = document.getElementById('add-social-btn');
    const previewFrame = document.getElementById('preview-frame');

    // DATA STRUCTURE & DEFAULTS
    const defaultData = {
        theme: 'light-theme',
        profile: { pictureUrl: "", title: "" },
        links: [],
        socials: []
    };

    /**
     * Sends the current state to the preview iframe.
     */
    function postStateToPreview() {
        previewFrame.contentWindow.postMessage({
            type: 'update',
            payload: state
        }, window.location.origin);
    }
    
    /**
     * Loads data, saves it, and updates the preview.
     */
    function saveAndPreview() {
        localStorage.setItem('linktreeData', JSON.stringify(state));
        postStateToPreview();
    }

    /**
     * Loads data from localStorage, merging with existing click counts.
     */
    function loadData() {
        const savedData = localStorage.getItem('linktreeData');
        state = savedData ? JSON.parse(savedData) : JSON.parse(JSON.stringify(defaultData));
    }

    /** Renders all editor components based on state. */
    function render() {
        profilePicUrlInput.value = state.profile.pictureUrl || '';
        profileTitleInput.value = state.profile.title || '';
        document.querySelector(`input[name="theme"][value="${state.theme}"]`).checked = true;
        renderList(socialsEditorList, state.socials, createSocialItemHTML);
        renderList(linksEditorList, state.links, createLinkItemHTML);
    }

    function renderList(container, items, htmlFactory) {
        container.innerHTML = '';
        items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.dataset.id = item.id;
            itemEl.innerHTML = htmlFactory(item);
            container.appendChild(itemEl);
        });
    }

    function createSocialItemHTML(item) {
        return `
            <div class="social-item">
                <div class="item-content">
                    <div class="form-group">
                        <label>URL</label>
                        <input type="text" class="social-url-input" value="${item.url}" placeholder="https://twitter.com/your-name">
                    </div>
                    <button class="btn btn-danger delete-btn">Delete Social</button>
                </div>
            </div>`;
    }

    function createLinkItemHTML(item) {
        return `
            <div class="link-item" draggable="true">
                <div class="drag-handle">☰</div>
                <div class="item-content">
                    <div class="item-header">
                        <span class="analytics-display">📊 Clicks: ${item.clicks || 0}</span>
                        <button class="btn btn-danger delete-btn">Delete</button>
                    </div>
                    <div class="form-group">
                        <label>Title</label>
                        <input type="text" class="link-title-input" value="${item.title}">
                    </div>
                    <div class="form-group">
                        <label>URL</label>
                        <input type="text" class="link-url-input" value="${item.url}">
                    </div>
                    <div class="form-group">
                        <label>Thumbnail URL (Optional)</label>
                        <input type="text" class="link-thumbnail-input" value="${item.thumbnailUrl || ''}" placeholder="https://example.com/image.png">
                    </div>
                </div>
            </div>`;
    }

    function detectSocialNetwork(url) {
        const networks = ['twitter', 'github', 'linkedin', 'instagram', 'youtube'];
        try {
            const hostname = new URL(url).hostname;
            return networks.find(net => hostname.includes(net)) || 'website';
        } catch {
            return 'website';
        }
    }

    // --- EVENT HANDLERS ---
    function handleGenericUpdate(e, listName, key) {
        const itemEl = e.target.closest('[data-id]');
        if (!itemEl) return;
        const itemId = parseInt(itemEl.dataset.id);
        const item = state[listName].find(i => i.id === itemId);
        if (item) {
            item[key] = e.target.value;
            if(listName === 'socials' && key === 'url') {
                item.network = detectSocialNetwork(e.target.value);
            }
            saveAndPreview();
        }
    }

    function handleGenericDelete(e, listName) {
        if (e.target.classList.contains('delete-btn')) {
            const itemEl = e.target.closest('[data-id]');
            const itemId = parseInt(itemEl.dataset.id);
            state[listName] = state[listName].filter(i => i.id !== itemId);
            render();
            saveAndPreview();
        }
    }

    function handleGenericAdd(listName, defaultItem) {
        const newId = Date.now(); // Using timestamp for unique ID
        state[listName].push({ id: newId, ...defaultItem });
        render();
        saveAndPreview();
    }
    
    // --- DRAG AND DROP LOGIC ---
    let draggedItem = null;
    linksEditorList.addEventListener('dragstart', (e) => {
        draggedItem = e.target.closest('.link-item');
        if (draggedItem) {
            setTimeout(() => e.target.classList.add('dragging'), 0);
        }
    });

    linksEditorList.addEventListener('dragend', (e) => {
        if(draggedItem){
            draggedItem.classList.remove('dragging');
            draggedItem = null;
        }
    });

    linksEditorList.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(linksEditorList, e.clientY);
        const currentDragged = document.querySelector('.dragging');
        if (afterElement == null) {
            linksEditorList.appendChild(currentDragged);
        } else {
            linksEditorList.insertBefore(currentDragged, afterElement);
        }
    });

    linksEditorList.addEventListener('drop', (e) => {
        e.preventDefault();
        const newOrderIds = Array.from(linksEditorList.querySelectorAll('.link-item')).map(el => parseInt(el.dataset.id));
        state.links.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
        saveAndPreview();
    });

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.link-item:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // --- INITIALIZATION ---
    function init() {
        loadData();
        render();

        // Wait for iframe to be loaded before the first data post
        previewFrame.addEventListener('load', () => {
            saveAndPreview();
        });

        // Attach event listeners
        profilePicUrlInput.addEventListener('input', e => { state.profile.pictureUrl = e.target.value; saveAndPreview(); });
        profileTitleInput.addEventListener('input', e => { state.profile.title = e.target.value; saveAndPreview(); });
        themeSelector.addEventListener('change', e => { state.theme = e.target.value; saveAndPreview(); });

        addLinkBtn.addEventListener('click', () => handleGenericAdd('links', { title: 'New Link', url: 'https://', clicks: 0, thumbnailUrl: '' }));
        addSocialBtn.addEventListener('click', () => handleGenericAdd('socials', { network: '', url: 'https://' }));

        linksEditorList.addEventListener('input', e => {
            if (e.target.classList.contains('link-title-input')) handleGenericUpdate(e, 'links', 'title');
            if (e.target.classList.contains('link-url-input')) handleGenericUpdate(e, 'links', 'url');
            if (e.target.classList.contains('link-thumbnail-input')) handleGenericUpdate(e, 'links', 'thumbnailUrl');
        });
        socialsEditorList.addEventListener('input', e => handleGenericUpdate(e, 'socials', 'url'));

        linksEditorList.addEventListener('click', e => handleGenericDelete(e, 'links'));
        socialsEditorList.addEventListener('click', e => handleGenericDelete(e, 'socials'));
    }

    init();
});