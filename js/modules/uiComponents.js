import {
    FONT_OPTIONS, SOCIAL_OPTIONS, GRADIENT_OPTIONS
} from '../config.js';
import { ICONS } from '../icons.js';

function createStyleSection(title, type, appearance) {
    const style = appearance[type];
    const borderRadiusValue = parseInt(style.borderRadius, 10) || 0;
    const borderWidthValue = parseInt(style.borderWidth, 10) || 0;
    const shadowIntensityValue = style.shadowIntensity || 10;
    const shadowTypeOptions = { none: 'Aucune', soft: 'Légère', strong: 'Marquée' };

    return `
        <div class="style-section">
            <h4>${title}</h4>
            <div class="form-grid">
                ${createColorInputHTML(`appearance.${type}.backgroundColor`, style.backgroundColor, 'Couleur de fond')}
                ${createColorInputHTML(`appearance.${type}.textColor`, style.textColor, 'Couleur du texte')}
            </div>
            
            <h5>Bordure</h5>
            <div class="form-group">
                <label>Rayon</label>
                <div class="slider-group">
                    <input type="range" min="0" max="50" step="1" data-key="appearance.${type}.borderRadius" value="${borderRadiusValue}" class="slider-input">
                    <span class="slider-value">${borderRadiusValue}px</span>
                </div>
            </div>
            <div class="form-group">
                <label>Épaisseur</label>
                <div class="number-group">
                     <input type="number" min="0" max="20" step="1" data-key="appearance.${type}.borderWidth" value="${borderWidthValue}" class="number-input">
                     <span>px</span>
                </div>
            </div>
            ${createColorInputHTML(`appearance.${type}.borderColor`, style.borderColor, 'Couleur de la bordure')}

            <h5>Ombre</h5>
            <div class="form-group">
                <label>Style d'ombre</label>
                ${createCustomSelectHTML(`appearance.${type}.shadowType`, shadowTypeOptions, style.shadowType)}
            </div>
            <div class="form-group">
                <label>Intensité</label>
                <div class="slider-group">
                    <input type="range" min="0" max="100" step="1" data-key="appearance.${type}.shadowIntensity" value="${shadowIntensityValue}" class="slider-input">
                    <span class="slider-value">${shadowIntensityValue}%</span>
                </div>
            </div>
            ${createColorInputHTML(`appearance.${type}.shadowColor`, style.shadowColor, "Couleur de l'ombre")}
        </div>
    `;
}

export function createFileUploadHTML(key, currentSrc, label, id = '', accept = 'image/*') {
    const uniqueId = `upload-${key.replace(/\./g, '-')}-${id || 'main'}`;
    const closestId = id ? `data-id="${id}"` : '';
    const hasImage = currentSrc && (currentSrc.startsWith('data:image') || currentSrc.startsWith('http'));

    return `<div class="form-group" ${closestId}>
        <label>${label}</label>
        <label class="file-upload-wrapper" for="${uniqueId}">
            ${hasImage ? `<img src="${currentSrc}" alt="Aperçu" class="file-upload-preview">` : ''}
            <span class="file-upload-text">${hasImage ? 'Cliquez pour changer' : '<strong>Cliquez pour téléverser</strong>'}</span>
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
             selectedDisplay = option.name || option || selectedValue;
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
            ${createColorInputHTML('appearance.socialIconsColor', appearance.socialIconsColor, 'Couleur des icônes sociales')}
            <div class="form-group"><label>Type de fond</label>${createCustomSelectHTML('appearance.background.type', bgTypeOptions, bg.type, { type: 'bg_type'})}</div>
            <div id="background-controls">${bgControls()}</div>
            <hr style="border:none; border-top:1px solid var(--border-color); margin: 24px 0;">
            ${createStyleSection('Style des Liens', 'link', appearance)}
            <hr style="border:none; border-top:1px solid var(--border-color); margin: 24px 0;">
            ${createStyleSection('Style des En-têtes', 'header', appearance)}
        </div>
    </div>`;
}

export function createItemsCard(title, items, itemRenderer, addAction1, addLabel1, addAction2, addLabel2, isFirst, isLast) {
    const itemsHTML = (items || []).map(item => itemRenderer(item)).join('');
    const addButtons = `
        <button data-action="${addAction1}" class="btn btn-secondary">${addLabel1}</button>
        ${addAction2 ? `<button data-action="${addAction2}" class="btn btn-secondary">${addLabel2}</button>` : ''}
    `;
    const sectionName = title.toLowerCase().includes('social') ? 'socials' : title.toLowerCase().includes('spotify') ? 'songs' : 'links';

    const moveButtons = `
        <div class="section-move-buttons">
            <button class="btn-icon" data-action="move-section-up" data-section-name="${sectionName}" ${isFirst ? 'disabled' : ''}>
                <svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"></path></svg>
            </button>
            <button class="btn-icon" data-action="move-section-down" data-section-name="${sectionName}" ${isLast ? 'disabled' : ''}>
                <svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"></path></svg>
            </button>
        </div>
    `;

    return `<div class="card" data-section-name="${sectionName}">
        <div class="card-header">
            <div class="card-header-title">
                ${moveButtons}
                <h2>${title}</h2>
            </div>
            <div class="card-header-actions">${addButtons}</div>
        </div>
        <div class="card-body">${itemsHTML.length > 0 ? itemsHTML : '<p class="empty-state">Aucun élément.</p>'}</div>
    </div>`;
}

export function createSongItemHTML(item) {
    return `<div class="item-container" data-id="${item.songId}">
        <div class="item-header">
            <div class="item-preview">
                <img src="${item.albumArtUrl}" alt="Pochette d'album">
                <div>
                    <span class="item-title">${item.title}</span>
                    <span class="item-subtitle">${item.artist}</span>
                </div>
            </div>
            <div class="item-actions">
                <button class="btn-icon" data-action="move-song-up" title="Monter">
                    <svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"></path></svg>
                </button>
                <button data-action="delete-song" class="btn-icon btn-danger-icon" title="Supprimer">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>
                </button>
                <button class="btn-icon" data-action="move-song-down" title="Descendre">
                    <svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"></path></svg>
                </button>
            </div>
        </div>
    </div>`;
}


export function createSocialItemHTML(item) {
    return `<div class="item-container" data-id="${item.id}" draggable="true">
        <div class="item-header"><span>Icône</span><button data-action="delete" class="btn btn-danger">✖</button></div>
        <div class="form-group"><label>Réseau</label>${createCustomSelectHTML('network', SOCIAL_OPTIONS, item.network, { id: item.id, type: 'social' })}</div>
        <div class="form-group"><label for="social-url-${item.id}">URL</label><input type="text" id="social-url-${item.id}" data-key="url" data-id="${item.id}" value="${item.url || ''}"></div>
    </div>`;
}

export function createLinkItemHTML(item) {
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

export function createSettingsCard(seo) {
    return `<div class="card" id="card-settings">
        <div class="card-header"><h2>Paramètres (SEO)</h2></div>
        <div class="card-body">
            <div class="form-group"><label for="seo-title">Titre</label><input type="text" id="seo-title" data-key="seo.title" value="${seo.title || ''}"></div>
            <div class="form-group"><label for="seo-desc">Description</label><input type="text" id="seo-desc" data-key="seo.description" value="${seo.description || ''}"></div>
            ${createFileUploadHTML('seo.faviconUrl', seo.faviconUrl, 'Favicon', '', "image/x-icon,image/png,image/svg+xml,image/vnd.microsoft.icon")}
        </div>
    </div>`;
}