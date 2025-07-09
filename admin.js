document.addEventListener('DOMContentLoaded', () => {
    // --- ÉLÉMENTS DU DOM ---
    const editorContent = document.getElementById('editor-content');
    const contextMenu = document.getElementById('custom-context-menu');
    const saveStatusEl = document.getElementById('save-status');
    const previewFrame = document.getElementById('preview-frame');
    const modalContainer = document.getElementById('modal-container');

    // --- ÉTAT DE L'APPLICATION ---
    let state = {};

    // --- CONSTANTES ---
    const API = {
        UPDATE_SECRET_KEY: 'DINGUERIEDEVOULOIRMODIF',
        GET_DATA_URL: 'https://reliable-hamster-b1e205.netlify.app/.netlify/functions/get-data',
        UPDATE_DATA_URL: 'https://reliable-hamster-b1e205.netlify.app/.netlify/functions/update-data'
    };
    const FONT_OPTIONS = { "Inter": "'Inter', sans-serif", "Roboto": "'Roboto', sans-serif", "Montserrat": "'Montserrat', sans-serif", "Lato": "'Lato', sans-serif", "Playfair Display": "'Playfair Display', serif" };
    const SOCIAL_OPTIONS = { "twitter": "Twitter", "instagram": "Instagram", "facebook": "Facebook", "linkedin": "LinkedIn", "github": "GitHub", "youtube": "YouTube", "tiktok": "TikTok", "website": "Site Web" };
    // NOUVEAU : Dégradés prédéfinis
    const GRADIENT_OPTIONS = {
        "sunrise": { name: "Aurore", value: "linear-gradient(135deg, #FFD3A5, #FD6585)" },
        "ocean": { name: "Océan", value: "linear-gradient(135deg, #2E3192, #1BFFFF)" },
        "dusk": { name: "Crépuscule", value: "linear-gradient(135deg, #304352, #d7d2cc)" }
    };

    // --- NOUVEAU : Logique du Modal de Confirmation ---
    const showConfirmation = (title, text) => {
        return new Promise((resolve) => {
            modalContainer.innerHTML = `
                <div class="modal-box">
                    <h3 class="modal-title">${title}</h3>
                    <p class="modal-text">${text}</p>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" id="modal-cancel">Annuler</button>
                        <button class="btn btn-danger-fill" id="modal-confirm">Confirmer</button>
                    </div>
                </div>
            `;
            modalContainer.classList.add('is-visible');

            const closeModal = (result) => {
                modalContainer.classList.remove('is-visible');
                resolve(result);
            };

            document.getElementById('modal-confirm').addEventListener('click', () => closeModal(true));
            document.getElementById('modal-cancel').addEventListener('click', () => closeModal(false));
        });
    };

    // --- FONCTIONS UTILITAIRES ---
    const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });

    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    };

    // --- GESTION DE L'ÉTAT ET DE LA SAUVEGARDE ---
    const saveStateToNotion = async () => {
        if (!state || !state.profile) return;
        saveStatusEl.textContent = 'Sauvegarde...';
        saveStatusEl.style.color = '#ffc107';
        try {
            const response = await fetch(API.UPDATE_DATA_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret: API.UPDATE_SECRET_KEY, data: state }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Échec de la sauvegarde');
            }
            saveStatusEl.textContent = 'Modifications enregistrées';
            saveStatusEl.style.color = 'var(--success-color)';
        } catch (error) {
            saveStatusEl.textContent = `Erreur: ${error.message}`;
            saveStatusEl.style.color = 'var(--danger-color)';
        }
    };

    const debouncedSave = debounce(saveStateToNotion, 1500);

    const updateAndSave = (newState) => {
        state = newState;
        if (previewFrame.contentWindow) {
            previewFrame.contentWindow.postMessage({ type: 'update', payload: state }, window.location.origin);
        }
        render();
        debouncedSave();
    };
    
    const handleStateUpdate = (key, value, id) => {
        const newState = JSON.parse(JSON.stringify(state));
        if (id) {
            const list = [...(newState.links || []), ...(newState.socials || [])];
            const item = list.find(i => i.id === id);
            if(item) item[key] = value;
        } else {
            let current = newState;
            const keyParts = key.split('.');
            keyParts.forEach((part, index) => {
                if (index === keyParts.length - 1) current[part] = value;
                else current = current[part] = current[part] || {};
            });
        }
        updateAndSave(newState);
    };

    // --- FONCTIONS DE RENDU (GÉNÉRATION DU HTML) ---
    const render = () => {
        if (!editorContent || !state.profile) return;
        
        const focusedElement = document.activeElement;
        const focusedElementId = focusedElement ? focusedElement.id : null;
        const selectionStart = focusedElement ? focusedElement.selectionStart : null;
        const selectionEnd = focusedElement ? focusedElement.selectionEnd : null;
        const scrollPosition = editorContent.parentElement.scrollTop;

        editorContent.innerHTML = `
            ${createProfileCard(state.profile)}
            ${createAppearanceCard(state.appearance)}
            ${createItemsCard('Icônes Sociales', state.socials || [], createSocialItemHTML, 'add-social', 'Ajouter une icône')}
            ${createItemsCard('Liens & En-têtes', state.links || [], createLinkItemHTML, 'add-link', 'Ajouter un lien')}
            ${createSettingsCard(state.seo)}
        `;
        
        if (focusedElementId) {
            const reFocusedElement = document.getElementById(focusedElementId);
            if (reFocusedElement) {
                reFocusedElement.focus();
                if(selectionStart !== null && selectionEnd !== null){
                   reFocusedElement.setSelectionRange(selectionStart, selectionEnd);
                }
            }
        }
        editorContent.parentElement.scrollTop = scrollPosition;
    };
    
    const createFileUploadHTML = (key, currentSrc, label, id = '') => {
        const uniqueId = `upload-${key.replace(/\./g, '-')}-${id || 'main'}`;
        return `<div class="form-group">
            <label>${label}</label>
            <label class="file-upload-wrapper" for="${uniqueId}">
                ${currentSrc && currentSrc.startsWith('data:image') ? `<img src="${currentSrc}" alt="Aperçu" class="file-upload-preview">` : ''}
                <span class="file-upload-text">${currentSrc && currentSrc.startsWith('data:image') ? 'Cliquez pour changer' : '<strong>Cliquez pour téléverser</strong>'}</span>
            </label>
            <input type="file" id="${uniqueId}" data-key="${key}" class="file-upload-input" accept="image/*">
        </div>`;
    };
    
    const createColorInputHTML = (key, value, label) => {
        const uniqueId = `color-${key.replace(/\./g, '-')}`;
        return `<div class="form-group">
                <label for="${uniqueId}-hex">${label}</label>
                <div class="color-picker-wrapper">
                    <input type="text" id="${uniqueId}-hex" data-key="${key}" value="${value || ''}" class="color-hex-input">
                    <label class="color-swatch" style="background-color: ${value || '#FFFFFF'};" for="${uniqueId}-picker"></label>
                    <input type="color" id="${uniqueId}-picker" data-key="${key}" value="${value || '#FFFFFF'}">
                </div>
            </div>`;
    };

    const createProfileCard = (profile) => `
        <div class="card" id="card-profile">
            <div class="card-header"><h2>Profil</h2></div>
            <div class="card-body">
                ${createFileUploadHTML('profile.pictureUrl', profile.pictureUrl, 'Photo de profil')}
                <div class="form-group">
                    <label for="profile-title">Titre du profil</label>
                    <input type="text" id="profile-title" data-key="profile.title" value="${profile.title || ''}" placeholder="@VotreNom">
                </div>
            </div>
        </div>
    `;
    
    const createAppearanceCard = (appearance) => {
        const fontOpts = Object.entries(FONT_OPTIONS).map(([n, v]) => `<option value="${v}" style="font-family: ${v};" ${appearance.fontFamily === v ? 'selected' : ''}>${n}</option>`).join('');
        const bg = appearance.background || {};
        
        // NOUVEAU : Logique pour les dégradés prédéfinis
        const gradientOpts = Object.entries(GRADIENT_OPTIONS).map(([key, { name, value }]) => `<option value="${key}" ${bg.value === key ? 'selected' : ''}>${name}</option>`).join('');
        
        const bgControls = () => {
            switch(bg.type) {
                case 'solid':
                    return createColorInputHTML('appearance.background.value', bg.value, 'Couleur de fond');
                case 'gradient':
                    return `<div class="form-group"><label for="gradient-select">Choisir un dégradé</label><select id="gradient-select" data-key="appearance.background.value">${gradientOpts}</select></div>`;
                case 'image':
                    return createFileUploadHTML('appearance.background.value', bg.value, 'Image de fond');
                default:
                    return '';
            }
        };

        return `
        <div class="card" id="card-appearance">
            <div class="card-header"><h2>Apparence</h2></div>
            <div class="card-body">
                <div class="form-group"><label for="font-select">Police</label><select id="font-select" data-key="appearance.fontFamily">${fontOpts}</select></div>
                ${createColorInputHTML('appearance.textColor', appearance.textColor, 'Couleur du texte')}
                <div class="form-group"><label for="bg-type-select">Type de fond</label><select id="bg-type-select" data-key="appearance.background.type"><option value="solid" ${bg.type === 'solid' ? 'selected' : ''}>Couleur unie</option><option value="gradient" ${bg.type === 'gradient' ? 'selected' : ''}>Dégradé</option><option value="image" ${bg.type === 'image' ? 'selected' : ''}>Image</option></select></div>
                <div id="background-controls">${bgControls()}</div>
                <hr style="border:none; border-top:1px solid var(--border-color); margin: 24px 0;">
                <div class="form-grid">
                    ${createColorInputHTML('appearance.button.backgroundColor', appearance.button.backgroundColor, 'Fond des boutons')}
                    ${createColorInputHTML('appearance.button.textColor', appearance.button.textColor, 'Texte des boutons')}
                </div>
            </div>
        </div>
        `;
    };

    const createItemsCard = (title, items, itemRenderer, addAction, addLabel) => {
        const itemsHTML = (items || []).map(item => itemRenderer(item)).join('');
        return `<div class="card">
            <div class="card-header"><h2>${title}</h2><button data-action="${addAction}" class="btn btn-secondary">${addLabel}</button></div>
            <div class="card-body">${itemsHTML.length > 0 ? itemsHTML : '<p class="empty-state">Aucun élément. Cliquez sur "Ajouter" pour commencer.</p>'}</div>
        </div>`;
    };
    
    const createSocialItemHTML = (item) => {
        const socialOpts = Object.entries(SOCIAL_OPTIONS).map(([key, name]) => `<option value="${key}" ${item.network === key ? 'selected' : ''}>${name}</option>`).join('');
        return `<div class="item-container" data-id="${item.id}">
            <div class="item-header"><span>Icône : ${SOCIAL_OPTIONS[item.network] || item.network}</span><button data-action="delete" class="btn btn-danger">✖</button></div>
            <div class="form-group"><label for="social-network-${item.id}">Réseau</label><select id="social-network-${item.id}" data-key="network">${socialOpts}</select></div>
            <div class="form-group"><label for="social-url-${item.id}">URL ou Pseudo</label><input type="text" id="social-url-${item.id}" data-key="url" value="${item.url || ''}"></div>
        </div>`;
    };

    const createLinkItemHTML = (item) => {
        if (item.type === 'header') {
            return `<div class="item-container" data-id="${item.id}">
                <div class="item-header"><span>En-tête</span><button data-action="delete" class="btn btn-danger">✖</button></div>
                <div class="form-group"><label for="header-title-${item.id}">Texte</label><input type="text" id="header-title-${item.id}" data-key="title" value="${item.title || ''}"></div>
            </div>`;
        }
        return `<div class="item-container" data-id="${item.id}">
            <div class="item-header"><span>Lien : ${item.title}</span><button data-action="delete" class="btn btn-danger">✖</button></div>
            <div class="form-group"><label for="link-title-${item.id}">Titre</label><input type="text" id="link-title-${item.id}" data-key="title" value="${item.title || ''}"></div>
            <div class="form-group"><label for="link-url-${item.id}">URL</label><input type="text" id="link-url-${item.id}" data-key="url" value="${item.url || ''}"></div>
            ${createFileUploadHTML('thumbnailUrl', item.thumbnailUrl, 'Miniature', item.id)}
        </div>`;
    };
    
    const createSettingsCard = (seo) => `
        <div class="card" id="card-settings">
            <div class="card-header"><h2>Paramètres (SEO)</h2></div>
            <div class="card-body">
                <div class="form-group"><label for="seo-title">Titre</label><input type="text" id="seo-title" data-key="seo.title" value="${seo.title || ''}"></div>
                <div class="form-group"><label for="seo-desc">Description</label><input type="text" id="seo-desc" data-key="seo.description" value="${seo.description || ''}"></div>
                ${createFileUploadHTML('seo.faviconUrl', seo.faviconUrl, 'Favicon')}
            </div>
        </div>
    `;
    
    const handleFileUploadWrapper = async (e) => {
        const file = e.target.files[0];
        const key = e.target.dataset.key;
        if (!key) return;
        const id = e.target.closest('[data-id]') ? parseInt(e.target.closest('[data-id]').dataset.id, 10) : null;
        try {
            const base64String = await readFileAsBase64(file);
            handleStateUpdate(key, base64String, id);
        } catch (error) {
            console.error(error);
            showConfirmation('Erreur', 'Le fichier n\'a pas pu être lu.');
        }
    };

    function attachEventListeners() {
        if (!editorContent) return;
        
        editorContent.addEventListener('change', e => {
            if (e.target.matches('.file-upload-input')) return handleFileUploadWrapper(e);
            if (e.target.dataset.key) {
                const id = e.target.closest('[data-id]') ? parseInt(e.target.closest('[data-id]').dataset.id, 10) : null;
                handleStateUpdate(e.target.dataset.key, e.target.value, id);
            }
        });
        
        editorContent.addEventListener('input', debounce(e => {
            const target = e.target;
            if (!target.dataset.key || target.matches('select, [type=file], [type=color]')) return;
            const id = target.closest('[data-id]') ? parseInt(target.closest('[data-id]').dataset.id, 10) : null;
            handleStateUpdate(target.dataset.key, target.value, id);
        }, 300));

        editorContent.addEventListener('click', async (e) => {
            const actionTarget = e.target.closest('[data-action]');
            if (!actionTarget) return;
            const action = actionTarget.dataset.action;
            e.preventDefault();
            const newState = JSON.parse(JSON.stringify(state));
            let stateChanged = true;

            if (action === 'delete') {
                const itemEl = e.target.closest('[data-id]');
                const confirmed = await showConfirmation('Êtes-vous sûr(e) ?', 'Cette action est irréversible.');
                if (!itemEl || !confirmed) return;
                const id = parseInt(itemEl.dataset.id, 10);
                newState.links = (newState.links || []).filter(item => item.id !== id);
                newState.socials = (newState.socials || []).filter(item => item.id !== id);
            } else if (action === 'add-link') {
                newState.links.push({ type: 'link', id: Date.now(), title: 'Nouveau Lien', url: 'https://' });
            } else if (action === 'add-header') {
                newState.links.push({ type: 'header', id: Date.now(), title: 'Nouvel En-tête' });
            } else if (action === 'add-social') {
                newState.socials.push({ id: Date.now(), url: 'https://', network: 'website' });
            } else { stateChanged = false; }

            if (stateChanged) updateAndSave(newState);
        });
        
        window.addEventListener('message', e => {
            if (e.data.type === 'showContextMenu') showContextMenu(e.data.payload);
        });

        document.addEventListener('click', () => hideContextMenu());
        contextMenu.addEventListener('click', e => handleContextMenuAction(e));
    }

    function showContextMenu({ id, x, y }) {
        contextMenu.style.top = `${y}px`;
        contextMenu.style.left = `${x}px`;
        contextMenu.style.display = 'block';
        contextMenu.innerHTML = `<div class="context-menu-item" data-action="edit" data-target-id="${id}">✏️ Aller à l'élément</div><div class="context-menu-item delete" data-action="delete-context" data-target-id="${id}">🗑️ Supprimer</div>`;
    }
    
    function hideContextMenu() {
        if (contextMenu) contextMenu.style.display = 'none';
    }

    async function handleContextMenuAction(e) {
        e.stopPropagation();
        hideContextMenu();
        const { action, targetId } = e.target.dataset;
        if (!action || !targetId) return;
        
        const [type, idStr] = targetId.split('.');
        const id = parseInt(idStr, 10);

        if (action === 'edit') {
            const selector = id ? `[data-id="${id}"]` : `#card-${type}`;
            const elementToFocus = document.querySelector(selector);
            if (elementToFocus) elementToFocus.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (action === 'delete-context') {
            const confirmed = await showConfirmation('Êtes-vous sûr(e) ?', 'Cette action est irréversible.');
            if (!confirmed) return;
            const newState = JSON.parse(JSON.stringify(state));
            const listName = type;
            if (newState[listName] && id) {
                newState[listName] = newState[listName].filter(item => item.id !== id);
                updateAndSave(newState);
            }
        }
    }

    async function init() {
        if (!editorContent) return;
        editorContent.innerHTML = `<div class="empty-state">Chargement...</div>`;
        try {
            const response = await fetch(API.GET_DATA_URL);
            if (!response.ok) throw new Error(`Erreur réseau (${response.status})`);
            state = await response.json();
            if (!state.profile) throw new Error("Les données reçues sont invalides ou vides.");
            
            saveStatusEl.textContent = 'Prêt';
            saveStatusEl.style.color = 'var(--success-color)';
            render();
            attachEventListeners();

            previewFrame.addEventListener('load', () => {
                if (previewFrame.contentWindow && state.profile) {
                    previewFrame.contentWindow.postMessage({ type: 'update', payload: state }, window.location.origin);
                }
            });
        } catch (error) {
            saveStatusEl.textContent = `Erreur`;
            saveStatusEl.style.color = 'var(--danger-color)';
            editorContent.innerHTML = `<div class="error-state"><strong>Impossible de charger la configuration.</strong><br>${error.message}<br>Veuillez vérifier votre connexion et la configuration de Notion.</div>`;
        }
    }
    
    init();
});