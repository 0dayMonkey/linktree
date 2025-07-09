/**
 * Linktree Admin Panel - Version Finale, Corrigée et Fonctionnelle
 *
 * Utilise la délégation d'événements pour une robustesse maximale.
 * La logique de mise à jour de l'état est simplifiée et fiable.
 * La sauvegarde automatique est garantie à chaque modification.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- VARIABLES ET CONSTANTES ---
    const editorPane = document.getElementById('editor-pane');
    const previewFrame = document.getElementById('preview-frame');
    const saveStatusEl = document.getElementById('save-status');

    const UPDATE_SECRET_KEY = 'DINGUERIEDEVOULOIRMODIF';
    const GET_DATA_URL = 'https://reliable-hamster-b1e205.netlify.app/.netlify/functions/get-data';
    const UPDATE_DATA_URL = 'https://reliable-hamster-b1e205.netlify.app/.netlify/functions/update-data';
    
    let state = {};

    // --- GESTION DE LA SAUVEGARDE ---

    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const saveStateToNotion = async () => {
        if (!state || Object.keys(state).length === 0) return;
        
        console.log('%cSaving to Notion...', 'color: orange', state);
        saveStatusEl.textContent = 'Saving...';
        saveStatusEl.style.color = 'var(--warning-color)';
        
        try {
            const response = await fetch(UPDATE_DATA_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret: UPDATE_SECRET_KEY, data: state }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save data');
            }
            
            console.log('%cSave successful!', 'color: green');
            saveStatusEl.textContent = 'All changes saved';
            saveStatusEl.style.color = 'var(--success-color)';

        } catch (error) {
            console.error('Save error:', error);
            saveStatusEl.textContent = `Error: ${error.message}`;
            saveStatusEl.style.color = 'var(--danger-color)';
        }
    };

    const debouncedSave = debounce(saveStateToNotion, 1500); // 1.5s de délai

    const updateAndSave = (newState) => {
        state = newState;
        console.log('State changed, triggering save:', state);
        if (previewFrame && previewFrame.contentWindow) {
            previewFrame.contentWindow.postMessage({ type: 'update', payload: state }, window.location.origin);
        }
        debouncedSave();
    };

    // --- FONCTIONS DE RENDU ---
    // (Inchangées, mais incluses pour avoir un fichier complet)
    
    const render = () => {
        if (!state.profile) return;
        document.getElementById('profile-pic-url').value = state.profile.pictureUrl || '';
        document.getElementById('profile-title').value = state.profile.title || '';
        renderAppearanceEditor();
        renderSettingsEditor();
        renderList('socials-editor-list', state.socials, createSocialItemHTML, "No social icons yet.");
        renderList('links-editor-list', state.links, createLinkItemHTML, "No links or headers yet. Add one!");
    };

    function renderList(containerId, items = [], htmlFactory, emptyMessage) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        if (items.length === 0) {
            container.innerHTML = `<div class="empty-state">${emptyMessage}</div>`; return;
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

    function renderAppearanceEditor() {
        const FONT_OPTIONS = { "Inter": "'Inter', sans-serif", "Roboto": "'Roboto', sans-serif", "Montserrat": "'Montserrat', sans-serif", "Lato": "'Lato', sans-serif", "Playfair Display": "'Playfair Display', serif" };
        const container = document.getElementById('appearance-section');
        if (!container) return;
        const fontOpts = Object.entries(FONT_OPTIONS).map(([n, v]) => `<option value="${v}" ${state.appearance.fontFamily === v ? 'selected' : ''}>${n}</option>`).join('');
        const bg = state.appearance.background;
        const bgValue = Array.isArray(bg.value) ? bg.value : bg.value.split(',');
        const bgControls = `
            <div id="background-controls">
                ${bg.type === 'solid' ? `<div class="form-group"><label>Color</label><input type="color" data-key="appearance.background.value" value="${bg.value}"></div>` : ''}
                ${bg.type === 'gradient' ? `<div class="form-grid"><div class="form-group"><label>Color 1</label><input type="color" data-key="appearance.background.value.0" value="${bgValue[0] || ''}"></div><div class="form-group"><label>Color 2</label><input type="color" data-key="appearance.background.value.1" value="${bgValue[1] || ''}"></div></div>` : ''}
                ${bg.type === 'image' ? `<div class="form-group"><label>Image URL</label><input type="text" data-key="appearance.background.value" value="${bg.value}"></div>` : ''}
            </div>`;
        container.innerHTML = `<h2>Appearance</h2><div class="form-group"><label>Font Family</label><select data-key="appearance.fontFamily">${fontOpts}</select></div><div class="form-group"><label>Page Text Color</label><input type="color" data-key="appearance.textColor" value="${state.appearance.textColor}"></div><fieldset class="fieldset"><legend>Background</legend><select data-key="appearance.background.type"><option value="solid" ${bg.type === 'solid' ? 'selected' : ''}>Solid Color</option><option value="gradient" ${bg.type === 'gradient' ? 'selected' : ''}>Gradient</option><option value="image" ${bg.type === 'image' ? 'selected' : ''}>Image</option></select>${bgControls}</fieldset><fieldset class="fieldset"><legend>Buttons</legend><div class="form-grid"><div class="form-group"><label>Background</label><input type="color" data-key="appearance.button.backgroundColor" value="${state.appearance.button.backgroundColor}"></div><div class="form-group"><label>Text</label><input type="color" data-key="appearance.button.textColor" value="${state.appearance.button.textColor}"></div></div><div class="form-group"><label>Corner Radius</label><input type="range" data-key="appearance.button.borderRadius" min="0" max="40" step="1" value="${parseInt(state.appearance.button.borderRadius) || 8}"></div><div class="form-group"><label><input type="checkbox" data-key="appearance.button.hasShadow" ${state.appearance.button.hasShadow ? 'checked' : ''}> Enable Shadow</label></div></fieldset>`;
    }

    function renderSettingsEditor() {
        const container = document.getElementById('settings-section');
        if (!container || !state.seo) return;
        container.innerHTML = `<h2>Settings (SEO)</h2><div class="form-group"><label>Page Title</label><input type="text" data-key="seo.title" value="${state.seo.title || ''}"></div><div class="form-group"><label>Meta Description</label><input type="text" data-key="seo.description" value="${state.seo.description || ''}"></div><div class="form-group"><label>Favicon URL</label><input type="text" data-key="seo.faviconUrl" value="${state.seo.faviconUrl || ''}"></div>`;
    }

    function createLinkItemHTML(item) {
        if (item.type === 'header') return `<div class="item-container" draggable="true"><div class="drag-handle">☰</div><div class="item-content"><div class="item-header"><span>Header</span><button data-action="delete" class="btn btn-danger delete-btn">Delete</button></div><div class="form-group"><input type="text" data-key="title" value="${item.title || ''}"></div></div></div>`;
        return `<div class="item-container" draggable="true"><div class="drag-handle">☰</div><div class="item-content"><div class="item-header"><span class="analytics-display">📊</span><button data-action="delete" class="btn btn-danger delete-btn">Delete</button></div><div class="form-group"><label>Title</label><input type="text" data-key="title" value="${item.title || ''}"></div><div class="form-group"><label>URL</label><input type="text" data-key="url" value="${item.url || ''}"></div><div class="form-group"><label>Thumbnail URL</label><input type="text" data-key="thumbnailUrl" value="${item.thumbnailUrl || ''}"></div></div></div>`;
    }

    function createSocialItemHTML(item) {
        return `<div class="social-item"><div class="item-content"><div class="item-header"><span>Social Icon</span><button data-action="delete" class="btn btn-danger delete-btn">Delete</button></div><div class="form-group"><label>URL</label><input type="text" data-key="url" value="${item.url || ''}" placeholder="https://twitter.com/your-name"></div></div></div>`;
    }

    // --- GESTION DES ÉVÉNEMENTS (SIMPLIFIÉE) ---
    
    function attachEventListeners() {
        if (!editorPane) return;

        // On attache un seul listener à l'ensemble du panneau
        editorPane.addEventListener('input', (e) => {
            const target = e.target;
            const key = target.dataset.key;
            if (!key) return;

            let value = target.type === 'checkbox' ? target.checked : target.value;
            if (target.type === 'range') value = `${value}px`;

            const newState = JSON.parse(JSON.stringify(state));
            const itemEl = target.closest('[data-id]');
            
            if (itemEl) { // C'est un item dans une liste
                const id = parseInt(itemEl.dataset.id, 10);
                const listName = itemEl.closest('#links-editor-list') ? 'links' : 'socials';
                const item = newState[listName].find(i => i.id === id);
                if (item) item[key] = value;
            } else { // C'est une propriété globale
                let current = newState;
                const keyParts = key.split('.');
                keyParts.forEach((part, index) => {
                    if (index === keyParts.length - 1) {
                        current[part] = value;
                    } else {
                        current = current[part];
                    }
                });
            }
            updateAndSave(newState);
        });
        
        editorPane.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (!action) return;

            const newState = JSON.parse(JSON.stringify(state));
            let stateChanged = true;

            if (action === 'add-link') newState.links.push({type:'link', id:Date.now(), title:'New Link', url:'https://'});
            else if (action === 'add-header') newState.links.push({type:'header', id:Date.now(), title:'New Header'});
            else if (action === 'add-social') newState.socials.push({id:Date.now(), url:'https://', network: 'website'});
            else if (action === 'delete') {
                const itemEl = e.target.closest('[data-id]');
                if (!itemEl || !window.confirm("Are you sure?")) return;
                
                const id = parseInt(itemEl.dataset.id, 10);
                const listName = itemEl.closest('#links-editor-list') ? 'links' : 'socials';
                newState[listName] = newState[listName].filter(item => item.id !== id);
            } else {
                stateChanged = false;
            }

            if (stateChanged) {
                updateAndSave(newState);
                render();
            }
        });
    }
    
    // --- INITIALISATION ---
    async function init() {
        try {
            const response = await fetch(GET_DATA_URL);
            if (!response.ok) throw new Error('Could not fetch data from Notion.');
            state = await response.json();
            
            console.log('Initial data loaded:', state);
            saveStatusEl.textContent = 'Ready';

            render();
            attachEventListeners();

            if (previewFrame) {
                const syncPreview = () => {
                    if (previewFrame.contentWindow && state && Object.keys(state).length > 0) {
                         previewFrame.contentWindow.postMessage({ type: 'update', payload: state }, window.location.origin);
                    }
                };
                previewFrame.addEventListener('load', syncPreview);
                syncPreview();
            }

        } catch (error) {
            console.error("Initialization Error:", error);
            saveStatusEl.textContent = `Error: ${error.message}`;
            saveStatusEl.style.color = 'var(--danger-color)';
        }
    }
    
    init();
});