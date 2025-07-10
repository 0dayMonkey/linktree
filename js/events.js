import { updateAndSave, getState, handleStateUpdate } from './state.js';
import { showConfirmation, showContextMenu, hideContextMenu, showSpotifySearch } from './ui.js';
import logger from './logger.js';
import { 
    debounce, handleFileUpload, handleContextMenuAction, 
    handleCustomSelect, handleSelectOption, reorderList 
} from './modules/eventHandlers.js';

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
        
        if (rect.width === 0 && rect.height === 0) {
            formatToolbar.classList.remove('visible');
            return;
        }
        
        const toolbarHeight = formatToolbar.offsetHeight;
        const toolbarWidth = formatToolbar.offsetWidth;

        let top = rect.top + window.scrollY - toolbarHeight - 8;
        if (top < window.scrollY) {
            top = rect.bottom + window.scrollY + 8;
        }
        let left = rect.left + window.scrollX + (rect.width / 2) - (toolbarWidth / 2);
        left = Math.max(8, left);
        left = Math.min(left, window.innerWidth - toolbarWidth - 8);

        formatToolbar.style.top = `${top}px`;
        formatToolbar.style.left = `${left}px`;
        formatToolbar.classList.add('visible');
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
        
        if (target.matches('input[type="file"]')) {
            return;
        }
        
        if (target.matches('.editable-content')) {
            const id = target.closest('[data-id]') ? parseInt(target.closest('[data-id]').dataset.id, 10) : null;
            handleStateUpdate(target.dataset.key, target.innerHTML, id, { skipRender: true });
        } else if (target.dataset.key) {
             const id = target.closest('[data-id]') ? parseInt(target.closest('[data-id]').dataset.id, 10) : null;
             handleStateUpdate(target.dataset.key, target.value, id);
        }
    }, 400);

    editorContent.addEventListener('input', debouncedInputHandler);
    document.addEventListener('selectionchange', showFormatToolbar);
    editorContent.addEventListener('touchend', () => setTimeout(showFormatToolbar, 100));

    editorContent.addEventListener('change', e => {
        if (e.target.matches('.file-upload-input')) {
            handleFileUpload(e);
        } else if (e.target.matches('input[type=color]')) {
             const id = e.target.closest('[data-id]') ? parseInt(e.target.closest('[data-id]').dataset.id, 10) : null;
             handleStateUpdate(e.target.dataset.key, e.target.value, id);
        }
    });

    editorContent.addEventListener('click', async (e) => {
        const actionTarget = e.target.closest('[data-action]');
        const customSelectTarget = e.target.closest('.custom-select');

        if (actionTarget) {
            e.preventDefault();
            const action = actionTarget.dataset.action;
            
            logger.info(`Button action: ${action}`);
            const currentState = JSON.parse(JSON.stringify(getState()));
            let stateChanged = true;
            
            if (action.startsWith('move-section')) {
                const direction = action.endsWith('up') ? 'up' : 'down';
                const sectionName = actionTarget.dataset.sectionName;
                const order = currentState.sectionOrder || ['socials', 'songs', 'links'];
                const index = order.indexOf(sectionName);
                
                if (direction === 'up' && index > 0) {
                    [order[index], order[index - 1]] = [order[index - 1], order[index]];
                } else if (direction === 'down' && index < order.length - 1) {
                    [order[index], order[index + 1]] = [order[index + 1], order[index]];
                }
                currentState.sectionOrder = order;

            } else if (action === 'delete-song') {
                 const itemEl = e.target.closest('[data-id]');
                 const songId = itemEl.dataset.id;
                 currentState.songs = (currentState.songs || []).filter(item => item.songId !== songId);
            } else if (action === 'delete') {
                const itemEl = e.target.closest('[data-id]');
                const confirmed = await showConfirmation('Êtes-vous sûr(e) ?', 'Cette action est irréversible.');
                if (!itemEl || !confirmed) return logger.info('Deletion cancelled by user.');
                const id = parseInt(itemEl.dataset.id, 10);
                currentState.links = (currentState.links || []).filter(item => item.id !== id);
                currentState.socials = (currentState.socials || []).filter(item => item.id !== id);
            } else if (action === 'add-song') {
                showSpotifySearch((newSong) => {
                    const currentState = JSON.parse(JSON.stringify(getState()));
                    if (!currentState.songs) currentState.songs = [];
                    if (currentState.songs.some(s => s.songId === newSong.songId)) {
                        showConfirmation('Erreur', 'Cette chanson est déjà dans votre liste.');
                        return;
                    }
                    currentState.songs.push({
                        ...newSong,
                        order: currentState.songs.length
                    });
                    updateAndSave(currentState);
                });
                stateChanged = false;
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

        } else if (customSelectTarget) {
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
                const reorderedList = reorderList(list, dId, tId, listName === 'songs' ? 'songId' : 'id');
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
        if (window.getSelection && window.getSelection().isCollapsed) {
             formatToolbar.classList.remove('visible');
        }
        hideContextMenu();
    });

    contextMenu.addEventListener('click', e => handleContextMenuAction(e));

    let draggedItem = null;

    editorContent.addEventListener('dragstart', e => {
        if (e.target.matches('input, .editable-content, a')) {
            e.preventDefault();
            return;
        }
        draggedItem = e.target.closest('.item-container');
        if (draggedItem) {
            setTimeout(() => { draggedItem.classList.add('dragging'); }, 0);
        }
    });

    editorContent.addEventListener('dragend', e => {
        if (draggedItem) draggedItem.classList.remove('dragging');
        draggedItem = null;
    });

    editorContent.addEventListener('dragover', e => {
        e.preventDefault();
        if (!draggedItem) return;

        const container = e.target.closest('.card-body');
        if (!container) return;
        
        const isHorizontal = !!draggedItem.closest('[data-section-name="songs"]');
        const afterElement = isHorizontal 
            ? getDragAfterElementHorizontal(container, e.clientX)
            : getDragAfterElement(container, e.clientY);

        container.querySelectorAll('.item-container').forEach(el => el.classList.remove('drag-over'));
        if (afterElement) afterElement.classList.add('drag-over');
    });
    
    editorContent.addEventListener('drop', e => {
        e.preventDefault();
        if (!draggedItem) return;

        const container = e.target.closest('.card[data-section-name]');
        if (!container) return;
        
        container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        
        const listName = container.dataset.sectionName;
        const idKey = listName === 'songs' ? 'songId' : 'id';
        const isHorizontal = listName === 'songs';
        
        const draggedId = draggedItem.dataset.id;
        const afterElement = isHorizontal
            ? getDragAfterElementHorizontal(container.querySelector('.card-body'), e.clientX)
            : getDragAfterElement(container.querySelector('.card-body'), e.clientY);

        const targetId = afterElement ? afterElement.dataset.id : null;
        
        logger.info(`Reordering in list '${listName}': item ${draggedId} moved before ${targetId}`);
        const currentState = JSON.parse(JSON.stringify(getState()));
        const list = currentState[listName];
        
        currentState[listName] = reorderList(list, draggedId, targetId, idKey);
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

    function getDragAfterElementHorizontal(container, x) {
        const draggableElements = [...container.querySelectorAll('.item-container:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = x - box.left - box.width / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
}