// js/main.js
import { API } from './config.js';
import { fetchData } from './api.js';
import { setState, updateAndSave, handleStateUpdate } from './state.js';
import { render, showConfirmation, showContextMenu, hideContextMenu } from './ui.js';

async function init() {
    const editorContent = document.getElementById('editor-content');
    const saveStatusEl = document.getElementById('save-status');

    if (!editorContent) return;
    editorContent.innerHTML = `<div class="empty-state">Chargement...</div>`;

    try {
        const initialState = await fetchData(API.GET_DATA_URL);
        setState(initialState);
        
        saveStatusEl.textContent = 'Prêt';
        saveStatusEl.style.color = 'var(--success-color)';
        
        render(initialState);
        attachEventListeners();

        const previewFrame = document.getElementById('preview-frame');
        previewFrame.addEventListener('load', () => {
            if (previewFrame.contentWindow && initialState.profile) {
                previewFrame.contentWindow.postMessage({ type: 'update', payload: initialState }, window.location.origin);
            }
        });
    } catch (error) {
        saveStatusEl.textContent = `Erreur`;
        saveStatusEl.style.color = 'var(--danger-color)';
        editorContent.innerHTML = `<div class="error-state"><strong>Impossible de charger la configuration.</strong><br>${error.message}<br>Veuillez vérifier votre connexion et la configuration de Notion.</div>`;
    }
}

function attachEventListeners() {
    const editorContent = document.getElementById('editor-content');
    const contextMenu = document.getElementById('custom-context-menu');
    
    if (!editorContent) return;

    editorContent.addEventListener('change', async e => {
        if (e.target.matches('.file-upload-input')) {
            const file = e.target.files[0];
            const key = e.target.dataset.key;
            if (!key) return;
            const id = e.target.closest('[data-id]') ? parseInt(e.target.closest('[data-id]').dataset.id, 10) : null;
            try {
                const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
                    if (!file) return resolve(null);
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = error => reject(error);
                    reader.readAsDataURL(file);
                });
                const base64String = await readFileAsBase64(file);
                handleStateUpdate(key, base64String, id);
            } catch (error) {
                console.error(error);
                showConfirmation('Erreur', 'Le fichier n\'a pas pu être lu.');
            }
        } else if (e.target.dataset.key) {
            const id = e.target.closest('[data-id]') ? parseInt(e.target.closest('[data-id]').dataset.id, 10) : null;
            handleStateUpdate(e.target.dataset.key, e.target.value, id);
        }
    });

    editorContent.addEventListener('input', e => {
        const target = e.target;
        if (!target.dataset.key || target.matches('select, [type=file], [type=color]')) return;
        const debounce = (func, delay) => {
            let timeoutId;
            return (...args) => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => func.apply(this, args), delay);
            };
        };
        debounce(() => {
            const id = target.closest('[data-id]') ? parseInt(target.closest('[data-id]').dataset.id, 10) : null;
            handleStateUpdate(target.dataset.key, target.value, id);
        }, 300)();
    });

    editorContent.addEventListener('click', async (e) => {
        const actionTarget = e.target.closest('[data-action]');
        if (!actionTarget) return;
        const action = actionTarget.dataset.action;
        e.preventDefault();
        
        const currentState = JSON.parse(JSON.stringify(getState()));
        let stateChanged = true;

        if (action === 'delete') {
            const itemEl = e.target.closest('[data-id]');
            const confirmed = await showConfirmation('Êtes-vous sûr(e) ?', 'Cette action est irréversible.');
            if (!itemEl || !confirmed) return;
            const id = parseInt(itemEl.dataset.id, 10);
            currentState.links = (currentState.links || []).filter(item => item.id !== id);
            currentState.socials = (currentState.socials || []).filter(item => item.id !== id);
        } else if (action === 'add-link') {
            currentState.links.push({ type: 'link', id: Date.now(), title: 'Nouveau Lien', url: 'https://' });
        } else if (action === 'add-header') {
            currentState.links.push({ type: 'header', id: Date.now(), title: 'Nouvel En-tête' });
        } else if (action === 'add-social') {
            currentState.socials.push({ id: Date.now(), url: 'https://', network: 'website' });
        } else {
            stateChanged = false;
        }

        if (stateChanged) updateAndSave(currentState);
    });

    window.addEventListener('message', e => {
        if (e.data.type === 'showContextMenu') showContextMenu(e.data.payload);
    });

    document.addEventListener('click', () => hideContextMenu());
    contextMenu.addEventListener('click', e => handleContextMenuAction(e));
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
        const currentState = JSON.parse(JSON.stringify(getState()));
        const listName = type;
        if (currentState[listName] && id) {
            currentState[listName] = currentState[listName].filter(item => item.id !== id);
            updateAndSave(currentState);
        }
    }
}

init();