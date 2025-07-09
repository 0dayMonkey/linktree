document.addEventListener('DOMContentLoaded', () => {
    const editorSections = document.getElementById('editor-sections');
    const previewFrame = document.getElementById('preview-frame');
    const saveStatusEl = document.getElementById('save-status');

    const UPDATE_SECRET_KEY = 'DINGUERIEDEVOULOIRMODIF';
    const GET_DATA_URL = 'https://reliable-hamster-b1e205.netlify.app/.netlify/functions/get-data';
    const UPDATE_DATA_URL = 'https://reliable-hamster-b1e205.netlify.app/.netlify/functions/update-data';

    let state = {};

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
            const id = e.target.closest('[data-id]') ? parseInt(e.target.closest('[data-id]').dataset.id, 10) : null;
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
        saveStatusEl.textContent = 'Sauvegarde...';
        saveStatusEl.style.color = '#ffc107';

        try {
            const response = await fetch(UPDATE_DATA_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret: UPDATE_SECRET_KEY, data: state }),
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

    const render = () => {
        if (!state.profile) return;
        editorSections.innerHTML = `
            ${createProfileCard(state.profile)}
            ${createAppearanceCard(state.appearance)}
            ${createSocialsCard(state.socials)}
            ${createLinksCard(state.links)}
            ${createSettingsCard(state.seo)}
        `;
    };
    
    const createFileUploadHTML = (key, currentSrc, label) => {
        return `
            <div class="form-group">
                <label>${label}</label>
                <label class="file-upload-wrapper" for="${key}-upload">
                    ${currentSrc ? `<img src="${currentSrc}" alt="Aperçu" class="file-upload-preview">` : ''}
                    <span class="file-upload-text">${currentSrc ? 'Cliquez pour changer' : '<strong>Cliquez pour téléverser</strong> ou glissez-déposez'}</span>
                </label>
                <input type="file" id="${key}-upload" data-key="${key}" class="file-upload-input" accept="image/*">
            </div>
        `;
    };

    const createColorInputHTML = (key, value, label) => {
        return `
            <div class="form-group">
                <label>${label}</label>
                <div class="color-picker-wrapper">
                    <input type="text" data-key="${key}" value="${value}" class="color-hex-input">
                    <label class="color-swatch" style="background-color: ${value};" for="${key}-color-input"></label>
                    <input type="color" id="${key}-color-input" data-key="${key}" value="${value}">
                </div>
            </div>
        `;
    };

    const createProfileCard = (profile) => `
        <div class="card">
            <div class="card-header"><h2>Profil</h2></div>
            <div class="card-body">
                ${createFileUploadHTML('profile.pictureUrl', profile.pictureUrl, 'Photo de profil')}
                <div class="form-group">
                    <label for="profile-title">Titre du profil</label>
                    <input type="text" id="profile-title" data-key="profile.title" value="${profile.title}" placeholder="@VotreNom">
                </div>
            </div>
        </div>
    `;

    const createAppearanceCard = (appearance) => {
        const fontOpts = Object.entries({ "Inter": "'Inter', sans-serif", "Roboto": "'Roboto', sans-serif", "Montserrat": "'Montserrat', sans-serif" })
            .map(([n, v]) => `<option value="${v}" style="font-family: ${v};" ${appearance.fontFamily === v ? 'selected' : ''}>${n}</option>`).join('');
        
        const bg = appearance.background;
        const bgValue = Array.isArray(bg.value) ? bg.value : (bg.value || '').split(',');
        const bgControls = `
            ${bg.type === 'solid' ? createColorInputHTML('appearance.background.value', bg.value, 'Couleur de fond') : ''}
            ${bg.type === 'gradient' ? `<div class="form-grid">
                ${createColorInputHTML('appearance.background.value.0', bgValue[0] || '#FFFFFF', 'Couleur 1')}
                ${createColorInputHTML('appearance.background.value.1', bgValue[1] || '#000000', 'Couleur 2')}
            </div>` : ''}
            ${bg.type === 'image' ? createFileUploadHTML('appearance.background.value', bg.value, 'Image de fond') : ''}
        `;

        return `
        <div class="card">
            <div class="card-header"><h2>Apparence</h2></div>
            <div class="card-body">
                <div class="form-group"><label>Police</label><select data-key="appearance.fontFamily">${fontOpts}</select></div>
                ${createColorInputHTML('appearance.textColor', appearance.textColor, 'Couleur du texte de la page')}
                <div class="form-group"><label>Type de fond</label><select data-key="appearance.background.type"><option value="solid" ${bg.type === 'solid' ? 'selected' : ''}>Couleur unie</option><option value="gradient" ${bg.type === 'gradient' ? 'selected' : ''}>Dégradé</option><option value="image" ${bg.type === 'image' ? 'selected' : ''}>Image</option></select></div>
                ${bgControls}
                <hr style="border:none; border-top:1px solid var(--border-color); margin: 24px 0;">
                <div class="form-grid">
                    ${createColorInputHTML('appearance.button.backgroundColor', appearance.button.backgroundColor, 'Fond des boutons')}
                    ${createColorInputHTML('appearance.button.textColor', appearance.button.textColor, 'Texte des boutons')}
                </div>
            </div>
        </div>
        `;
    };

    const createSocialsCard = (socials) => {
         const itemsHTML = socials.map(item => `
            <div class="item-container" data-id="${item.id}">
                <div class="item-header"><span class="item-title">${item.network}</span><button data-action="delete" class="btn btn-danger delete-btn">X</button></div>
            </div>
        `).join('');
        return `
        <div class="card">
            <div class="card-header"><div class="section-header"><h2>Icônes Sociales</h2><button data-action="add-social" class="btn btn-secondary">Ajouter</button></div></div>
            <div class="card-body">${itemsHTML}</div>
        </div>
        `;
    };

    const createLinksCard = (links) => {
         const itemsHTML = links.map(item => `
            <div class="item-container" data-id="${item.id}">
                <div class="item-header"><span class="item-title">${item.title}</span><button data-action="delete" class="btn btn-danger delete-btn">X</button></div>
            </div>
        `).join('');
        return `
        <div class="card">
            <div class="card-header"><div class="section-header"><h2>Liens & En-têtes</h2><button data-action="add-link" class="btn btn-primary">Ajouter un lien</button></div></div>
            <div class="card-body">${itemsHTML}</div>
        </div>
        `;
    };

    const createSettingsCard = (seo) => `
        <div class="card">
            <div class="card-header"><h2>Paramètres (SEO)</h2></div>
            <div class="card-body">
                 <div class="form-group"><label>Titre de la page</label><input type="text" data-key="seo.title" value="${seo.title}"></div>
                 ${createFileUploadHTML('seo.faviconUrl', seo.faviconUrl, 'Favicon')}
            </div>
        </div>
    `;

    function handleStateUpdate(key, value, id) {
        const newState = JSON.parse(JSON.stringify(state));
        if (id) {
            const listName = state.links.some(i => i.id === id) ? 'links' : 'socials';
            const item = newState[listName].find(i => i.id === id);
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
    }
    
    function attachEventListeners() {
        editorSections.addEventListener('change', e => {
            if (e.target.matches('.file-upload-input')) handleFileUpload(e);
            else {
                const key = e.target.dataset.key;
                if (!key) return;
                const value = e.target.value;
                const id = e.target.closest('[data-id]') ? parseInt(e.target.closest('[data-id]').dataset.id, 10) : null;
                handleStateUpdate(key, value, id);
            }
        });
        
        editorSections.addEventListener('input', e => {
            const key = e.target.dataset.key;
            if (!key || e.target.matches('select, [type=file]')) return;
             const value = e.target.value;
             const id = e.target.closest('[data-id]') ? parseInt(e.target.closest('[data-id]').dataset.id, 10) : null;
             handleStateUpdate(key, value, id);
        });

        editorSections.addEventListener('click', e => {
            const action = e.target.dataset.action;
            if (!action) return;
            const newState = JSON.parse(JSON.stringify(state));
            let stateChanged = true;
            if (action === 'add-link') newState.links.push({ type: 'link', id: Date.now(), title: 'Nouveau Lien', url: 'https://' });
            else if (action === 'add-social') newState.socials.push({ id: Date.now(), url: 'https://', network: 'website' });
            else if (action === 'delete') {
                const itemEl = e.target.closest('[data-id]');
                if (!itemEl || !window.confirm("Êtes-vous sûr(e) ?")) return;
                const id = parseInt(itemEl.dataset.id, 10);
                const isLink = state.links.some(i => i.id === id);
                const listName = isLink ? 'links' : 'socials';
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
            if (!response.ok) throw new Error('Impossible de charger les données.');
            state = await response.json();
            saveStatusEl.textContent = 'Prêt';
            saveStatusEl.style.color = 'var(--success-color)';
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