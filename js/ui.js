import { FONT_OPTIONS, SOCIAL_OPTIONS, GRADIENT_OPTIONS } from './config.js';
import { ICONS } from './icons.js';

const editorContent = document.getElementById('editor-content');
const contextMenu = document.getElementById('custom-context-menu');
const modalContainer = document.getElementById('modal-container');
const previewFrame = document.getElementById('preview-frame');

export function render(state) {
    if (!editorContent || !state.profile) return;
    
    const focusedElement = document.activeElement;
    const selection = window.getSelection ? window.getSelection() : null;
    let selectionInfo = null;
    if (selection && selection.rangeCount > 0 && focusedElement && focusedElement.isContentEditable) {
        const range = selection.getRangeAt(0);
        selectionInfo = {
            element: focusedElement,
            start: range.startOffset,
            end: range.endOffset,
        };
    }

    const scrollPosition = editorContent.scrollTop;

    editorContent.innerHTML = `
        ${createProfileCard(state.profile, state.appearance)}
        ${createAppearanceCard(state.appearance)}
        ${createItemsCard('Icônes Sociales', state.socials || [], createSocialItemHTML, 'add-social', 'Ajouter une icône')}
        ${createItemsCard('Liens & En-têtes', state.links || [], createLinkItemHTML, 'add-link', 'Ajouter un lien', 'add-header', 'Ajouter un en-tête')}
        ${createSettingsCard(state.seo)}
    `;
    
    if (selectionInfo && selectionInfo.element) {
        const newElement = document.getElementById(selectionInfo.element.id);
        if (newElement) {
            newElement.focus();
            const newRange = document.createRange();
            // Ensure child nodes exist before setting range
            if (newElement.childNodes.length > 0) {
                 const textNode = newElement.firstChild;
                 // Clamp offsets to the actual length of the text node
                 const startOffset = Math.min(selectionInfo.start, textNode.length);
                 const endOffset = Math.min(selectionInfo.end, textNode.length);
                 newRange.setStart(textNode, startOffset);
                 newRange.setEnd(textNode, endOffset);
                 selection.removeAllRanges();
                 selection.addRange(newRange);
            }
        }
    } else if (focusedElement) {
        const reFocusedElement = document.getElementById(focusedElement.id);
        if (reFocusedElement) {
            reFocusedElement.focus();
        }
    }
    
    editorContent.scrollTop = scrollPosition;
}


export function renderSkeleton() {
    return `
        <div class="card">
            <div class="card-header skeleton" style="height: 53px;"></div>
            <div class="card-body">
                <div class="skeleton skeleton-avatar"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text skeleton-text-short"></div>
            </div>
        </div>
        <div class="card">
            <div class="card-header skeleton" style="height: 53px;"></div>
            <div class="card-body">
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text skeleton-text-short"></div>
            </div>
        </div>
        <div class="card">
            <div class="card-header skeleton" style="height: 53px;"></div>
            <div class="card-body">
                <div class="skeleton skeleton-item"></div>
            </div>
        </div>
    `;
}

export function showConfirmation(title, text) {
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
}

export function showContextMenu({ id, x, y }) {
    if (!contextMenu || !previewFrame) return;

    const iframeRect = previewFrame.getBoundingClientRect();
    const finalX = iframeRect.left + x;
    const finalY = iframeRect.top + y;

    contextMenu.style.top = `${finalY}px`;
    contextMenu.style.left = `${finalX}px`;
    contextMenu.style.display = 'block';
    contextMenu.innerHTML = `<div class="context-menu-item" data-action="edit" data-target-id="${id}">✏️ Aller à l'élément</div><div class="context-menu-item delete" data-action="delete-context" data-target-id="${id}">🗑️ Supprimer</div>`;
}
    
export function hideContextMenu() {
    if (contextMenu) contextMenu.style.display = 'none';
}

function createFileUploadHTML(key, currentSrc, label, id = '', accept = 'image/*') {
    const uniqueId = `upload-${key.replace(/\./g, '-')}-${id || 'main'}`;
    const closestId = id ? `data-id="${id}"` : '';
    return `<div class="form-group" ${closestId}>
        <label>${label}</label>
        <label class="file-upload-wrapper" for="${uniqueId}">
            ${currentSrc && currentSrc.startsWith('data:image') ? `<img src="${currentSrc}" alt="Aperçu" class="file-upload-preview">` : ''}
            <span class="file-upload-text">${currentSrc && currentSrc.startsWith('data:image') ? 'Cliquez pour changer' : '<strong>Cliquez pour téléverser</strong>'}</span>
        </label>
        <input type="file" id="${uniqueId}" data-key="${key}" class="file-upload-input" accept="${accept}">
    </div>`;
}

function createColorInputHTML(key, value, label) {
    const uniqueId = `color-${key.replace(/\./g, '-')}`;
    return `<div class="form-group">
            <label for="${uniqueId}-hex">${label}</label>
            <div class="color-picker-wrapper">
                <input type="text" id="${uniqueId}-hex" data-key="${key}" value="${value || ''}" class="color-hex-input" maxlength="7">
                <label class="color-swatch" style="background-color: ${value || '#FFFFFF'};" for="${uniqueId}-picker"></label>
                <input type="color" id="${uniqueId}-picker" data-key="${key}" value="${value || '#FFFFFF'}">
            </div>
        </div>`;
}

function createCustomSelectHTML(key, options, selectedValue, { id = null, type = 'default' } = {}) {
    let selectedDisplay = 'Sélectionner...';

    if (selectedValue) {
        if (type === 'font') {
            const fontName = Object.keys(FONT_OPTIONS).find(name => FONT_OPTIONS[name] === selectedValue);
            if (fontName) {
                 selectedDisplay = `<span style="font-family: ${selectedValue};">${fontName}</span>`;
            }
        } else if (type === 'social') {
            const socialName = options[selectedValue];
            if (socialName) {
                selectedDisplay = `<div>${ICONS[selectedValue] || ''}<span>${socialName}</span></div>`;
            }
        } else if (type === 'gradient'){
            const gradient = Object.values(options).find(g => g.value === selectedValue);
            if(gradient) {
                selectedDisplay = `<span>${gradient.name}</span>`;
            }
        }
        else {
             const option = options[selectedValue];
             selectedDisplay = option ? (option.name || option) : selectedValue;
        }
    }

    const optionsHTML = Object.entries(options).map(([val, display]) => {
        let finalDisplay;
        let style = '';
        let valueAttr = val;
        
        if (type === 'font') {
            finalDisplay = val; // The key is the font name
            style = `font-family: '${val}', sans-serif;`;
            valueAttr = display; // The value is the font-family string
        } else if (type === 'social') {
            finalDisplay = `<span>${display}</span>`;
            if (ICONS[val]) finalDisplay = `${ICONS[val]}${finalDisplay}`;
        } else if (type === 'gradient'){
            finalDisplay = display.name;
            valueAttr = display.value;
        }
        else {
             finalDisplay = display.name || display;
        }
        
        const isSelected = selectedValue === valueAttr;
        return `<div data-value="${valueAttr}" style="${style}" class="${isSelected ? 'same-as-selected' : ''}">${finalDisplay}</div>`;
    }).join('');

    const dataIdAttr = id ? `data-id="${id}"` : '';

    return `
        <div class="custom-select" data-key="${key}" ${dataIdAttr}>
            <div class="select-selected">${selectedDisplay}</div>
            <div class="select-items select-hide">${optionsHTML}</div>
        </div>
    `;
}

function createProfileCard(profile, appearance) {
    const layoutOptions = { circle: "Cercle", full: "Pleine largeur" };
    return `<div class="card" id="card-profile">
        <div class="card-header"><h2>Profil</h2></div>
        <div class="card-body">
            ${createFileUploadHTML('profile.pictureUrl', profile.pictureUrl, 'Photo de profil')}
            <div class="form-group">
                <label>Mise en page de la photo</label>
                ${createCustomSelectHTML('appearance.pictureLayout', layoutOptions, appearance.pictureLayout, { type: 'default' })}
            </div>
            <hr style="border:none; border-top:1px solid var(--border-color); margin: 24px 0;">
            <div class="form-group">
                <label for="profile-title-input">Titre du profil</label>
                <div id="profile-title-input" data-key="profile.title" class="editable-content" contenteditable="true" data-placeholder="@VotreNom">${profile.title || ''}</div>
            </div>
            <div class="form-group">
                <label for="profile-description-input">Description</label>
                <div id="profile-description-input" data-key="profile.description" class="editable-content" contenteditable="true" data-placeholder="Votre bio...">${profile.description || ''}</div>
            </div>
        </div>
    </div>`;
}

function createAppearanceCard(appearance) {
    const bg = appearance.background || {};
    const bgTypeOptions = { solid: "Couleur unie", gradient: "Dégradé", image: "Image" };

    const bgControls = () => {
        switch(bg.type) {
            case 'solid': return createColorInputHTML('appearance.background.value', bg.value, 'Couleur de fond');
            case 'gradient': return `<div class="form-group"><label>Choisir un dégradé</label>${createCustomSelectHTML('appearance.background.value', GRADIENT_OPTIONS, bg.value, { type: 'gradient' })}</div>`;
            case 'image': return createFileUploadHTML('appearance.background.value', bg.value, 'Image de fond');
            default: return '';
        }
    };
    return `<div class="card" id="card-appearance">
        <div class="card-header"><h2>Apparence</h2></div>
        <div class="card-body">
            <div class="form-group"><label>Police</label>${createCustomSelectHTML('appearance.fontFamily', FONT_OPTIONS, appearance.fontFamily, { type: 'font' })}</div>
            ${createColorInputHTML('appearance.textColor', appearance.textColor, 'Couleur du texte')}
            <div class="form-group"><label>Type de fond</label>${createCustomSelectHTML('appearance.background.type', bgTypeOptions, bg.type, { type: 'bg_type'})}</div>
            <div id="background-controls">${bgControls()}</div>
            <hr style="border:none; border-top:1px solid var(--border-color); margin: 24px 0;">
            <div class="form-grid">
                ${createColorInputHTML('appearance.button.backgroundColor', appearance.button.backgroundColor, 'Fond des boutons')}
                ${createColorInputHTML('appearance.button.textColor', appearance.button.textColor, 'Texte des boutons')}
            </div>
        </div>
    </div>`;
}


function createItemsCard(title, items, itemRenderer, addAction1, addLabel1, addAction2, addLabel2) {
    const itemsHTML = (items || []).map(item => itemRenderer(item)).join('');
    const buttons = `
        <button data-action="${addAction1}" class="btn btn-secondary">${addLabel1}</button>
        ${addAction2 ? `<button data-action="${addAction2}" class="btn btn-secondary">${addLabel2}</button>` : ''}
    `;
    return `<div class="card" data-list-name="${title.toLowerCase().replace(/ /g, '-')}">
        <div class="card-header"><h2>${title}</h2><div style="display:flex; gap: 8px;">${buttons}</div></div>
        <div class="card-body">${itemsHTML.length > 0 ? itemsHTML : '<p class="empty-state">Aucun élément.</p>'}</div>
    </div>`;
}

function createSocialItemHTML(item) {
    return `<div class="item-container" data-id="${item.id}" draggable="true">
        <div class="item-header"><span>Icône</span><button data-action="delete" class="btn btn-danger">✖</button></div>
        <div class="form-group"><label>Réseau</label>${createCustomSelectHTML('network', SOCIAL_OPTIONS, item.network, { id: item.id, type: 'social' })}</div>
        <div class="form-group"><label for="social-url-${item.id}">URL</label><input type="text" id="social-url-${item.id}" data-key="url" data-id="${item.id}" value="${item.url || ''}"></div>
    </div>`;
}

function createLinkItemHTML(item) {
    const dataIdAttr = `data-id="${item.id}"`;
    if (item.type === 'header') {
        return `<div class="item-container" ${dataIdAttr} draggable="true">
            <div class="item-header"><span>En-tête</span><button data-action="delete" class="btn btn-danger">✖</button></div>
            <div class="form-group"><label for="header-title-${item.id}">Texte</label>
                <div id="header-title-${item.id}" data-key="title" class="editable-content" contenteditable="true" data-placeholder="Nouvel en-tête">${item.title || ''}</div>
            </div>
        </div>`;
    }
    return `<div class="item-container" ${dataIdAttr} draggable="true">
        <div class="item-header"><span>Lien</span><button data-action="delete" class="btn btn-danger">✖</button></div>
        <div class="form-group"><label for="link-title-${item.id}">Titre</label>
            <div id="link-title-${item.id}" data-key="title" class="editable-content" contenteditable="true" data-placeholder="Titre du lien">${item.title || ''}</div>
        </div>
        <div class="form-group"><label for="link-url-${item.id}">URL</label><input type="text" id="link-url-${item.id}" data-key="url" data-id="${item.id}" value="${item.url || ''}"></div>
        ${createFileUploadHTML('thumbnailUrl', item.thumbnailUrl, 'Miniature', item.id)}
    </div>`;
}

function createSettingsCard(seo) {
    const faviconAccept = "image/x-icon,image/png,image/svg+xml,image/vnd.microsoft.icon";
    return `<div class="card" id="card-settings">
        <div class="card-header"><h2>Paramètres (SEO)</h2></div>
        <div class="card-body">
            <div class="form-group"><label for="seo-title">Titre</label><input type="text" id="seo-title" data-key="seo.title" value="${seo.title || ''}"></div>
            <div class="form-group"><label for="seo-desc">Description</label><input type="text" id="seo-desc" data-key="seo.description" value="${seo.description || ''}"></div>
            ${createFileUploadHTML('seo.faviconUrl', seo.faviconUrl, 'Favicon', '', faviconAccept)}
        </div>
    </div>`;
}