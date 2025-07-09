// js/main.js
import { API } from './config.js';
import { fetchData } from './api.js';
import { setState, getState } from './state.js';
import { render } from './ui.js';
import { attachEventListeners } from './events.js';

async function init() {
    const editorContent = document.getElementById('editor-content');
    const saveStatusEl = document.getElementById('save-status');
    const previewFrame = document.getElementById('preview-frame');

    if (!editorContent) return;
    editorContent.innerHTML = `<div class="empty-state">Chargement...</div>`;

    try {
        const initialState = await fetchData(API.GET_DATA_URL);
        setState(initialState);
        
        saveStatusEl.textContent = 'Prêt';
        saveStatusEl.style.color = 'var(--success-color)';
        
        render(initialState);
        attachEventListeners();

        previewFrame.addEventListener('load', () => {
            if (previewFrame.contentWindow && getState().profile) {
                previewFrame.contentWindow.postMessage({ type: 'update', payload: getState() }, window.location.origin);
            }
        });
    } catch (error) {
        saveStatusEl.textContent = `Erreur`;
        saveStatusEl.style.color = 'var(--danger-color)';
        editorContent.innerHTML = `<div class="error-state"><strong>Impossible de charger la configuration.</strong><br>${error.message}<br>Veuillez vérifier votre connexion et la configuration de Notion.</div>`;
    }
}

init();