import {
    createProfileCard, createAppearanceCard, createItemsCard,
    createSocialItemHTML, createLinkItemHTML, createSettingsCard
} from './modules/uiComponents.js';

const editorContent = document.getElementById('editor-content');
const contextMenu = document.getElementById('custom-context-menu');
const modalContainer = document.getElementById('modal-container');
const previewFrame = document.getElementById('preview-frame');

export function render(state) {
    if (!editorContent || !state.profile) return;
    
    const focusedElement = document.activeElement;
    let selectionInfo = null;

    // Sauvegarde de la position du curseur et du focus
    if (focusedElement) {
        if (focusedElement.isContentEditable) {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                selectionInfo = {
                    elementId: focusedElement.id,
                    isContentEditable: true,
                    start: range.startOffset,
                    end: range.endOffset
                };
            }
        } else if (typeof focusedElement.selectionStart === 'number') { // Gère les <input>
            selectionInfo = {
                elementId: focusedElement.id,
                isContentEditable: false,
                start: focusedElement.selectionStart,
                end: focusedElement.selectionEnd
            };
        } else { // Fallback pour les éléments qui ont juste le focus
             selectionInfo = { elementId: focusedElement.id };
        }
    }

    const scrollPosition = editorContent.scrollTop;

    editorContent.innerHTML = `
        ${createProfileCard(state.profile, state.appearance)}
        ${createAppearanceCard(state.appearance)}
        ${createItemsCard('Icônes Sociales', state.socials || [], createSocialItemHTML, 'add-social', 'Ajouter une icône')}
        ${createItemsCard('Liens & En-têtes', state.links || [], createLinkItemHTML, 'add-link', 'Ajouter un lien', 'add-header', 'Ajouter un en-tête')}
        ${createSettingsCard(state.seo)}
    `;
    
    // Restauration du focus et de la position du curseur
    if (selectionInfo && selectionInfo.elementId) {
        const newElement = document.getElementById(selectionInfo.elementId);
        if (newElement) {
            newElement.focus();
            if (selectionInfo.isContentEditable === true) {
                const selection = window.getSelection();
                try {
                    const newRange = document.createRange();
                    const textNode = newElement.firstChild || newElement;
                    const textLength = textNode.length || 0;
                    newRange.setStart(textNode, Math.min(selectionInfo.start, textLength));
                    newRange.setEnd(textNode, Math.min(selectionInfo.end, textLength));
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                } catch (e) {
                    console.warn("Could not restore selection in contentEditable.", e);
                }
            } else if (selectionInfo.isContentEditable === false) {
                newElement.selectionStart = selectionInfo.start;
                newElement.selectionEnd = selectionInfo.end;
            }
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