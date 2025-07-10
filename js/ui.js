import {
    createProfileCard, createAppearanceCard, createItemsCard,
    createSocialItemHTML, createLinkItemHTML, createSongItemHTML, createSettingsCard
} from './modules/uiComponents.js';
import { API } from '../config.js';
import logger from '../logger.js';

const editorContent = document.getElementById('editor-content');
const contextMenu = document.getElementById('custom-context-menu');
const modalContainer = document.getElementById('modal-container');
const previewFrame = document.getElementById('preview-frame');

export function render(state) {
    if (!editorContent || !state.profile) return;
    
    const focusedElement = document.activeElement;
    let selectionInfo = null;

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
        } else if (typeof focusedElement.selectionStart === 'number') {
            selectionInfo = {
                elementId: focusedElement.id,
                isContentEditable: false,
                start: focusedElement.selectionStart,
                end: focusedElement.selectionEnd
            };
        } else {
             selectionInfo = { elementId: focusedElement.id };
        }
    }

    const scrollPosition = editorContent.scrollTop;

    editorContent.innerHTML = `
        ${createProfileCard(state.profile, state.appearance)}
        ${createAppearanceCard(state.appearance)}
        ${createItemsCard('Icônes Sociales', state.socials || [], createSocialItemHTML, 'add-social', 'Ajouter une icône')}
        ${createItemsCard('Chansons Spotify', state.songs || [], createSongItemHTML, 'add-song', 'Ajouter une chanson')}
        ${createItemsCard('Liens & En-têtes', state.links || [], createLinkItemHTML, 'add-link', 'Ajouter un lien', 'add-header', 'Ajouter un en-tête')}
        ${createSettingsCard(state.seo)}
    `;
    
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

// NOUVEAU : Modale de recherche Spotify
export function showSpotifySearch(onAddSong) {
    modalContainer.innerHTML = `
        <div class="modal-box spotify-modal">
            <h3 class="modal-title">Rechercher une chanson sur Spotify</h3>
            <div class="form-group">
                <input type="text" id="spotify-search-input" placeholder="Titre, artiste..." autocomplete="off">
            </div>
            <div id="spotify-search-results" class="spotify-search-results"></div>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="modal-cancel">Fermer</button>
            </div>
        </div>
    `;
    modalContainer.classList.add('is-visible');

    const searchInput = document.getElementById('spotify-search-input');
    const resultsContainer = document.getElementById('spotify-search-results');

    const closeModal = () => modalContainer.classList.remove('is-visible');

    document.getElementById('modal-cancel').addEventListener('click', closeModal);

    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            const query = searchInput.value;
            if (query.length < 3) {
                resultsContainer.innerHTML = '';
                return;
            }
            resultsContainer.innerHTML = '<div class="spinner"></div>';

            try {
                const response = await fetch(API.SEARCH_SPOTIFY_URL, {
                    method: 'POST',
                    body: JSON.stringify({ query })
                });
                const tracks = await response.json();
                
                resultsContainer.innerHTML = tracks.map(track => `
                    <div class="spotify-result-item" data-song='${JSON.stringify(track)}'>
                        <img src="${track.albumArtUrl}" alt="Pochette">
                        <div>
                            <div class="title">${track.title}</div>
                            <div class="artist">${track.artist}</div>
                        </div>
                        <button class="btn btn-primary btn-add-song">Ajouter</button>
                    </div>
                `).join('');

            } catch (error) {
                resultsContainer.innerHTML = '<p>Erreur de recherche.</p>';
                logger.error("Spotify search failed", error);
            }
        }, 500);
    });

    resultsContainer.addEventListener('click', e => {
        const button = e.target.closest('.btn-add-song');
        if (button) {
            const item = button.closest('.spotify-result-item');
            const songData = JSON.parse(item.dataset.song);
            onAddSong(songData);
            closeModal();
        }
    });
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