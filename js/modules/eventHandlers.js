import { updateAndSave, getState, handleStateUpdate } from '../state.js';
import { showConfirmation, hideContextMenu } from '../ui.js';
import logger from '../logger.js';

const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
});

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
    
    logger.info(`Uploading file for ${key}. Original size: ${(file.size / 1024).toFixed(2)} KB`);

    // CORRECTION : Paramètres de compression beaucoup plus stricts pour éviter l'erreur 413
    const options = {
        maxSizeMB: 0.15, // Réduction drastique de la taille maximale
        maxWidthOrHeight: 1024, // Réduction de la résolution maximale
        useWebWorker: true,
        exifOrientation: true,
        stripExif: true
    };

    try {
        const compressedFile = await imageCompression(file, options);
        logger.info(`Compressed file size: ${(compressedFile.size / 1024).toFixed(2)} KB`);

        const base64String = await readFileAsBase64(compressedFile);
        const id = e.target.closest('[data-id]') ? parseInt(e.target.closest('[data-id]').dataset.id, 10) : null;
        handleStateUpdate(key, base64String, id);

    } catch (error) {
        logger.error('File compression or upload failed', error);
        showConfirmation('Erreur', `La compression ou le téléversement du fichier a échoué : ${error.message}`);
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

export function reorderList(list, draggedId, targetId) {
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

export function handleToggle(checkboxElement) {
    if (!checkboxElement) return;
    const key = checkboxElement.dataset.key;
    const isChecked = checkboxElement.checked;
    handleStateUpdate(key, isChecked);
}