/**
 * Linktree Admin Panel - Master Version
 * This script manages the entire admin interface, state, and interaction
 * with the live preview. It's structured for clarity and performance.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- UTILITIES ---
    /**
     * Debounce function to limit the rate at which a function can fire.
     * @param {Function} func The function to debounce.
     * @param {number} delay The delay in milliseconds.
     * @returns {Function} The debounced function.
     */
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    };

    /**
     * Deeply merges a source object into a target object.
     * This is used to safely update the state with partial data without losing nested properties.
     * @param {object} target The target object.
     * @param {object} source The source object.
     * @returns {object} The merged object.
     */
    const deepMerge = (target, source) => {
        for (const key in source) {
            if (source[key] instanceof Object && key in target) {
                Object.assign(source[key], deepMerge(target[key], source[key]));
            }
        }
        Object.assign(target || {}, source);
        return target;
    };


    // --- STATE MANAGEMENT ---
    let state = {};
    const FONT_OPTIONS = { "Inter": "'Inter', sans-serif", "Roboto": "'Roboto', sans-serif", "Montserrat": "'Montserrat', sans-serif", "Lato": "'Lato', sans-serif", "Playfair Display": "'Playfair Display', serif" };
    
    const defaultData = {
        profile: { pictureUrl: "", title: "" },
        links: [], socials: [],
        seo: { title: "", description: "", faviconUrl: "" },
        appearance: {
            fontFamily: "'Inter', sans-serif", textColor: '#121212',
            background: { type: 'solid', value: '#fafafa' },
            button: { backgroundColor: '#ffffff', textColor: '#121212', borderRadius: '8px', hasShadow: true }
        }
    };

    /**
     * Initializes the state by loading from localStorage or using defaults.
     */
    const loadState = () => {
        const savedData = localStorage.getItem('linktreeData');
        state = deepMerge(JSON.parse(JSON.stringify(defaultData)), savedData ? JSON.parse(savedData) : {});
    };

    /**
     * Updates the global state with a partial state object and triggers a debounced save.
     * @param {object} partialState - The part of the state to update.
     */
    const updateState = (partialState) => {
        state = deepMerge(state, partialState);
        debouncedSave();
    };


    // --- DOM ELEMENTS & SAVE STATUS ---
    const previewFrame = document.getElementById('preview-frame');
    const saveStatusEl = document.getElementById('save-status');

    /**
     * Updates the save status indicator in the UI.
     * @param {string} text The text to display (e.g., 'Saving...', 'Saved').
     * @param {boolean} isSuccess Whether the status is a success message.
     */
    const setSaveStatus = (text, isSuccess = false) => {
        saveStatusEl.textContent = text;
        saveStatusEl.style.color = isSuccess ? 'var(--success-color)' : 'var(--text-secondary)';
        saveStatusEl.style.opacity = '1';
    };

    /**
     * Saves the current state to localStorage and sends it to the preview iframe.
     */
    const saveAndPreview = () => {
        localStorage.setItem('linktreeData', JSON.stringify(state));
        if (previewFrame.contentWindow) {
            previewFrame.contentWindow.postMessage({ type: 'update', payload: state }, window.location.origin);
        }
        setSaveStatus('Saved', true);
        setTimeout(() => saveStatusEl.style.opacity = '0', 2000);
    };

    const debouncedSave = debounce(() => {
        setSaveStatus('Saving...');
        saveAndPreview();
    }, 500);


    // --- RENDER FUNCTIONS ---
    /**
     * Main render function to update the entire admin UI.
     */
    const render = () => {
        document.getElementById('profile-pic-url').value = state.profile.pictureUrl || '';
        document.getElementById('profile-title').value = state.profile.title || '';
        renderAppearanceEditor();
        renderSettingsEditor();
        renderList('socials-editor-list', state.socials, createSocialItemHTML, "No social icons yet.");
        renderList('links-editor-list', state.links, createLinkItemHTML, "No links or headers yet. Add one!");
    };

    /**
     * Generic function to render a list of items into a container.
     */
    function renderList(containerId, items, htmlFactory, emptyMessage) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        if (items.length === 0) {
            container.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
            return;
        }
        items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.innerHTML = htmlFactory(item);
            const childElement = itemEl.firstElementChild;
            childElement.dataset.id = item.id;
            if(item.type === 'header') childElement.classList.add('is-header');
            container.appendChild(childElement);
        });
    }

    /**
     * Dynamically builds and renders the complex 'Appearance' editor.
     */
    function renderAppearanceEditor() {
        const container = document.getElementById('appearance-section');
        const fontOpts = Object.entries(FONT_OPTIONS).map(([n, v]) => `<option value="${v}" ${state.appearance.fontFamily === v ? 'selected' : ''}>${n}</option>`).join('');
        const bg = state.appearance.background;
        const bgControls = `
            <div id="background-controls">
                ${bg.type === 'solid' ? `<div class="form-group"><label>Color</label><input type="color" id="bg-color1" value="${bg.value}"></div>` : ''}
                ${bg.type === 'gradient' ? `<div class="form-grid"><div class="form-group"><label>Color 1</label><input type="color" id="bg-color1" value="${bg.value[0]}"></div><div class="form-group"><label>Color 2</label><input type="color" id="bg-color2" value="${bg.value[1]}"></div></div>` : ''}
                ${bg.type === 'image' ? `<div class="form-group"><label>Image URL</label><input type="text" id="bg-image-url" value="${bg.value}"></div>` : ''}
            </div>`;
        container.innerHTML = `
            <div class="form-group"><label>Font Family</label><select id="font-family-select">${fontOpts}</select></div>
            <div class="form-group"><label>Page Text Color</label><input type="color" id="text-color" value="${state.appearance.textColor}"></div>
            <fieldset class="fieldset"><legend>Background</legend><select id="background-type-select"><option value="solid" ${bg.type === 'solid' ? 'selected' : ''}>Solid Color</option><option value="gradient" ${bg.type === 'gradient' ? 'selected' : ''}>Gradient</option><option value="image" ${bg.type === 'image' ? 'selected' : ''}>Image</option></select>${bgControls}</fieldset>
            <fieldset class="fieldset"><legend>Buttons</legend><div class="form-grid"><div class="form-group"><label>Background</label><input type="color" id="btn-bg-color" value="${state.appearance.button.backgroundColor}"></div><div class="form-group"><label>Text</label><input type="color" id="btn-text-color" value="${state.appearance.button.textColor}"></div></div><div class="form-group"><label>Corner Radius</label><input type="range" id="btn-radius" min="0" max="40" step="1" value="${parseInt(state.appearance.button.borderRadius)}"></div><div class="form-group"><label><input type="checkbox" id="btn-shadow" ${state.appearance.button.hasShadow ? 'checked' : ''}> Enable Shadow</label></div></fieldset>`;
    }

    function renderSettingsEditor() {
        document.getElementById('settings-section').innerHTML = `<div class="form-group"><label>Page Title</label><input type="text" id="seo-title" value="${state.seo.title}"></div><div class="form-group"><label>Meta Description</label><input type="text" id="seo-description" value="${state.seo.description}"></div><div class="form-group"><label>Favicon URL</label><input type="text" id="seo-favicon" value="${state.seo.faviconUrl}"></div>`;
    }

    /**
     * Creates the HTML for a single link or header item in the editor.
     */
    function createLinkItemHTML(item) {
        if (item.type === 'header') {
            return `<div class="item-container" draggable="true"><div class="drag-handle">☰</div><div class="item-content"><div class="item-header"><span>Header</span><button class="btn btn-danger delete-btn">Delete</button></div><div class="form-group"><input type="text" class="link-title" value="${item.title}"></div></div></div>`;
        }
        const schedule = item.schedule || { start: '', end: '' };
        return `<div class="item-container" draggable="true"><div class="drag-handle">☰</div><div class="item-content"><div class="item-header"><span class="analytics-display">📊 Clicks: ${item.clicks || 0}</span><button class="btn btn-danger delete-btn">Delete</button></div><div class="form-group"><label>Title</label><input type="text" class="link-title" value="${item.title}"></div><div class="form-group"><label>URL</label><input type="text" class="link-url" value="${item.url}"></div><div class="form-group"><label>Thumbnail URL</label><input type="text" class="link-thumbnail" value="${item.thumbnailUrl || ''}"></div><fieldset class="fieldset"><legend>Schedule</legend><div class="schedule-grid"><div class="form-group"><label>Show After</label><input type="datetime-local" class="link-schedule-start" value="${schedule.start || ''}"></div><div class="form-group"><label>Hide After</label><input type="datetime-local" class="link-schedule-end" value="${schedule.end || ''}"></div></div></fieldset></div></div>`;
    }
    
    function createSocialItemHTML(item) {
        return `<div class="social-item"><div class="item-content"><div class="item-header"><span>Social Icon</span><button class="btn btn-danger delete-btn">Delete</button></div><div class="form-group"><label>URL</label><input type="text" class="social-url-input" value="${item.url}" placeholder="https://twitter.com/your-name"></div></div></div>`;
    }


    // --- EVENT HANDLING ---
    /**
     * Centralized event handler for the entire editor pane.
     */
    function handleEditorInput(e) {
        setSaveStatus('Typing...');
        const handlers = {'profile-pic-url': v => ({profile:{pictureUrl:v}}), 'profile-title': v => ({profile:{title:v}}), 'seo-title': v => ({seo:{title:v}}), 'seo-description': v => ({seo:{description:v}}), 'seo-favicon': v => ({seo:{faviconUrl:v}}), 'text-color': v => ({appearance:{textColor:v}}), 'bg-color1': v => ({appearance:{background:{value: state.appearance.background.type === 'gradient' ? [v, state.appearance.background.value[1]] : v}}}), 'bg-color2': v => ({appearance:{background:{value:[state.appearance.background.value[0], v]}}}), 'bg-image-url': v => ({appearance:{background:{value:v}}}), 'btn-bg-color': v => ({appearance:{button:{backgroundColor:v}}}), 'btn-text-color': v => ({appearance:{button:{textColor:v}}}), 'btn-radius': v => ({appearance:{button:{borderRadius:`${v}px`}}}), 'btn-shadow': v => ({appearance:{button:{hasShadow:e.target.checked}}})};
        if (handlers[e.target.id]) { updateState(handlers[e.target.id](e.target.value)); return; }

        const itemEl = e.target.closest('[data-id]');
        if (itemEl) {
            const id = parseInt(itemEl.dataset.id);
            const keyMap = {'link-title':'title', 'link-url':'url', 'link-thumbnail':'thumbnailUrl', 'social-url-input':'url', 'link-schedule-start':'schedule.start', 'link-schedule-end':'schedule.end'};
            for (const [cls, key] of Object.entries(keyMap)) {
                if (e.target.classList.contains(cls)) {
                    const listName = itemEl.classList.contains('social-item') ? 'socials' : 'links';
                    const items = state[listName].map(item => {
                        if (item.id === id) {
                            if (key.includes('.')) { const [p, c] = key.split('.'); item[p] = {...item[p], [c]: e.target.value}; }
                            else { item[key] = e.target.value; }
                            if(key === 'url' && listName === 'socials') item.network = detectSocialNetwork(e.target.value);
                        }
                        return item;
                    });
                    updateState({ [listName]: items });
                    break;
                }
            }
        }
    }
    
    function attachEventListeners() {
        const editorPane = document.getElementById('editor-pane');
        editorPane.addEventListener('input', handleEditorInput);
        editorPane.addEventListener('change', (e) => {
            if (e.target.id === 'font-family-select') updateState({appearance: {fontFamily: e.target.value}});
            if (e.target.id === 'background-type-select') {
                const type = e.target.value; let value;
                switch(type) { case 'solid': value = '#fafafa'; break; case 'gradient': value = ['#a8c0ff', '#3f2b96']; break; case 'image': value = ''; break; }
                updateState({appearance: {background: {type, value}}});
                renderAppearanceEditor();
            }
        });
        editorPane.addEventListener('click', (e) => {
            const target = e.target;
            const itemEl = target.closest('[data-id]');
            if (target.classList.contains('delete-btn') && itemEl) {
                if (!window.confirm("Are you sure you want to delete this item?")) return;
                const id = parseInt(itemEl.dataset.id);
                const listName = itemEl.matches('.social-item, .social-item *') ? 'socials' : 'links';
                updateState({ [listName]: state[listName].filter(i => i.id !== id) });
                render(); saveAndPreview();
            }
            if (target.id === 'add-link-btn') { updateState({links: [...state.links, {type:'link', id:Date.now(), title:'New Link', url:'https://', clicks:0}]}); render(); saveAndPreview(); }
            if (target.id === 'add-header-btn') { updateState({links: [...state.links, {type:'header', id:Date.now(), title:'New Header'}]}); render(); saveAndPreview(); }
            if (target.id === 'add-social-btn') { updateState({socials: [...state.socials, {id:Date.now(), network:'website', url:'https://'}]}); render(); saveAndPreview(); }
        });

        // --- Import/Export/Share/Drag&Drop Handlers ---
        document.getElementById('export-btn').addEventListener('click', () => {
            const dataStr = JSON.stringify(state, null, 2);
            const blob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'linktree-data.json'; a.click(); URL.revokeObjectURL(url);
        });
        const importInput = document.getElementById('import-file-input');
        document.getElementById('import-btn').addEventListener('click', () => importInput.click());
        importInput.addEventListener('change', (e) => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedState = JSON.parse(event.target.result);
                    if(window.confirm("Importing will overwrite your current configuration. Are you sure?")) {
                        state = deepMerge(JSON.parse(JSON.stringify(defaultData)), importedState);
                        render(); saveAndPreview();
                    }
                } catch (err) { alert("Error reading or parsing the file."); }
            };
            reader.readAsText(file); e.target.value = '';
        });
        document.getElementById('share-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(window.location.origin + '/index.html').then(() => alert("Public URL copied to clipboard!"), () => alert("Could not copy URL."));
        });
        let draggedItem = null;
        const linksListEl = document.getElementById('links-editor-list');
        linksListEl.addEventListener('dragstart', (e) => {
            draggedItem = e.target.closest('.item-container');
            if (draggedItem) setTimeout(() => draggedItem.classList.add('dragging'), 0);
        });
        linksListEl.addEventListener('dragend', () => { if(draggedItem) draggedItem.classList.remove('dragging'); draggedItem = null; });
        linksListEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = [...linksListEl.querySelectorAll('.item-container:not(.dragging)')].reduce((closest, child) => {
                const box = child.getBoundingClientRect(); const offset = e.clientY - box.top - box.height / 2;
                return (offset < 0 && offset > closest.offset) ? {offset, element:child} : closest;
            }, {offset:Number.NEGATIVE_INFINITY}).element;
            if (afterElement == null) linksListEl.appendChild(draggedItem);
            else linksListEl.insertBefore(draggedItem, afterElement);
        });
        linksListEl.addEventListener('drop', (e) => {
            e.preventDefault();
            const newOrderIds = [...linksListEl.querySelectorAll('.item-container')].map(el => parseInt(el.dataset.id));
            const reorderedLinks = newOrderIds.map(id => state.links.find(link => link.id === id));
            updateState({ links: reorderedLinks }); saveAndPreview();
        });
    }
    
    const detectSocialNetwork = (url) => {
        try { const hostname = new URL(url).hostname; return ['twitter', 'github', 'linkedin', 'instagram', 'youtube'].find(n => hostname.includes(n)) || 'website'; } catch { return 'website'; }
    };

    // --- INITIALIZATION ---
    (() => {
        loadState();
        render();
        previewFrame.addEventListener('load', () => saveAndPreview());
        attachEventListeners();
    })();
});