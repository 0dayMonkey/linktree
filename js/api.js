// js/api.js

export async function fetchData(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Erreur réseau (${response.status})`);
    }
    const data = await response.json();
    if (!data.profile) {
        throw new Error("Les données reçues sont invalides ou vides.");
    }
    return data;
}

export async function saveData(url, secret, data) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, data }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Échec de la sauvegarde');
    }
    return await response.json();
}