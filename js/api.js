// js/api.js
import logger from './logger.js';

export async function fetchData(url) {
    logger.info('API Call: Fetching data from', url);
    const response = await fetch(url);
    if (!response.ok) {
        logger.error('Network error while fetching data', response);
        throw new Error(`Erreur réseau (${response.status})`);
    }
    const data = await response.json();
    if (!data.profile) {
        logger.error('Invalid or empty data received from API', data);
        throw new Error("Les données reçues sont invalides ou vides.");
    }
    logger.info('API Call: Data fetched successfully.');
    return data;
}

export async function saveData(url, secret, data) {
    logger.info('API Call: Saving data to', url);
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, data }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        logger.error('API Call: Failed to save data.', errorData);
        throw new Error(errorData.message || 'Échec de la sauvegarde');
    }
    logger.info('API Call: Data saved successfully.');
    return await response.json();
}