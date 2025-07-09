// js/state.js
import { saveData } from './api.js';
import { render } from './ui.js';
import { API } from './config.js';

let state = {};

const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
};

const saveStateToNotion = async () => {
    if (!state || !state.profile) return;
    document.getElementById('save-status').textContent = 'Sauvegarde...';
    document.getElementById('save-status').style.color = '#ffc107';
    try {
        await saveData(API.UPDATE_DATA_URL, API.UPDATE_SECRET_KEY, state);
        document.getElementById('save-status').textContent = 'Modifications enregistrées';
        document.getElementById('save-status').style.color = 'var(--success-color)';
    } catch (error) {
        document.getElementById('save-status').textContent = `Erreur: ${error.message}`;
        document.getElementById('save-status').style.color = 'var(--danger-color)';
    }
};

const debouncedSave = debounce(saveStateToNotion, 1500);

export function setState(newState) {
    state = newState;
}

export function getState() {
    return state;
}

export function updateAndSave(newState) {
    setState(newState);
    if (document.getElementById('preview-frame').contentWindow) {
        document.getElementById('preview-frame').contentWindow.postMessage({ type: 'update', payload: state }, window.location.origin);
    }
    render(state);
    debouncedSave();
}

export function handleStateUpdate(key, value, id) {
    const newState = JSON.parse(JSON.stringify(getState()));
    if (id) {
        const list = [...(newState.links || []), ...(newState.socials || [])];
        const item = list.find(i => i.id === id);
        if (item) item[key] = value;
    } else {
        let current = newState;
        const keyParts = key.split('.');
        keyParts.forEach((part, index) => {
            if (index === keyParts.length - 1) current[part] = value;
            else current = current[part] = current[part] || {};
        });
    }
    updateAndSave(newState);
}