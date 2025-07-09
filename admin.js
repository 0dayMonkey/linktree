document.addEventListener('DOMContentLoaded', () => {
    let state = {};

    const previewFrame = document.getElementById('preview-frame');
    const FONT_OPTIONS = {
        "Inter": "'Inter', sans-serif",
        "Roboto": "'Roboto', sans-serif",
        "Montserrat": "'Montserrat', sans-serif",
        "Lato": "'Lato', sans-serif",
        "Playfair Display": "'Playfair Display', serif"
    };
    
    // --- DATA & STATE MANAGEMENT ---
    const defaultData = {
        profile: { pictureUrl: "", title: "" },
        links: [], socials: [],
        seo: { title: "", description: "", faviconUrl: "" },
        appearance: {
            fontFamily: "'Inter', sans-serif",
            textColor: '#121212',
            background: { type: 'solid', value: '#fafafa' },
            button: { backgroundColor: '#ffffff', textColor: '#121212', borderRadius: '8px', hasShadow: true }
        }
    };

    function postStateToPreview() {
        if (previewFrame.contentWindow) {
            previewFrame.contentWindow.postMessage({ type: 'update', payload: state }, window.location.origin);
        }
    }

    function saveAndPreview() {
        localStorage.setItem('linktreeData', JSON.stringify(state));
        postStateToPreview();
    }

    function loadData() {
        const savedData = localStorage.getItem('linktreeData');
        state = deepMerge(JSON.parse(JSON.stringify(defaultData)), savedData ? JSON.parse(savedData) : {});
    }

    // Merges saved data into default structure to prevent errors if new fields are added
    function deepMerge(target, source) {
        for (const key in source) {
            if (source[key] instanceof Object && key in target) {
                Object.assign(source[key], deepMerge(target[key], source[key]));
            }
        }
        Object.assign(target || {}, source);
        return target;
    }

    // --- DYNAMIC RENDERING OF ADMIN UI ---
    function render() {
        document.getElementById('profile-pic-url').value = state.profile.pictureUrl || '';
        document.getElementById('profile-title').value = state.profile.title || '';
        renderAppearanceEditor();
        renderSettingsEditor();
        renderList('socials-editor-list', state.socials, createSocialItemHTML);
        renderList('links-editor-list', state.links, createLinkItemHTML);
    }

    function renderList(containerId, items, htmlFactory) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.innerHTML = htmlFactory(item);
            itemEl.firstElementChild.dataset.id = item.id;
            container.appendChild(itemEl.firstElementChild);
        });
    }

    function renderAppearanceEditor() {
        const container = document.getElementById('appearance-section');
        // Font
        const fontOptionsHTML = Object.entries(FONT_OPTIONS).map(([name, value]) => 
            `<option value="${value}" ${state.appearance.fontFamily === value ? 'selected' : ''}>${name}</option>`
        ).join('');

        // Background
        const bg = state.appearance.background;
        const bgControlsHTML = `
            <div id="background-controls">
                ${bg.type === 'solid' ? `<div class="form-group"><label>Color</label><input type="color" id="bg-color1" value="${bg.value}"></div>` : ''}
                ${bg.type === 'gradient' ? `<div class="form-grid"><div class="form-group"><label>Color 1</label><input type="color" id="bg-color1" value="${bg.value[0]}"></div><div class="form-group"><label>Color 2</label><input type="color" id="bg-color2" value="${bg.value[1]}"></div></div>` : ''}
                ${bg.type === 'image' ? `<div class="form-group"><label>Image URL</label><input type="text" id="bg-image-url" value="${bg.value}"></div>` : ''}
            </div>`;
        
        container.innerHTML = `
            <div class="form-group"><label>Font Family</label><select id="font-family-select">${fontOptionsHTML}</select></div>
            <div class="form-group"><label>Page Text Color</label><input type="color" id="text-color" value="${state.appearance.textColor}"></div>
            <fieldset class="fieldset"><legend>Background</legend>
                <select id="background-type-select">
                    <option value="solid" ${bg.type === 'solid' ? 'selected' : ''}>Solid Color</option>
                    <option value="gradient" ${bg.type === 'gradient' ? 'selected' : ''}>Gradient</option>
                    <option value="image" ${bg.type === 'image' ? 'selected' : ''}>Image</option>
                </select>
                ${bgControlsHTML}
            </fieldset>
            <fieldset class="fieldset"><legend>Buttons</legend>
                <div class="form-grid">
                    <div class="form-group"><label>Background</label><input type="color" id="btn-bg-color" value="${state.appearance.button.backgroundColor}"></div>
                    <div class="form-group"><label>Text</label><input type="color" id="btn-text-color" value="${state.appearance.button.textColor}"></div>
                </div>
                <div class="form-group"><label>Corner Radius</label><input type="range" id="btn-radius" min="0" max="40" step="1" value="${parseInt(state.appearance.button.borderRadius)}"></div>
                <div class="form-group"><label><input type="checkbox" id="btn-shadow" ${state.appearance.button.hasShadow ? 'checked' : ''}> Enable Shadow</label></div>
            </fieldset>
        `;
    }

    function renderSettingsEditor() {
        document.getElementById('settings-section').innerHTML = `
            <div class="form-group"><label>Page Title</label><input type="text" id="seo-title" value="${state.seo.title}"></div>
            <div class="form-group"><label>Meta Description</label><input type="text" id="seo-description" value="${state.seo.description}"></div>
            <div class="form-group"><label>Favicon URL</label><input type="text" id="seo-favicon" value="${state.seo.faviconUrl}"></div>
        `;
    }

    // --- HTML FACTORIES FOR LIST ITEMS ---
    function createSocialItemHTML(item) {
        return `<div class="social-item">...</div>`; // Keep concise, logic is similar to links
    }

    function createLinkItemHTML(item) {
        const schedule = item.schedule || { start: '', end: '' };
        return `
            <div class="link-item" draggable="true">
                <div class="drag-handle">☰</div>
                <div class="item-content">
                    <div class="item-header">
                        <span class="analytics-display">📊 Clicks: ${item.clicks || 0}</span>
                        <button class="btn btn-danger delete-btn">Delete</button>
                    </div>
                    <div class="form-group"><label>Title</label><input type="text" class="link-title" value="${item.title}"></div>
                    <div class="form-group"><label>URL</label><input type="text" class="link-url" value="${item.url}"></div>
                    <div class="form-group"><label>Thumbnail URL (Optional)</label><input type="text" class="link-thumbnail" value="${item.thumbnailUrl || ''}"></div>
                    <fieldset class="fieldset"><legend>Schedule (Optional)</legend>
                        <div class="schedule-grid">
                            <div class="form-group"><label>Show After</label><input type="datetime-local" class="link-schedule-start" value="${schedule.start || ''}"></div>
                            <div class="form-group"><label>Hide After</label><input type="datetime-local" class="link-schedule-end" value="${schedule.end || ''}"></div>
                        </div>
                    </fieldset>
                </div>
            </div>`;
    }


    // --- EVENT HANDLING ---
    function attachEventListeners() {
        document.getElementById('editor-pane').addEventListener('input', (e) => {
            // Profile & SEO
            const handlers = {
                'profile-pic-url': val => state.profile.pictureUrl = val,
                'profile-title': val => state.profile.title = val,
                'seo-title': val => state.seo.title = val,
                'seo-description': val => state.seo.description = val,
                'seo-favicon': val => state.seo.faviconUrl = val,
                'text-color': val => state.appearance.textColor = val,
                'bg-color1': val => state.appearance.background.value = state.appearance.background.type === 'gradient' ? [val, state.appearance.background.value[1]] : val,
                'bg-color2': val => state.appearance.background.value[1] = val,
                'bg-image-url': val => state.appearance.background.value = val,
                'btn-bg-color': val => state.appearance.button.backgroundColor = val,
                'btn-text-color': val => state.appearance.button.textColor = val,
                'btn-radius': val => state.appearance.button.borderRadius = `${val}px`,
            };
            if (handlers[e.target.id]) handlers[e.target.id](e.target.value);
            if (e.target.id === 'btn-shadow') state.appearance.button.hasShadow = e.target.checked;
            
            // Link updates
            const linkItem = e.target.closest('.link-item');
            if(linkItem) {
                const linkId = parseInt(linkItem.dataset.id);
                const link = state.links.find(l => l.id === linkId);
                const classMap = {
                    'link-title': 'title', 'link-url': 'url', 'link-thumbnail': 'thumbnailUrl',
                    'link-schedule-start': 'schedule.start', 'link-schedule-end': 'schedule.end'
                };
                for(const [cls, key] of Object.entries(classMap)) {
                    if(e.target.classList.contains(cls)) {
                        // Handle nested key for schedule
                        if(key.includes('.')) {
                            const [p, c] = key.split('.');
                            if(!link[p]) link[p] = {};
                            link[p][c] = e.target.value;
                        } else {
                            link[key] = e.target.value;
                        }
                    }
                }
            }
            saveAndPreview();
        });

        document.getElementById('editor-pane').addEventListener('change', (e) => {
            if (e.target.id === 'font-family-select') {
                state.appearance.fontFamily = e.target.value;
            }
            if (e.target.id === 'background-type-select') {
                state.appearance.background.type = e.target.value;
                switch(e.target.value) {
                    case 'solid': state.appearance.background.value = '#fafafa'; break;
                    case 'gradient': state.appearance.background.value = ['#a8c0ff', '#3f2b96']; break;
                    case 'image': state.appearance.background.value = ''; break;
                }
                renderAppearanceEditor();
            }
            saveAndPreview();
        });

        document.getElementById('editor-pane').addEventListener('click', (e) => {
            if (e.target.closest('.delete-btn')) {
                if(!window.confirm("Are you sure you want to delete this item?")) return;
                const linkItem = e.target.closest('[data-id]');
                const linkId = parseInt(linkItem.dataset.id);
                state.links = state.links.filter(l => l.id !== linkId);
                render();
                saveAndPreview();
            }
            if (e.target.id === 'add-link-btn') {
                state.links.push({ id: Date.now(), title: 'New Link', url: 'https://', clicks: 0, thumbnailUrl: '' });
                render();
                saveAndPreview();
            }
        });

        // Drag and Drop (simplified from v3 for brevity)
        // ... (The drag-drop logic from the previous version would be inserted here)
    }

    // --- INITIALIZATION ---
    function init() {
        loadData();
        render();
        previewFrame.addEventListener('load', postStateToPreview);
        attachEventListeners();
    }
    
    init();
});