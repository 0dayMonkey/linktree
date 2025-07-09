import { FONT_OPTIONS, SOCIAL_OPTIONS, GRADIENT_OPTIONS } from './config.js';
import { ICONS } from './icons.js';

const editorContent = document.getElementById('editor-content');
const contextMenu = document.getElementById('custom-context-menu');
const modalContainer = document.getElementById('modal-container');
const previewFrame = document.getElementById('preview-frame');

export function render(state) {
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
        ${createItemsCard('Liens & En-têtes', state.links || [], createLinkItemHTML, 'add-link', 'Ajouter un lien', 'add-header', 'Ajouter un en-tête')}
        ${createSettingsCard(state.seo)}
    `;
    
    if (focusedElementId) {
        const reFocusedElement = document.getElementById(focusedElementId);
        if (reFocusedElement) {
            reFocusedElement.focus();
            if (typeof reFocusedElement.setSelectionRange === 'function') {
               reFocusedElement.setSelectionRange(selectionStart, selectionEnd);
            }
        }
    }
    editorContent.parentElement.scrollTop = scrollPosition;
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
    return `<div class="form-group">
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
                <input type="text" id="${uniqueId}-hex" data-key="${key}" value="${value || ''}" class="color-hex-input">
                <label class="color-swatch" style="background-color: ${value || '#FFFFFF'};" for="${uniqueId}-picker"></label>
                <input type="color" id="${uniqueId}-picker" data-key="${key}" value="${value || '#FFFFFF'}">
            </div>
        </div>`;
}

function createCustomSelectHTML(key, options, selectedValue, { id = null, type = 'default' } = {}) {
    let selectedDisplay = 'Sélectionner...';

    if (selectedValue) {
        if (type === 'font') {
            const font = Object.values(options).find(f => f.value === selectedValue);
            if (font) {
                selectedDisplay = `<span style="font-family: ${font.value};">${font.name}</span>`;
            }
        } else if (type === 'social') {
            const socialName = options[selectedValue];
            if (socialName) {
                selectedDisplay = `<div>${ICONS[selectedValue] || ''}<span>${socialName}</span></div>`;
            }
        } else {
             const option = options[selectedValue];
             selectedDisplay = option ? (option.name || option) : selectedValue;
        }
    }

    const optionsHTML = Object.entries(options).map(([val, display]) => {
        let finalDisplay;
        let style = '';
        const isSelected = type === 'font' ? selectedValue === display.value : selectedValue === val;

        if (type === 'font') {
            finalDisplay = display.name;
            style = `font-family: ${display.value};`;
        } else if (type === 'social') {
            finalDisplay = `<span>${display}</span>`;
            if (ICONS[val]) finalDisplay = `${ICONS[val]}${finalDisplay}`;
        } else {
             finalDisplay = display.name || display;
        }
        return `<div data-value="${val}" style="${style}" class="${isSelected ? 'same-as-selected' : ''}">${finalDisplay}</div>`;
    }).join('');

    const dataIdAttr = id ? `data-id="${id}"` : '';

    return `
        <div class="custom-select" data-key="${key}" ${dataIdAttr}>
            <div class="select-selected">${selectedDisplay}</div>
            <div class="select-items select-hide">${optionsHTML}</div>
        </div>
    `;
}

function createFormattedInputHTML(type, id, key, value, placeholder) {
    const gearIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 15.5C14.2091 15.5 16 13.7091 16 11.5C16 9.29086 14.2091 7.5 12 7.5C9.79086 7.5 8 9.29086 8 11.5C8 13.7091 9.79086 15.5 12 15.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.4 15L21.5 16.4C21.8 16.6 22 17.1 22 17.5V19.9C22 20.3 21.8 20.8 21.5 21L19.4 22.4C19 22.6 18.5 22.7 18.1 22.7L15.3 22.2C14.9 22.2 14.4 22 14.2 21.6L12.5 19.3C12.2 18.9 11.8 18.9 11.5 19.3L9.8 21.6C9.6 22 9.1 22.2 8.7 22.2L5.9 22.7C5.5 22.7 5 22.6 4.6 22.4L2.5 21C2.2 20.8 2 20.3 2 19.9V17.5C2 17.1 2.2 16.6 2.5 16.4L4.6 15C5 14.8 5.5 14.7 5.9 14.7L8.7 15.2C9.1 15.2 9.6 15.4 9.8 15.8L11.5 18.1C11.8 18.5 12.2 18.5 12.5 18.1L14.2 15.8C14.4 15.4 14.9 15.2 15.3 15.2L18.1 14.7C18.5 14.7 19 14.8 19.4 15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    const inputElement = type === 'textarea' 
        ? `<textarea id="${id}" data-key="${key}" class="formatted-text-input" placeholder="${placeholder}">${value || ''}</textarea>`
        : `<input type="text" id="${id}" data-key="${key}" value="${value || ''}" placeholder="${placeholder}" class="formatted-text-input">`;

    return `<div class="formatted-input-wrapper">
        ${inputElement}
        <button class="format-c-btn" data-action="toggle-format-toolbar" aria-label="Outils de formatage">${gearIcon}</button>
    </div>`;
}


function createProfileCard(profile) {
    return `<div class="card" id="card-profile">
        <div class="card-header"><h2>Profil</h2></div>
        <div class="card-body">
            ${createFileUploadHTML('profile.pictureUrl', profile.pictureUrl, 'Photo de profil')}
            <div class="form-group">
                <label for="profile-title">Titre du profil</label>
                ${createFormattedInputHTML('input', 'profile-title', 'profile.title', profile.title, '@VotreNom')}
            </div>
            <div class="form-group">
                <label for="profile-description">Description</label>
                ${createFormattedInputHTML('textarea', 'profile-description', 'profile.description', profile.description, 'Votre bio...')}
            </div>
        </div>
    </div>`;
}

function createAppearanceCard(appearance) {
    const bg = appearance.background || {};
    const fontOptions = Object.entries(FONT_OPTIONS).reduce((acc, [name, value]) => ({ ...acc, [value]: { name, value } }), {});
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
            <div class="form-group"><label>Police</label>${createCustomSelectHTML('appearance.fontFamily', fontOptions, appearance.fontFamily, { type: 'font' })}</div>
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
            <div class="form-group"><label for="header-title-${item.id}">Texte</label>${createFormattedInputHTML('input', `header-title-${item.id}`, 'title', item.title, '')}</div>
        </div>`;
    }
    return `<div class="item-container" ${dataIdAttr} draggable="true">
        <div class="item-header"><span>Lien</span><button data-action="delete" class="btn btn-danger">✖</button></div>
        <div class="form-group"><label for="link-title-${item.id}">Titre</label>${createFormattedInputHTML('input', `link-title-${item.id}`, 'title', item.title, '')}</div>
        <div class="form-group"><label for="link-url-${item.id}">URL</label><input type="text" id="link-url-${item.id}" data-key="url" ${dataIdAttr} value="${item.url || ''}"></div>
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