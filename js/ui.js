// js/ui.js
import { FONT_OPTIONS, SOCIAL_OPTIONS, GRADIENT_OPTIONS } from './config.js';

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
        ${createItemsCard('Liens & En-têtes', state.links || [], createLinkItemHTML, 'add-link', 'Ajouter un lien')}
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

function createProfileCard(profile) {
    return `<div class="card" id="card-profile">
        <div class="card-header"><h2>Profil</h2></div>
        <div class="card-body">
            ${createFileUploadHTML('profile.pictureUrl', profile.pictureUrl, 'Photo de profil')}
            <div class="form-group">
                <label for="profile-title">Titre du profil</label>
                <input type="text" id="profile-title" data-key="profile.title" value="${profile.title || ''}" placeholder="@VotreNom">
            </div>
        </div>
    </div>`;
}

function createAppearanceCard(appearance) {
    const fontOpts = Object.entries(FONT_OPTIONS).map(([n, v]) => `<option value="${v}" style="font-family: ${v};" ${appearance.fontFamily === v ? 'selected' : ''}>${n}</option>`).join('');
    const bg = appearance.background || {};
    const gradientOpts = Object.entries(GRADIENT_OPTIONS).map(([key, { name }]) => `<option value="${key}" ${bg.value === key ? 'selected' : ''}>${name}</option>`).join('');
    const bgControls = () => {
        switch(bg.type) {
            case 'solid': return createColorInputHTML('appearance.background.value', bg.value, 'Couleur de fond');
            case 'gradient': return `<div class="form-group"><label for="gradient-select">Choisir un dégradé</label><select id="gradient-select" data-key="appearance.background.value">${gradientOpts}</select></div>`;
            case 'image': return createFileUploadHTML('appearance.background.value', bg.value, 'Image de fond');
            default: return '';
        }
    };
    return `<div class="card" id="card-appearance">
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
    </div>`;
}

function createItemsCard(title, items, itemRenderer, addAction, addLabel) {
    const itemsHTML = (items || []).map(item => itemRenderer(item)).join('');
    return `<div class="card" data-list-name="${title.toLowerCase().replace(/ /g, '-')}">
        <div class="card-header"><h2>${title}</h2><button data-action="${addAction}" class="btn btn-secondary">${addLabel}</button></div>
        <div class="card-body">${itemsHTML.length > 0 ? itemsHTML : '<p class="empty-state">Aucun élément.</p>'}</div>
    </div>`;
}

function createSocialItemHTML(item) {
    const socialOpts = Object.entries(SOCIAL_OPTIONS).map(([key, name]) => `<option value="${key}" ${item.network === key ? 'selected' : ''}>${name}</option>`).join('');
    // MISE À JOUR : Ajout de draggable="true"
    return `<div class="item-container" data-id="${item.id}" draggable="true">
        <div class="item-header"><span>Icône : ${SOCIAL_OPTIONS[item.network] || item.network}</span><button data-action="delete" class="btn btn-danger">✖</button></div>
        <div class="form-group"><label for="social-network-${item.id}">Réseau</label><select id="social-network-${item.id}" data-key="network">${socialOpts}</select></div>
        <div class="form-group"><label for="social-url-${item.id}">URL ou Pseudo</label><input type="text" id="social-url-${item.id}" data-key="url" value="${item.url || ''}"></div>
    </div>`;
}

function createLinkItemHTML(item) {
    // MISE À JOUR : Ajout de draggable="true"
    if (item.type === 'header') {
        return `<div class="item-container" data-id="${item.id}" draggable="true">
            <div class="item-header"><span>En-tête</span><button data-action="delete" class="btn btn-danger">✖</button></div>
            <div class="form-group"><label for="header-title-${item.id}">Texte</label><input type="text" id="header-title-${item.id}" data-key="title" value="${item.title || ''}"></div>
        </div>`;
    }
    return `<div class="item-container" data-id="${item.id}" draggable="true">
        <div class="item-header"><span>Lien : ${item.title}</span><button data-action="delete" class="btn btn-danger">✖</button></div>
        <div class="form-group"><label for="link-title-${item.id}">Titre</label><input type="text" id="link-title-${item.id}" data-key="title" value="${item.title || ''}"></div>
        <div class="form-group"><label for="link-url-${item.id}">URL</label><input type="text" id="link-url-${item.id}" data-key="url" value="${item.url || ''}"></div>
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