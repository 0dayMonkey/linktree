import { updateAndSave, getState, handleStateUpdate } from '../state.js';
import { showConfirmation, hideContextMenu } from '../ui.js';
import logger from '../logger.js';
import { CLOUDINARY } from '../config.js';

export const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
};

export const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    const key = e.target.dataset.key;
    if (!key || !file) return;

    logger.info(`Uploading file for ${key} to Cloudinary...`);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY.UPLOAD_PRESET); 

    try {
        const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY.CLOUD_NAME}/image/upload`;
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || 'Cloudinary upload failed');
        }

        const data = await response.json();
        const imageUrl = data.secure_url;
        logger.info(`File uploaded to Cloudinary: ${imageUrl}`);
        
        const id = e.target.closest('[data-id]') ? parseInt(e.target.closest('[data-id]').dataset.id, 10) : null;
        handleStateUpdate(key, imageUrl, id);

    } catch (error) {
        logger.error('Cloudinary upload failed', error);
        showConfirmation('Erreur', `Le téléversement du fichier sur Cloudinary a échoué : ${error.message}`);
    }
};

export async function handleContextMenuAction(e) {
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

export function handleCustomSelect(e) {
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

export function handleSelectOption(e) {
    const option = e.target.closest('[data-value]');
    if (!option) return;

    const select = option.closest('.custom-select');
    const key = select.dataset.key;
    const id = select.closest('[data-id]') ? parseInt(select.closest('[data-id]').dataset.id, 10) : null;
    const value = option.dataset.value;
    
    handleStateUpdate(key, value, id);
}

// MODIFIÉ : La fonction de réorganisation peut maintenant utiliser une clé personnalisée (songId)
export function reorderList(list, draggedId, targetId, idKey = 'id') {
    const draggedIndex = list.findIndex(item => String(item[idKey]) === String(draggedId));
    if (draggedIndex === -1) return list;

    const [draggedItem] = list.splice(draggedIndex, 1);

    if (targetId === null) {
        list.push(draggedItem);
    } else {
        const targetIndex = list.findIndex(item => String(item[idKey]) === String(targetId));
        if (targetIndex !== -1) {
            list.splice(targetIndex, 0, draggedItem);
        } else {
             list.push(draggedItem);
        }
    }
    return list;
}

export function handleToggle(checkboxElement) {
    if (!checkboxElement) return;
    const key = checkboxElement.dataset.key;
    const isChecked = checkboxElement.checked;
    handleStateUpdate(key, isChecked);
}