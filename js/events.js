import { updateAndSave, getState, handleStateUpdate } from './state.js';
import { showConfirmation, showContextMenu, hideContextMenu } from './ui.js';
import logger from './logger.js';

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
        logger.error('File upload failed', error);
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
    logger.info(`Context menu action: ${action} on ${targetId}`);

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
        if (!confirmed) return logger.info('Deletion cancelled by user.');
        
        const currentState = JSON.parse(JSON.stringify(getState()));
        let listName = type.endsWith('s') ? type : `${type}s`;

        if (currentState[listName] && id) {
            currentState[listName] = currentState[listName].filter(item => item.id !== id);
            updateAndSave(currentState);
            logger.info(`Item ${id} from ${listName} deleted.`);
        }
    }
}

function handleCustomSelect(e) {
    e.stopPropagation();
    const select = e.target.closest('.custom-select');
    if (!select) return;

    const items = select.querySelector('.select-items');
    
    document.querySelectorAll('.custom-select .select-items').forEach(otherItems => {
        if (otherItems !== items) {
            otherItems.classList.add('select-hide');
            otherItems.closest('.custom-select').querySelector('.select-selected').classList.remove('select-arrow-active');
        }
    });

    items.classList.toggle('select-hide');
    select.querySelector('.select-selected').classList.toggle('select-arrow-active');
}

function handleSelectOption(e) {
    const option = e.target.closest('[data-value]');
    if (!option) return;

    const select = option.closest('.custom-select');
    const key = select.dataset.key;
    const id = select.closest('[data-id]') ? parseInt(select.closest('[data-id]').dataset.id, 10) : null;
    const value = option.dataset.value;
    
    handleStateUpdate(key, value, id);
}

function reorderList(list, draggedId, targetId) {
    const draggedIndex = list.findIndex(item => item.id === draggedId);
    if (draggedIndex === -1) return list;

    const [draggedItem] = list.splice(draggedIndex, 1);

    if (targetId === null) {
        list.push(draggedItem);
    } else {
        const targetIndex = list.findIndex(item => item.id === targetId);
        if (targetIndex !== -1) {
            list.splice(targetIndex, 0, draggedItem);
        } else {
             list.push(draggedItem);
        }
    }
    return list;
}

export function attachEventListeners() {
    const editorContent = document.getElementById('editor-content');
    const contextMenu = document.getElementById('custom-context-menu');
    const formatToolbar = document.getElementById('inline-format-toolbar');

    if (!editorContent) return;

    const showFormatToolbar = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            formatToolbar.classList.remove('visible');
            return;
        }

        const editable = selection.anchorNode.parentElement.closest('.editable-content');
        if (!editable) {
            formatToolbar.classList.remove('visible');
            return;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const editorRect = editorContent.getBoundingClientRect();

        let top = rect.top - editorRect.top + editorContent.scrollTop - formatToolbar.offsetHeight - 4;
        if (top < editorContent.scrollTop) {
            top = rect.bottom - editorRect.top + editorContent.scrollTop + 4;
        }
        const left = rect.left - editorRect.left + (rect.width / 2) - (formatToolbar.offsetWidth / 2);

        formatToolbar.style.top = `${top}px`;
        formatToolbar.style.left = `${Math.max(0, left)}px`;
        formatToolbar.classList.add('visible');
        logger.info('Formatting toolbar shown for selection.');
    };
    
    formatToolbar.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const button = e.target.closest('button');
        if (!button) return;
        
        const format = button.dataset.format;
        logger.info(`Applying format: ${format}`);
        document.execCommand(format, false, null);

        const selection = window.getSelection();
        if (selection && selection.anchorNode) {
            const editableDiv = selection.anchorNode.parentElement.closest('.editable-content');
            if (editableDiv) {
                const key = editableDiv.dataset.key;
                const id = editableDiv.closest('[data-id]') ? parseInt(editableDiv.closest('[data-id]').dataset.id, 10) : null;
                const newHtml = editableDiv.innerHTML;
                handleStateUpdate(key, newHtml, id, { skipRender: true });
            }
        }
    });

    const debouncedInputHandler = debounce(e => {
        const target = e.target;
        if (!target.matches('.editable-content') && !target.dataset.key) return;

        const id = target.closest('[data-id]') ? parseInt(target.closest('[data-id]').dataset.id, 10) : null;
        const value = target.matches('.editable-content') ? target.innerHTML : target.value;
        
        handleStateUpdate(target.dataset.key, value, id, { skipRender: true });
    }, 400);

    editorContent.addEventListener('input', debouncedInputHandler);
    
    // --- CORRECTION CLÉ : Utiliser touchend pour les mobiles et selectionchange comme fallback ---
    document.addEventListener('selectionchange', showFormatToolbar);
    editorContent.addEventListener('touchend', () => setTimeout(showFormatToolbar, 100));


    editorContent.addEventListener('change', e => {
        if (e.target.matches('.file-upload-input')) return handleFileUpload(e);
        if (e.target.dataset.key) {
            const id = e.target.closest('[data-id]') ? parseInt(e.target.closest('[data-id]').dataset.id, 10) : null;
            handleStateUpdate(e.target.dataset.key, e.target.value, id);
        }
    });

    editorContent.addEventListener('click', async (e) => {
        const actionTarget = e.target.closest('[data-action]');
        
        if (actionTarget) {
            e.preventDefault();
            const action = actionTarget.dataset.action;
            
            logger.info(`Button action: ${action}`);
            const currentState = JSON.parse(JSON.stringify(getState()));
            let stateChanged = true;

            if (action === 'delete') {
                const itemEl = e.target.closest('[data-id]');
                const confirmed = await showConfirmation('Êtes-vous sûr(e) ?', 'Cette action est irréversible.');
                if (!itemEl || !confirmed) return logger.info('Deletion cancelled by user.');
                const id = parseInt(itemEl.dataset.id, 10);
                currentState.links = (currentState.links || []).filter(item => item.id !== id);
                currentState.socials = (currentState.socials || []).filter(item => item.id !== id);
            } else if (action === 'add-link') {
                currentState.links.push({ type: 'link', id: Date.now(), title: 'Nouveau Lien', url: 'https://', order: currentState.links.length });
            } else if (action === 'add-header') {
                currentState.links.push({ type: 'header', id: Date.now(), title: 'Nouvel En-tête', order: currentState.links.length });
            } else if (action === 'add-social') {
                currentState.socials.push({ id: Date.now(), url: 'https://', network: 'website', order: currentState.socials.length });
            } else {
                stateChanged = false;
            }

            if (stateChanged) updateAndSave(currentState);
        } else if (e.target.closest('.custom-select')) {
             if (e.target.closest('[data-value]')) {
                handleSelectOption(e);
            } else {
                handleCustomSelect(e);
            }
        }
    });
    
    window.addEventListener('message', e => {
        if (e.data.type === 'showContextMenu') {
            showContextMenu(e.data.payload);
        } else if (e.data.type === 'reorder') {
            const { draggedId, targetId } = e.data.payload;
            logger.info('Reordering via preview frame', { draggedId, targetId });
            const [listName, dId] = draggedId.split('.');
            const tId = targetId ? targetId.split('.')[1] : null;

            const currentState = JSON.parse(JSON.stringify(getState()));
            const list = currentState[listName];

            if(list) {
                const reorderedList = reorderList(list, parseInt(dId), tId ? parseInt(tId) : null);
                currentState[listName] = reorderedList;
                updateAndSave(currentState);
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select')) {
            document.querySelectorAll('.select-items').forEach(item => item.classList.add('select-hide'));
            document.querySelectorAll('.select-selected').forEach(item => item.classList.remove('select-arrow-active'));
        }
        if (!window.getSelection().toString()) {
             formatToolbar.classList.remove('visible');
        }
        hideContextMenu();
    });

    contextMenu.addEventListener('click', e => handleContextMenuAction(e));

    let draggedItem = null;

    editorContent.addEventListener('dragstart', e => {
        draggedItem = e.target.closest('.item-container');
        if (draggedItem) setTimeout(() => { draggedItem.classList.add('dragging'); }, 0);
    });

    editorContent.addEventListener('dragend', e => {
        if (draggedItem) draggedItem.classList.remove('dragging');
        draggedItem = null;
    });

    editorContent.addEventListener('dragover', e => {
        e.preventDefault();
        const container = e.target.closest('.card-body');
        if (!container || !draggedItem) return;

        const afterElement = getDragAfterElement(container, e.clientY);
        container.querySelectorAll('.item-container').forEach(el => el.classList.remove('drag-over'));
        if (afterElement) afterElement.classList.add('drag-over');
    });
    
    editorContent.addEventListener('drop', e => {
        e.preventDefault();
        const container = e.target.closest('[data-list-name]');
        if (!container || !draggedItem) return;
        
        container.querySelector('.card-body').querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        
        const listNameAttr = container.dataset.listName;
        const listName = listNameAttr === 'liens-&-en-têtes' ? 'links' : 'socials';
        
        const draggedId = parseInt(draggedItem.dataset.id, 10);
        const afterElement = getDragAfterElement(container.querySelector('.card-body'), e.clientY);
        const targetId = afterElement ? parseInt(afterElement.dataset.id, 10) : null;
        
        logger.info(`Reordering in editor: item ${draggedId} moved before ${targetId} in ${listName}`);
        const currentState = JSON.parse(JSON.stringify(getState()));
        const list = currentState[listName];
        
        currentState[listName] = reorderList(list, draggedId, targetId);
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