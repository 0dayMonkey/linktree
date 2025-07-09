document.addEventListener('DOMContentLoaded', () => {
    // STATE MANAGEMENT
    let state = {};

    // DOM ELEMENTS
    const profilePicUrlInput = document.getElementById('profile-pic-url');
    const profileTitleInput = document.getElementById('profile-title');
    const themeSelector = document.getElementById('theme-selector');
    const linksEditorList = document.getElementById('links-editor-list');
    const socialsEditorList = document.getElementById('socials-editor-list');
    const addLinkBtn = document.getElementById('add-link-btn');
    const addSocialBtn = document.getElementById('add-social-btn');
    const previewFrame = document.getElementById('preview-frame');

    // DATA STRUCTURE & DEFAULTS
    const defaultData = {
        theme: 'light-theme',
        profile: {
            pictureUrl: "https://via.placeholder.com/96",
            title: "@YourName"
        },
        links: [
            { id: 1, title: "My Website", url: "https://www.example.com" }
        ],
        socials: [
            { id: 1, network: "twitter", url: "https://twitter.com/example" }
        ]
    };

    /**
     * Helper to check for a valid URL format.
     * @param {string} string - The URL to validate.
     * @returns {boolean} - True if the URL is valid.
     */
    const isValidUrl = (string) => {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    };

    /**
     * Loads data from localStorage or initializes with default data.
     */
    function loadData() {
        const savedData = localStorage.getItem('linktreeData');
        state = savedData ? JSON.parse(savedData) : JSON.parse(JSON.stringify(defaultData));
    }

    /**
     * Saves the current state to localStorage and reloads the preview.
     */
    function saveAndReload() {
        localStorage.setItem('linktreeData', JSON.stringify(state));
        previewFrame.contentWindow.location.reload();
    }

    /**
     * Renders all editor components based on the current state.
     */
    function render() {
        // Render Profile
        profilePicUrlInput.value = state.profile.pictureUrl || '';
        profileTitleInput.value = state.profile.title || '';

        // Render Theme
        document.querySelector(`input[name="theme"][value="${state.theme}"]`).checked = true;

        // Render Socials
        renderList(socialsEditorList, state.socials, createSocialItemHTML);

        // Render Links
        renderList(linksEditorList, state.links, createLinkItemHTML);
    }

    /**
     * Generic function to render a list of items.
     * @param {HTMLElement} container - The container element.
     * @param {Array} items - The array of data items.
     * @param {Function} htmlFactory - A function that creates the HTML for an item.
     */
    function renderList(container, items, htmlFactory) {
        container.innerHTML = '';
        items.forEach((item, index) => {
            const itemEl = document.createElement('div');
            itemEl.dataset.id = item.id;
            itemEl.innerHTML = htmlFactory(item, index, items.length);
            container.appendChild(itemEl);
        });
    }

    function createSocialItemHTML(item) {
        return `
            <div class="social-item">
                <div class="form-group">
                    <label>Network (e.g., twitter, instagram)</label>
                    <input type="text" class="social-network-input" value="${item.network}">
                </div>
                <div class="form-group">
                    <label>URL</label>
                    <input type="text" class="social-url-input" value="${item.url}">
                </div>
                <button class="btn btn-danger delete-btn">Delete Social</button>
            </div>
        `;
    }

    function createLinkItemHTML(item, index, total) {
        return `
            <div class="link-item">
                <div class="link-item-header">
                    <div class="link-reorder">
                        <button class="btn-move move-up-btn" ${index === 0 ? 'disabled' : ''}>▲</button>
                        <button class="btn-move move-down-btn" ${index === total - 1 ? 'disabled' : ''}>▼</button>
                    </div>
                    <div class="link-item-controls">
                        <button class="btn btn-danger delete-btn">Delete</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" class="link-title-input" value="${item.title}">
                </div>
                <div class="form-group">
                    <label>URL</label>
                    <input type="text" class="link-url-input" value="${item.url}">
                </div>
            </div>
        `;
    }

    // EVENT HANDLERS
    function handleGenericInput(e, listName, key) {
        const itemEl = e.target.closest(`[data-id]`);
        if (!itemEl) return;
        const itemId = parseInt(itemEl.dataset.id);
        const item = state[listName].find(i => i.id === itemId);
        if(item) {
            item[key] = e.target.value;
            // URL Validation Feedback
            if(key === 'url') {
                e.target.classList.toggle('invalid', !isValidUrl(e.target.value));
            }
            saveAndReload();
        }
    }
    
    function handleGenericDelete(e, listName) {
        if (!e.target.classList.contains('delete-btn')) return;
        const itemEl = e.target.closest('[data-id]');
        if (!itemEl) return;
        const itemId = parseInt(itemEl.dataset.id);
        state[listName] = state[listName].filter(item => item.id !== itemId);
        render();
        saveAndReload();
    }
    
    function handleGenericAdd(listName, defaultItem) {
        const newId = state[listName].length > 0 ? Math.max(...state[listName].map(l => l.id)) + 1 : 1;
        state[listName].push({ ...defaultItem, id: newId });
        render();
        saveAndReload();
    }

    function handleMoveLink(e) {
        const isUp = e.target.classList.contains('move-up-btn');
        const isDown = e.target.classList.contains('move-down-btn');
        if (!isUp && !isDown) return;

        const itemEl = e.target.closest('[data-id]');
        if (!itemEl) return;

        const linkId = parseInt(itemEl.dataset.id);
        const index = state.links.findIndex(l => l.id === linkId);

        if ((isUp && index > 0) || (isDown && index < state.links.length - 1)) {
            const newIndex = isUp ? index - 1 : index + 1;
            // Swap elements in the array
            [state.links[index], state.links[newIndex]] = [state.links[newIndex], state.links[index]];
            render();
            saveAndReload();
        }
    }

    // INITIALIZATION
    function init() {
        loadData();
        render();
        saveAndReload();

        // Attach event listeners
        profilePicUrlInput.addEventListener('input', e => { state.profile.pictureUrl = e.target.value; saveAndReload(); });
        profileTitleInput.addEventListener('input', e => { state.profile.title = e.target.value; saveAndReload(); });
        themeSelector.addEventListener('change', e => { state.theme = e.target.value; saveAndReload(); });

        addLinkBtn.addEventListener('click', () => handleGenericAdd('links', { title: 'New Link', url: 'https://' }));
        addSocialBtn.addEventListener('click', () => handleGenericAdd('socials', { network: 'github', url: 'https://' }));
        
        linksEditorList.addEventListener('input', e => handleGenericInput(e, 'links', e.target.classList.contains('link-title-input') ? 'title' : 'url'));
        socialsEditorList.addEventListener('input', e => handleGenericInput(e, 'socials', e.target.classList.contains('social-network-input') ? 'network' : 'url'));

        linksEditorList.addEventListener('click', handleGenericDelete.bind(null, 'links'));
        socialsEditorList.addEventListener('click', handleGenericDelete.bind(null, 'socials'));

        linksEditorList.addEventListener('click', handleMoveLink);
    }

    init();
});