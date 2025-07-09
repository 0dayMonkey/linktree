document.addEventListener('DOMContentLoaded', () => {
    const editorPane = document.getElementById('editor-pane');
    const previewFrame = document.getElementById('preview-frame');
    const saveStatusEl = document.getElementById('save-status');

    const UPDATE_SECRET_KEY = 'DINGUERIEDEVOULOIRMODIF';
    const GET_DATA_URL = 'https://reliable-hamster-b1e205.netlify.app/.netlify/functions/get-data';
    const UPDATE_DATA_URL = 'https://reliable-hamster-b1e205.netlify.app/.netlify/functions/update-data';

    let state = {};

    const SUPPORTED_SOCIALS = {
        "twitter": { name: "Twitter", baseUrl: "https://twitter.com/" },
        "instagram": { name: "Instagram", baseUrl: "https://instagram.com/" },
        "facebook": { name: "Facebook", baseUrl: "https://facebook.com/" },
        "linkedin": { name: "LinkedIn", baseUrl: "https://www.linkedin.com/in/" },
        "github": { name: "GitHub", baseUrl: "https://github.com/" },
        "youtube": { name: "YouTube", baseUrl: "https://youtube.com/" },
        "tiktok": { name: "TikTok", baseUrl: "https://tiktok.com/@" },
        "website": { name: "Website", baseUrl: "https://" }
    };

    const FONT_OPTIONS = {
        "Inter": "'Inter', sans-serif",
        "Roboto": "'Roboto', sans-serif",
        "Montserrat": "'Montserrat', sans-serif",
        "Lato": "'Lato', sans-serif",
        "Playfair Display": "'Playfair Display', serif"
    };

    const readFileAsBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        const key = e.target.dataset.key;
        if (!file || !key) return;

        try {
            const base64String = await readFileAsBase64(file);
            const itemEl = e.target.closest('[data-id]');
            const id = itemEl ? parseInt(itemEl.dataset.id, 10) : null;
            handleStateUpdate(key, base64String, id);
        } catch (error) {
            alert('Erreur lors de la lecture du fichier.');
        }
    };

    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const saveStateToNotion = async () => {
        if (!state || Object.keys(state).length === 0) return;
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
                throw new Error(errorData.message || 'Failed to save data');
            }
            saveStatusEl.textContent = 'All changes saved';
            saveStatusEl.style.color = 'var(--success-color)';
        } catch (error) {
            saveStatusEl.textContent = `Error: ${error.message}`;
            saveStatusEl.style.color = 'var(--danger-color)';
        }
    };

    const debouncedSave = debounce(saveStateToNotion, 1500);

    const updateAndSave = (newState) => {
        state = newState;
        if (previewFrame && previewFrame.contentWindow) {
            previewFrame.contentWindow.postMessage({ type: 'update', payload: state }, window.location.origin);
        }
        render();
        debouncedSave();
    };

    const render = () => {
        if (!state.profile) return;
        document.getElementById('profile-title').value = state.profile.title || '';
        renderAppearanceEditor();
        renderSettingsEditor();
        renderList('socials-editor-list', state.socials, createSocialItemHTML, "Aucune icône sociale pour le moment.");
        renderList('links-editor-list', state.links, createLinkItemHTML, "Aucun lien ou en-tête. Ajoutez-en un !");
    };

    function renderList(containerId, items = [], htmlFactory, emptyMessage) {
        const container = document.getElementById(containerId);
        if (!container) return;
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

    function renderAppearanceEditor() {
        const container = document.getElementById('appearance-section');
        if (!container) return;
        const fontOpts = Object.entries(FONT_OPTIONS).map(([n, v]) => `<option value="${v}" style="font-family: ${v};" ${state.appearance.fontFamily === v ? 'selected' : ''}>${n}</option>`).join('');
        const bg = state.appearance.background;
        const bgValue = Array.isArray(bg.value) ? bg.value : (bg.value || '').split(',');
        const bgControls = `
            <div id="background-controls">
                ${bg.type === 'solid' ? `<div class="form-group"><label>Couleur</label><input type="color" data-key="appearance.background.value" value="${bg.value}"></div>` : ''}
                ${bg.type === 'gradient' ? `<div class="form-grid"><div class="form-group"><label>Couleur 1</label><input type="color" data-key="appearance.background.value.0" value="${bgValue[0] || '#FFFFFF'}"></div><div class="form-group"><label>Couleur 2</label><input type="color" data-key="appearance.background.value.1" value="${bgValue[1] || '#000000'}"></div></div>` : ''}
                ${bg.type === 'image' ? `<div class="form-group"><label>Téléverser une image</label><input type="file" data-key="appearance.background.value" accept="image/*" class="file-upload-input"></div>` : ''}
            </div>`;
        container.innerHTML = `<h2>Apparence</h2><div class="form-group"><label>Police</label><select data-key="appearance.fontFamily">${fontOpts}</select></div><div class="form-group"><label>Couleur du texte de la page</label><input type="color" data-key="appearance.textColor" value="${state.appearance.textColor}"></div><fieldset class="fieldset"><legend>Arrière-plan</legend><select data-key="appearance.background.type"><option value="solid" ${bg.type === 'solid' ? 'selected' : ''}>Couleur unie</option><option value="gradient" ${bg.type === 'gradient' ? 'selected' : ''}>Dégradé</option><option value="image" ${bg.type === 'image' ? 'selected' : ''}>Image</option></select>${bgControls}</fieldset><fieldset class="fieldset"><legend>Boutons</legend><div class="form-grid"><div class="form-group"><label>Fond</label><input type="color" data-key="appearance.button.backgroundColor" value="${state.appearance.button.backgroundColor}"></div><div class="form-group"><label>Texte</label><input type="color" data-key="appearance.button.textColor" value="${state.appearance.button.textColor}"></div></div><div class="form-group"><label>Arrondi des coins</label><input type="range" data-key="appearance.button.borderRadius" min="0" max="40" step="1" value="${parseInt(state.appearance.button.borderRadius) || 8}"></div><div class="form-group"><label><input type="checkbox" data-key="appearance.button.hasShadow" ${state.appearance.button.hasShadow ? 'checked' : ''}> Activer l'ombre</label></div></fieldset>`;
    }

    function renderSettingsEditor() {
        const container = document.getElementById('settings-section');
        if (!container || !state.seo) return;
        container.innerHTML = `<h2>Paramètres (SEO)</h2><div class="form-group"><label>Titre de la page</label><input type="text" data-key="seo.title" value="${state.seo.title || ''}"></div><div class="form-group"><label>Méta-description</label><input type="text" data-key="seo.description" value="${state.seo.description || ''}"></div><div class="form-group"><label>Favicon</label><input type="file" data-key="seo.faviconUrl" accept="image/x-icon,image/png,image/svg+xml" class="file-upload-input"></div>`;
    }

    function createLinkItemHTML(item) {
        if (item.type === 'header') return `<div class="item-container" draggable="true"><div class="drag-handle">☰</div><div class="item-content"><div class="item-header"><span>En-tête</span><button data-action="delete" class="btn btn-danger delete-btn">Supprimer</button></div><div class="form-group"><input type="text" data-key="title" value="${item.title || ''}"></div></div></div>`;
        return `<div class="item-container" draggable="true"><div class="drag-handle">☰</div><div class="item-content"><div class="item-header"><span class="analytics-display">📊</span><button data-action="delete" class="btn btn-danger delete-btn">Supprimer</button></div><div class="form-group"><label>Titre</label><input type="text" data-key="title" value="${item.title || ''}"></div><div class="form-group"><label>URL</label><input type="text" data-key="url" value="${item.url || ''}"></div><div class="form-group"><label>Miniature</label><input type="file" data-key="thumbnailUrl" accept="image/*" class="file-upload-input"></div></div></div>`;
    }

    function createSocialItemHTML(item) {
        const optionsHTML = Object.entries(SUPPORTED_SOCIALS).map(([key, { name }]) =>
            `<option value="${key}" ${item.network === key ? 'selected' : ''}>${name}</option>`
        ).join('');
        const baseUrl = SUPPORTED_SOCIALS[item.network]?.baseUrl || 'https://';
        const displayUrl = item.url.startsWith(baseUrl) ? item.url.substring(baseUrl.length) : item.url;

        return `<div class="social-item"><div class="item-content"><div class="item-header"><span>Icône Sociale</span><button data-action="delete" class="btn btn-danger delete-btn">Supprimer</button></div><div class="form-group"><label>Réseau</label><select data-key="network">${optionsHTML}</select></div><div class="form-group"><label>URL ou Pseudo</label><input type="text" data-key="url" value="${displayUrl}" placeholder="votre-pseudo"></div></div></div>`;
    }
    
    function handleStateUpdate(key, value, id) {
        const newState = JSON.parse(JSON.stringify(state));
        let listName, item;

        if (id) {
            listName = document.querySelector(`[data-id="${id}"]`).closest('#links-editor-list') ? 'links' : 'socials';
            item = newState[listName].find(i => i.id === id);
            if(item) {
                 if (key === 'network') {
                    item.network = value;
                    item.url = SUPPORTED_SOCIALS[value].baseUrl;
                } else if (key === 'url' && item.network) {
                    const baseUrl = SUPPORTED_SOCIALS[item.network]?.baseUrl || '';
                    if (!value.startsWith('http')) {
                        item.url = baseUrl + value;
                    } else {
                        item.url = value;
                    }
                } else {
                    item[key] = value;
                }
            }
        } else {
            let current = newState;
            const keyParts = key.split('.');
            keyParts.forEach((part, index) => {
                if (index === keyParts.length - 1) {
                    current[part] = value;
                } else {
                    current = current[part] || (current[part] = {});
                }
            });
        }
        updateAndSave(newState);
    }

    function attachEventListeners() {
        editorPane.addEventListener('change', (e) => {
            if (e.target.matches('.file-upload-input')) {
                handleFileUpload(e);
            }
        });

        editorPane.addEventListener('input', (e) => {
            const target = e.target;
            if (target.matches('.file-upload-input')) return;
            const key = target.dataset.key;
            if (!key) return;
            const value = target.type === 'checkbox' ? target.checked : target.type === 'range' ? `${target.value}px` : target.value;
            const id = target.closest('[data-id]') ? parseInt(target.closest('[data-id]').dataset.id, 10) : null;
            handleStateUpdate(key, value, id);
        });

        editorPane.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (!action) return;
            const newState = JSON.parse(JSON.stringify(state));
            let stateChanged = true;
            if (action === 'add-link') newState.links.push({ type: 'link', id: Date.now(), title: 'Nouveau Lien', url: 'https://' });
            else if (action === 'add-header') newState.links.push({ type: 'header', id: Date.now(), title: 'Nouvel En-tête' });
            else if (action === 'add-social') newState.socials.push({ id: Date.now(), url: 'https://', network: 'website' });
            else if (action === 'delete') {
                const itemEl = e.target.closest('[data-id]');
                if (!itemEl || !window.confirm("Êtes-vous sûr(e) ?")) return;
                const id = parseInt(itemEl.dataset.id, 10);
                const listName = itemEl.closest('#links-editor-list') ? 'links' : 'socials';
                newState[listName] = newState[listName].filter(item => item.id !== id);
            } else {
                stateChanged = false;
            }
            if (stateChanged) updateAndSave(newState);
        });
    }

    async function init() {
        try {
            const response = await fetch(GET_DATA_URL);
            if (!response.ok) throw new Error('Impossible de charger les données depuis Notion.');
            state = await response.json();
            saveStatusEl.textContent = 'Prêt';
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
            saveStatusEl.textContent = `Erreur: ${error.message}`;
            saveStatusEl.style.color = 'var(--danger-color)';
        }
    }
    
    init();
});