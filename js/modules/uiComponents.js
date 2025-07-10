import { FONT_OPTIONS, SOCIAL_OPTIONS, GRADIENT_OPTIONS } from '../config.js';
import { ICONS } from '../icons.js';

const DRAG_HANDLE_ICON = `<svg class="drag-handle" draggable="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm3 1a1 1 0 1 0-2 0 1 1 0 0 0 2 0zM4 5a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm3 1a1 1 0 1 0-2 0 1 1 0 0 0 2 0zM4 8a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm3 1a1 1 0 1 0-2 0 1 1 0 0 0 2 0zm3-4a1 1 0 1 0-2 0 1 1 0 0 0 2 0zM10 8a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm1 1a1 1 0 1 0-2 0 1 1 0 0 0 2 0zM7 11a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm1 1a1 1 0 1 0-2 0 1 1 0 0 0 2 0z"/></svg>`;

function createToggleSwitch(key, isChecked, label) {
    const uniqueId = `toggle-${key.replace(/\./g, '-')}`;
    return `
        <div class="form-group-inline">
            <label for="${uniqueId}">${label}</label>
            <div class="toggle-switch">
                <input type="checkbox" id="${uniqueId}" data-key="${key}" ${isChecked ? 'checked' : ''}>
                <span class="slider"></span>
            </div>
        </div>`;
}

function createStyleSection(title, type, appearance) {
    const style = appearance[type]; // 'link' or 'header'
    return `
        <div class="style-section">
            <h4>${title}</h4>
            <div class="form-grid">
                ${createColorInputHTML(`appearance.${type}.backgroundColor`, style.backgroundColor, 'Couleur de fond')}
                ${createColorInputHTML(`appearance.${type}.textColor`, style.textColor, 'Couleur du texte')}
            </div>
            <div class="form-grid">
                 <div class="form-group">
                    <label>Rayon de la bordure</label>
                    <input type="text" data-key="appearance.${type}.borderRadius" value="${style.borderRadius || '0px'}" placeholder="ex: 8px">
                </div>
                 <div class="form-group">
                    <label>Épaisseur de la bordure</label>
                    <input type="text" data-key="appearance.${type}.borderWidth" value="${style.borderWidth || '0px'}" placeholder="ex: 2px">
                </div>
            </div>
            ${createColorInputHTML(`appearance.${type}.borderColor`, style.borderColor, 'Couleur de la bordure')}
            ${createToggleSwitch(`appearance.${type}.hasShadow`, style.hasShadow, 'Afficher une ombre')}
        </div>
    `;
}

export function createFileUploadHTML(key, currentSrc, label, id = '', accept = 'image/*') {
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

export function createColorInputHTML(key, value, label) {
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

export function createCustomSelectHTML(key, options, selectedValue, { id = null, type = 'default' } = {}) {
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
            finalDisplay = val;
            style = `font-family: '${val}', sans-serif;`;
            valueAttr = display;
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

export function createProfileCard(profile, appearance) {
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

export function createAppearanceCard(appearance) {
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
            <h4>Style Global</h4>
            <div class="form-group"><label>Police</label>${createCustomSelectHTML('appearance.fontFamily', FONT_OPTIONS, appearance.fontFamily, { type: 'font' })}</div>
             <div class="form-grid">
                ${createColorInputHTML('appearance.titleColor', appearance.titleColor, 'Couleur du Titre')}
                ${createColorInputHTML('appearance.descriptionColor', appearance.descriptionColor, 'Couleur de la Description')}
            </div>
            ${createColorInputHTML('appearance.textColor', appearance.textColor, 'Couleur du texte général')}
            <div class="form-group"><label>Type de fond</label>${createCustomSelectHTML('appearance.background.type', bgTypeOptions, bg.type, { type: 'bg_type'})}</div>
            <div id="background-controls">${bgControls()}</div>
            <hr style="border:none; border-top:1px solid var(--border-color); margin: 24px 0;">
            ${createStyleSection('Style des Liens', 'link', appearance)}
            <hr style="border:none; border-top:1px solid var(--border-color); margin: 24px 0;">
            ${createStyleSection('Style des En-têtes', 'header', appearance)}
        </div>
    </div>`;
}

export function createItemsCard(title, items, itemRenderer, addAction1, addLabel1, addAction2, addLabel2) {
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

export function createSocialItemHTML(item) {
    return `<div class="item-container" data-id="${item.id}">
        <div class="item-header">
            <div class="item-title">${DRAG_HANDLE_ICON} <span>Icône</span></div>
            <button data-action="delete" class="btn btn-danger">✖</button>
        </div>
        <div class="form-group"><label>Réseau</label>${createCustomSelectHTML('network', SOCIAL_OPTIONS, item.network, { id: item.id, type: 'social' })}</div>
        <div class="form-group"><label for="social-url-${item.id}">URL</label><input type="text" id="social-url-${item.id}" data-key="url" data-id="${item.id}" value="${item.url || ''}"></div>
    </div>`;
}

export function createLinkItemHTML(item) {
    const dataIdAttr = `data-id="${item.id}"`;
    const title = item.type === 'header' ? 'En-tête' : 'Lien';

    if (item.type === 'header') {
        return `<div class="item-container" ${dataIdAttr}>
            <div class="item-header">
                <div class="item-title">${DRAG_HANDLE_ICON} <span>${title}</span></div>
                <button data-action="delete" class="btn btn-danger">✖</button>
            </div>
            <div class="form-group"><label for="header-title-${item.id}">Texte</label>
                <div id="header-title-${item.id}" data-key="title" class="editable-content" contenteditable="true" data-placeholder="Nouvel en-tête">${item.title || ''}</div>
            </div>
        </div>`;
    }
    return `<div class="item-container" ${dataIdAttr}>
        <div class="item-header">
            <div class="item-title">${DRAG_HANDLE_ICON} <span>${title}</span></div>
            <button data-action="delete" class="btn btn-danger">✖</button>
        </div>
        <div class="form-group"><label for="link-title-${item.id}">Titre</label>
            <div id="link-title-${item.id}" data-key="title" class="editable-content" contenteditable="true" data-placeholder="Titre du lien">${item.title || ''}</div>
        </div>
        <div class="form-group"><label for="link-url-${item.id}">URL</label><input type="text" id="link-url-${item.id}" data-key="url" data-id="${item.id}" value="${item.url || ''}"></div>
        ${createFileUploadHTML('thumbnailUrl', item.thumbnailUrl, 'Miniature', item.id)}
    </div>`;
}

export function createSettingsCard(seo) {
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