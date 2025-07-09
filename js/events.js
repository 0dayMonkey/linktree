import { updateAndSave, getState, handleStateUpdate } from './state.js';
import { showConfirmation, showContextMenu, hideContextMenu } from './ui.js';

const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
});

const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
};

const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    const key = e.target.dataset.key;
    if (!key) return;
    const id = e.target.closest('[data-id]') ? parseInt(e.target.closest('[data-id]').dataset.id, 10) : null;
    try {
        const base64String = await readFileAsBase64(file);
        handleStateUpdate(key, base64String, id);
    } catch (error) {
        console.error(error);
        showConfirmation('Erreur', 'Le fichier n\'a pas pu être lu.');
    }
};

async function handleContextMenuAction(e) {
    e.stopPropagation();
    hideContextMenu();
    const { action, targetId } = e.target.dataset;
    if (!action || !targetId) return;
    
    const [type, idStr] = targetId.split('.');
    const id = parseInt(idStr, 10);

    if (action === 'edit') {
        const selector = id ? `[data-id="${id}"]` : `#card-${type.toLowerCase()}`;
        const elementToFocus = document.querySelector(selector);
        if (elementToFocus) {
            elementToFocus.scrollIntoView({ behavior: 'smooth', block: 'center' });
            elementToFocus.classList.add('highlight-indicator');
            setTimeout(() => {
                elementToFocus.classList.remove('highlight-indicator');
            }, 1500);
        }
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

export function attachEventListeners() {
    const editorContent = document.getElementById('editor-content');
    const contextMenu = document.getElementById('custom-context-menu');
    if (!editorContent) return;
    
    // --- Événements classiques ---
    editorContent.addEventListener('change', e => {
        if (e.target.matches('.file-upload-input')) return handleFileUpload(e);
        if (e.target.dataset.key) {
            const id = e.target.closest('[data-id]') ? parseInt(e.target.closest('[data-id]').dataset.id, 10) : null;
            handleStateUpdate(e.target.dataset.key, e.target.value, id);
        }
    });
    
    editorContent.addEventListener('input', debounce(e => {
        const target = e.target;
        if (!target.dataset.key || target.matches('select, [type=file], [type=color]')) return;
        const id = target.closest('[data-id]') ? parseInt(target.closest('[data-id]').dataset.id, 10) : null;
        handleStateUpdate(target.dataset.key, target.value, id);
    }, 300));

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

    // --- NOUVEAU : Logique du Drag & Drop ---
    let draggedItem = null;

    editorContent.addEventListener('dragstart', e => {
        draggedItem = e.target.closest('.item-container');
        if (draggedItem) {
            setTimeout(() => {
                draggedItem.classList.add('dragging');
            }, 0);
        }
    });

    editorContent.addEventListener('dragend', e => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
        }
    });

    editorContent.addEventListener('dragover', e => {
        e.preventDefault();
        const container = e.target.closest('.card-body');
        if (!container || !draggedItem) return;

        const afterElement = getDragAfterElement(container, e.clientY);
        const currentDraggable = document.querySelector('.dragging');

        // Nettoyer les indicateurs précédents
        container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        
        if (afterElement == null) {
            if(container.lastElementChild !== currentDraggable) {
                 container.lastElementChild.classList.add('drag-over-bottom'); // Ou une autre classe pour la fin
            }
        } else {
            if(afterElement !== currentDraggable) {
                afterElement.classList.add('drag-over');
            }
        }
    });
    
    editorContent.addEventListener('drop', e => {
        e.preventDefault();
        const container = e.target.closest('[data-list-name]');
        if (!container || !draggedItem) return;

        const afterElement = getDragAfterElement(container.querySelector('.card-body'), e.clientY);
        
        const listName = container.dataset.listName === "liens-&-en-têtes" ? 'links' : 'socials';
        const id = parseInt(draggedItem.dataset.id, 10);
        
        const currentState = JSON.parse(JSON.stringify(getState()));
        const list = currentState[listName];

        const draggedIndex = list.findIndex(item => item.id === id);
        const [removed] = list.splice(draggedIndex, 1);
        
        if (afterElement == null) {
            list.push(removed);
        } else {
            const dropId = parseInt(afterElement.dataset.id, 10);
            const dropIndex = list.findIndex(item => item.id === dropId);
            list.splice(dropIndex, 0, removed);
        }

        updateAndSave(currentState);
    });

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.item-container:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
}