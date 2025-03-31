document.addEventListener('DOMContentLoaded', () => {
    // --- Initial Default Model Definitions ---
    const initialDefaultModels = [
        // OpenAI
        { id: 'gpt-4o', name: 'gpt-4o', group: 'OpenAI' },
        { id: '4o-mini', name: '4o-mini', group: 'OpenAI' },
        { id: 'o1', name: 'o1', group: 'OpenAI' },
        { id: 'o1-pro', name: 'o1-pro', group: 'OpenAI' },
        { id: 'o3-mini', name: 'o3-mini', group: 'OpenAI' },
        { id: 'gpt-4.5', name: 'gpt-4.5', group: 'OpenAI' },
        // Anthropic
        { id: 'claude-3.5', name: 'claude 3.5', group: 'Anthropic' },
        { id: 'claude-3.7', name: 'claude 3.7', group: 'Anthropic' },
        { id: 'claude-3.7-thinking', name: 'claude 3.7 thinking', group: 'Anthropic' },
        { id: '3-opus', name: '3 opus', group: 'Anthropic' },
        // Google
        { id: 'gemini-2.0-flash', name: 'gemini 2.0 flash', group: 'Google' },
        { id: '2.0-flash-lite', name: '2.0 flash-lite', group: 'Google' },
        { id: '2.0-flash-thinking', name: '2.0 flash thinking', group: 'Google' },
        { id: '2.5-pro', name: '2.5 pro', group: 'Google' },
        // DeepSeek
        { id: 'deepseek-v3', name: 'v3', group: 'DeepSeek' },
        { id: 'v3-0324', name: 'v3-0324', group: 'DeepSeek' },
        { id: 'r1', name: 'r1', group: 'DeepSeek' },
        // xAI
        { id: 'grok-3', name: 'grok 3', group: 'xAI' }
    ];
    const defaultTitleHTML = `<img src="images/favicon.png" alt="Logo" style="height: 1em; vertical-align: middle; margin-right: 0.3em;">RankMyAI`;
    const defaultDescription = "Drag and drop AI models to rank them in different tiers";
    const anythingTitleHTML = `<img src="images/favicon.png" alt="Logo" style="height: 1em; vertical-align: middle; margin-right: 0.3em;">RankMyAnything`;
    const anythingDescription = "Drag and drop anything to rank them in different tiers";


    // --- Constants ---
    const LOGO_URLS = { // Using local paths now
        'OpenAI': 'images/openai-icon.png',
        'Anthropic': 'images/claude-ai-icon.png',
        'Google': 'images/google-gemini-icon.png',
        'DeepSeek': 'images/deepseek-logo-icon.png',
        'xAI': 'images/grok-icon.png'
        // Add paths for any other default groups if needed
    };
    const CUSTOM_PLACEHOLDER_URL = 'images/placeholder-icon.png'; // Updated placeholder path
    const MODELS_STORAGE_KEY = 'tierListModelsState'; // Stores array of all model objects
    const LAYOUT_STORAGE_KEY = 'tierListLayoutState'; // Stores { tier: [id1, id2], ... }
    const MODE_STORAGE_KEY = 'tierListModeState'; // Stores boolean for isRankAnythingMode

    // --- DOM Elements ---
    const unrankedContainer = document.getElementById('unranked-container');
    const allDropZones = document.querySelectorAll('.drop-zone');
    const resetButton = document.getElementById('reset-btn');
    const addModelButton = document.getElementById('add-model-btn');
    const modalOverlay = document.getElementById('add-model-modal');
    // const modalContent = modalOverlay.querySelector('.modal-content'); // Not directly used
    const saveModelButton = document.getElementById('save-model-btn');
    const cancelModalButton = document.getElementById('cancel-modal-btn');
    const modelNameInput = document.getElementById('model-name-input');
    const modelImageUrlInput = document.getElementById('model-image-url-input');
    const deleteModelButton = document.getElementById('delete-model-btn');
    const modalTitle = modalOverlay.querySelector('h2');
    const shareButton = document.getElementById('share-btn');     // Added
    // Custom Popup Elements
    const customAlertOverlay = document.getElementById('custom-alert-overlay');
    const customAlertMessage = document.getElementById('custom-alert-message');
    const customAlertOkBtn = document.getElementById('custom-alert-ok-btn');
    const customConfirmOverlay = document.getElementById('custom-confirm-overlay');
    const customConfirmMessage = document.getElementById('custom-confirm-message');
    const customConfirmYesBtn = document.getElementById('custom-confirm-yes-btn');
    const customConfirmNoBtn = document.getElementById('custom-confirm-no-btn');
    const headerElement = document.querySelector('header'); // Added
    const headerTitleLink = document.querySelector('header h1 a'); // Added
    const headerDescription = document.querySelector('header p'); // Added


    // --- State Variables ---
    let appState = { // Unified state object
        models: [], // Holds the current state of ALL models (default + custom + edits)
        layout: {},  // Holds tier -> [model IDs] mapping
        isRankAnythingMode: false // NEW: Track the mode
    };
    let editingModelId = null; // Track ID of model being edited/deleted
    let draggedItem = null;
    let dropSuccessful = false; // Used in drag end logic

    // --- Custom Popup Functions ---
    function showCustomAlert(message) {
        customAlertMessage.textContent = message;
        customAlertOverlay.style.display = 'flex';
        // Use onclick for simplicity here, ensures only one listener
        customAlertOkBtn.onclick = () => {
            customAlertOverlay.style.display = 'none';
        };
    }

    function showCustomConfirm(message) {
        return new Promise((resolve) => {
            customConfirmMessage.textContent = message;
            customConfirmOverlay.style.display = 'flex';

            // Assign onclick handlers directly, overwriting any previous ones
            customConfirmYesBtn.onclick = () => {
                customConfirmOverlay.style.display = 'none';
                resolve(true);
            };

            customConfirmNoBtn.onclick = () => {
                customConfirmOverlay.style.display = 'none';
                resolve(false);
            };
        });
    }


    // --- State Management (Load/Save) ---

    function loadStateFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const stateParam = urlParams.get('state');

        if (stateParam) {
            try {
                const decodedJson = atob(stateParam); // Decode Base64
                const loadedState = JSON.parse(decodedJson);

                // Basic validation - Check for models, layout, and the mode flag
                if (loadedState && Array.isArray(loadedState.models) && typeof loadedState.layout === 'object' && typeof loadedState.isRankAnythingMode === 'boolean') {
                    // Set appState directly from URL state
                    appState.models = loadedState.models;
                    appState.layout = loadedState.layout;
                    appState.isRankAnythingMode = loadedState.isRankAnythingMode;

                    // Overwrite localStorage with the state from the URL
                    localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(appState.models));
                    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(appState.layout));
                    localStorage.setItem(MODE_STORAGE_KEY, JSON.stringify(appState.isRankAnythingMode));
                    console.log("Loaded state from URL parameter.");
                    // Remove the state parameter from the URL visually without reloading
                    window.history.replaceState({}, document.title, window.location.pathname);
                    return true; // Indicate state was loaded from URL
                } else {
                    console.warn("Invalid state data found in URL parameter.");
                    showCustomAlert("Could not load the shared link: Invalid data format.");
                }
            } catch (e) {
                console.error("Error processing state from URL parameter:", e);
                showCustomAlert("Could not load the shared link: Error processing data.");
            }
        }
        return false; // Indicate state was not loaded from URL
    }


    function loadAppStateFromLocalStorage() {
        const savedModelsJson = localStorage.getItem(MODELS_STORAGE_KEY);
        const savedLayoutJson = localStorage.getItem(LAYOUT_STORAGE_KEY);
        const savedModeJson = localStorage.getItem(MODE_STORAGE_KEY); // Load mode flag

        let loadedModels = [];
        let loadedLayout = {};
        let loadedMode = false; // Default to RankMyAI mode

        // Load Mode first
        if (savedModeJson) {
            try {
                loadedMode = JSON.parse(savedModeJson);
                if (typeof loadedMode !== 'boolean') {
                    loadedMode = false; // Default on invalid type
                }
            } catch (e) {
                console.error("Error parsing saved mode from localStorage:", e);
                loadedMode = false;
            }
        }
        appState.isRankAnythingMode = loadedMode; // Set state flag

        // Load Models
        if (savedModelsJson) {
            try {
                loadedModels = JSON.parse(savedModelsJson);
                if (!Array.isArray(loadedModels)) {
                    console.warn("Invalid models data in localStorage, resetting.");
                    loadedModels = [];
                }
            } catch (e) {
                console.error("Error parsing saved models from localStorage:", e);
                loadedModels = [];
            }
        }

        // If no valid saved models AND we are in RankMyAI mode, initialize with defaults
        if (loadedModels.length === 0 && !appState.isRankAnythingMode) {
            loadedModels = JSON.parse(JSON.stringify(initialDefaultModels));
            console.log("Initialized with default models.");
        }
        // If we are in RankAnything mode, models should remain empty unless loaded

        // Load Layout
        if (savedLayoutJson) {
            try {
                loadedLayout = JSON.parse(savedLayoutJson);
                if (typeof loadedLayout !== 'object' || loadedLayout === null) {
                    console.warn("Invalid layout data in localStorage, resetting.");
                    loadedLayout = {};
                }
            } catch (e) {
                console.error("Error parsing saved layout from localStorage:", e);
                loadedLayout = {};
            }
        }

        appState.models = loadedModels;
        appState.layout = loadedLayout;

        // Update UI based on loaded mode AFTER loading state
        updateHeaderBasedOnMode();
    }

    function saveAppState() {
        // 1. Update the layout based on current DOM structure
        const currentLayout = {};
        allDropZones.forEach(zone => {
            const tier = zone.getAttribute('data-tier');
            const modelIds = Array.from(zone.querySelectorAll('.model-card:not(.add-card)')) // Exclude add button
                                 .map(card => card.getAttribute('data-id'));
            if (tier && modelIds.length > 0) { // Only include tiers with models
                currentLayout[tier] = modelIds;
            }
        });
        appState.layout = currentLayout; // Always update layout from DOM before saving


        // 2. Save the current models array, the updated layout, and the mode flag
        try {
            localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(appState.models));
            localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(appState.layout));
            localStorage.setItem(MODE_STORAGE_KEY, JSON.stringify(appState.isRankAnythingMode)); // Save mode flag
            // console.log("App state saved:", appState); // For debugging
        } catch (e) {
            console.error("Error saving app state to localStorage:", e);
            showCustomAlert("Error saving state. Changes might not persist."); // Use custom alert
        }
    }

    // --- UI Update Function ---
    function updateHeaderBasedOnMode() {
        if (appState.isRankAnythingMode) {
            if (headerTitleLink) headerTitleLink.innerHTML = anythingTitleHTML;
            if (headerDescription) headerDescription.textContent = anythingDescription;
            document.title = "RankMyAnything"; // Update page title
        } else {
            if (headerTitleLink) headerTitleLink.innerHTML = defaultTitleHTML;
            if (headerDescription) headerDescription.textContent = defaultDescription;
            document.title = "RankMyAI"; // Update page title
        }
    }


    // --- Card Creation & Updates ---

    function getLogoUrl(group) {
        return LOGO_URLS[group] || null;
    }

    function updateCardContent(cardElement, modelData) {
        cardElement.innerHTML = ''; // Clear existing content first

        const logoImg = document.createElement('img');
        logoImg.classList.add('model-logo');

        // Determine the correct logo URL
        let finalLogoUrl = modelData.logoUrl; // User-provided custom URL first
        if (!finalLogoUrl && modelData.group !== 'Custom') {
            finalLogoUrl = getLogoUrl(modelData.group); // Default group logo
        }
        if (!finalLogoUrl) { // If still no URL (custom without URL, or default group missing)
            finalLogoUrl = CUSTOM_PLACEHOLDER_URL;
        }

        logoImg.src = finalLogoUrl;
        logoImg.alt = `${modelData.name} logo`;
        logoImg.draggable = false;
        logoImg.onerror = () => {
            logoImg.src = CUSTOM_PLACEHOLDER_URL; // Fallback on error
            console.warn(`Error loading logo for ${modelData.name}, falling back to placeholder.`);
        };
        cardElement.appendChild(logoImg);

        const nameSpan = document.createElement('span');
        nameSpan.classList.add('model-name');
        nameSpan.textContent = modelData.name;
        cardElement.appendChild(nameSpan);
    }

    function createModelCard(model) {
        const card = document.createElement('div');
        card.classList.add('model-card');
        card.setAttribute('draggable', 'true');
        card.setAttribute('data-id', model.id);

        updateCardContent(card, model); // Use helper to set content

        // Drag Start
        card.addEventListener('dragstart', (e) => {
            draggedItem = card;
            dropSuccessful = false; // Reset flag
            setTimeout(() => card.classList.add('dragging'), 0);
            e.dataTransfer.setData('text/plain', model.id); // Keep this for potential external drops?
            e.dataTransfer.effectAllowed = 'move';
        });

        // Drag End
        card.addEventListener('dragend', () => {
            setTimeout(() => { // Use setTimeout to allow drop event to potentially fire first
                if (draggedItem) { // Check if we are still tracking a dragged item
                    if (!dropSuccessful) {
                        // If drop was not successful on a valid zone, move back to unranked
                        unrankedContainer.insertBefore(draggedItem, addModelButton);
                        console.log(`Item ${draggedItem.dataset.id} returned to unranked.`);
                        saveAppState(); // Save state after moving back
                        ensureAddCardIsLast();
                    }
                    // Clean up dragging class regardless
                    draggedItem.classList.remove('dragging');
                }
                // Reset state variables
                draggedItem = null;
                dropSuccessful = false; // Reset for next drag
            }, 0);
        });

        // Double-click listener for editing/deleting (for ALL models)
        card.addEventListener('dblclick', () => handleDoubleClick(model.id)); // Pass ID

        return card;
    }

    // --- UI Population & Layout ---

    // Helper to ensure the Add button is always the last element in the unranked container
    function ensureAddCardIsLast() {
        const addBtn = document.getElementById('add-model-btn');
        if (addBtn && unrankedContainer.lastElementChild !== addBtn) {
            unrankedContainer.appendChild(addBtn);
        }
    }

    function populateModels() {
        // Clear existing cards (excluding the add button)
        unrankedContainer.querySelectorAll('.model-card:not(.add-card)').forEach(card => card.remove());
        document.querySelectorAll('.tier-models').forEach(tierZone => {
            tierZone.innerHTML = ''; // Clear tiered zones too
        });

        // Create cards for all models in the current state and add to unranked initially
        appState.models.forEach(model => {
            const card = createModelCard(model);
            // Add card to unranked container (ensureAddCardIsLast will fix order later)
            unrankedContainer.appendChild(card);
        });
        ensureAddCardIsLast(); // Ensure '+' is last after initial population
    }

    function applyLayout() {
        // Move cards according to the loaded layout state
        for (const tier in appState.layout) {
            const targetZone = document.querySelector(`.drop-zone[data-tier="${tier}"]`);
            if (targetZone) {
                appState.layout[tier].forEach(modelId => {
                    // Find card anywhere in the document (might be in unranked or another tier already)
                    const card = document.querySelector(`.model-card[data-id="${modelId}"]`);
                    if (card) {
                        targetZone.appendChild(card); // Move to correct tier
                    } else {
                         console.warn(`Model card with ID ${modelId} not found during layout application.`);
                    }
                });
            } else {
                console.warn(`Target zone for tier ${tier} not found during layout application.`);
            }
        }
        // Ensure add card is last in unranked after applying layout
        ensureAddCardIsLast();
    }


    // --- Modal Logic ---

    function showModal(editMode = false, model = null) {
        editingModelId = editMode ? model.id : null;

        const isCustomModel = editMode && model && model.id.startsWith('custom-');
        const isDefaultModel = editMode && model && !isCustomModel;

        // Adjust modal title based on mode
        const itemTerm = appState.isRankAnythingMode ? 'Item' : 'Model';
        if (editMode) {
            modalTitle.textContent = isCustomModel ? `Edit Custom ${itemTerm}` : `Edit Default ${itemTerm}`;
        } else {
            modalTitle.textContent = `Add Custom ${itemTerm}`;
        }
        modelNameInput.labels[0].textContent = `${itemTerm} Name:`; // Update label


        modelNameInput.value = editMode ? model.name : '';
        modelImageUrlInput.value = editMode ? (model.logoUrl || '') : '';
        // Show delete button only in edit mode
        deleteModelButton.style.display = editMode ? 'inline-block' : 'none';

        modalOverlay.style.display = 'flex';
        modelNameInput.focus();
    }

    function hideModal() {
        modalOverlay.style.display = 'none';
        editingModelId = null; // Clear editing state
    }

    function handleSaveModel() {
        const name = modelNameInput.value.trim();
        const imageUrl = modelImageUrlInput.value.trim();
        const itemTerm = appState.isRankAnythingMode ? 'Item' : 'Model'; // Get current term

        if (!name) {
            showCustomAlert(`${itemTerm} name is required.`); // Use term
            modelNameInput.focus();
            return;
        }
        if (imageUrl && !imageUrl.startsWith('http')) {
            showCustomAlert('Please enter a valid URL (starting with http/https) or leave blank.'); // Use custom alert
            modelImageUrlInput.focus();
            return;
        }

        if (editingModelId) {
            // --- Edit Existing Model ---
            const modelIndex = appState.models.findIndex(m => m.id === editingModelId);
            if (modelIndex > -1) {
                // Update the model in the main state array
                appState.models[modelIndex].name = name;
                appState.models[modelIndex].logoUrl = imageUrl || null; // Use null if empty

                // Find card in DOM and update its content visually
                const cardToUpdate = document.querySelector(`.model-card[data-id="${editingModelId}"]`);
                if (cardToUpdate) {
                    updateCardContent(cardToUpdate, appState.models[modelIndex]);
                } else {
                    console.error("Could not find card in DOM to update with ID:", editingModelId);
                }
                saveAppState(); // Save the entire state (models + layout + mode)
            } else {
                console.error("Could not find model in appState to edit with ID:", editingModelId);
            }
        } else {
            // --- Add New Model ---
            const newModel = {
                id: 'custom-' + Date.now(),
                name: name,
                group: 'Custom', // Assign group
                logoUrl: imageUrl || null
            };
            appState.models.push(newModel); // Add to the main state array
            const newCard = createModelCard(newModel);
            unrankedContainer.insertBefore(newCard, addModelButton); // Add visually
            saveAppState(); // Save the entire state (models + layout + mode)
            ensureAddCardIsLast(); // Ensure '+' is last after adding
        }

        hideModal();
    }

    function handleDeleteModel() {
        if (!editingModelId) return;

        // Find the model index in the main state array
        const modelIndex = appState.models.findIndex(m => m.id === editingModelId);

        if (modelIndex === -1) {
            console.error("Model to delete not found in appState:", editingModelId);
            hideModal();
            return;
        }

        const modelToDelete = appState.models[modelIndex];

        // Remove model from state array regardless of whether it's default or custom
        appState.models.splice(modelIndex, 1);

        // Remove the card from the DOM
        const cardToRemove = document.querySelector(`.model-card[data-id="${editingModelId}"]`);
        if (cardToRemove) {
            cardToRemove.remove();
        } else {
            console.error("Could not find card to remove with ID:", editingModelId);
        }

        saveAppState(); // Save the updated state (models + layout + mode)
        ensureAddCardIsLast(); // Ensure '+' is last after deleting (if deleted from unranked)
        hideModal();
    }

    // --- Double Click Handler ---
    function handleDoubleClick(modelId) { // Receive ID
        if (modelId) {
            // Find the model data from the current appState
            const modelData = appState.models.find(m => m.id === modelId);
            if (modelData) {
                showModal(true, modelData); // Open modal in edit mode
            } else {
                console.error("Double-clicked model not found in appState:", modelId);
            }
        }
    }

    // --- Drag & Drop Event Listeners ---
    allDropZones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault(); // Necessary to allow drop
            zone.classList.add('drag-over');
            e.dataTransfer.dropEffect = 'move';
        });
        zone.addEventListener('dragenter', (e) => {
            e.preventDefault();
            zone.classList.add('drag-over');
        });
        zone.addEventListener('dragleave', (e) => {
            // Check if the leave is going towards a child element within the zone
             if (!zone.contains(e.relatedTarget)) {
                zone.classList.remove('drag-over');
             }
        });
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            if (draggedItem && zone.contains(draggedItem) === false) {
                // Check if dropping onto the add button itself - prevent this
                if (e.target.closest('.add-card')) {
                    console.log("Cannot drop onto add button");
                    return;
                }

                // Append to the target zone (before the add button if it's the unranked zone)
                if (zone.id === 'unranked-container') {
                    zone.insertBefore(draggedItem, addModelButton);
                } else {
                    zone.appendChild(draggedItem);
                }
                dropSuccessful = true; // Mark drop as successful
                saveAppState(); // Save state after successful drop (models + layout + mode)
                ensureAddCardIsLast(); // Ensure '+' is last after any drop
            }
        });
    });

    // --- Reset Button ---
    resetButton.addEventListener('click', async (event) => { // Make listener async and receive event
        // Check for Alt key first
        if (event.altKey) {
            handleAltReset(); // Call the specific Alt+Reset handler
            return; // Stop further execution for this click
        }

        // --- Normal Reset Logic (Corrected) ---
        const confirmed = await showCustomConfirm("Are you sure you want to reset? This will restore default AI models and reset tiers.");
        if (confirmed) {
            // 1. Set mode to RankMyAI
            appState.isRankAnythingMode = false;

            // 2. Clear ALL relevant localStorage
            localStorage.removeItem(MODELS_STORAGE_KEY);
            localStorage.removeItem(LAYOUT_STORAGE_KEY);
            localStorage.removeItem(MODE_STORAGE_KEY);

            // 3. Directly load defaults into state
            appState.models = JSON.parse(JSON.stringify(initialDefaultModels));
            appState.layout = {}; // Reset layout

            // 4. Update Header UI
            updateHeaderBasedOnMode();

            // 5. Repopulate DOM
            populateModels(); // Clears old cards and adds defaults to unranked

            // 6. Save the restored default state
            saveAppState();

            console.log("Tier list reset to default RankMyAI state.");
        }
    });

    // --- Modal Event Listeners ---
    addModelButton.addEventListener('click', () => showModal(false)); // Add mode
    cancelModalButton.addEventListener('click', hideModal);
    saveModelButton.addEventListener('click', handleSaveModel);
    deleteModelButton.addEventListener('click', handleDeleteModel);
    modalOverlay.addEventListener('click', (e) => { // Close on overlay click
        if (e.target === modalOverlay) hideModal();
    });

    // --- Share Button Listener ---
    shareButton.addEventListener('click', () => {
        try {
            // Ensure the layout and mode in appState are up-to-date before sharing
            saveAppState(); // This updates appState.layout based on DOM and saves mode

            const stateString = JSON.stringify(appState); // Includes models, layout, and mode
            const encodedState = btoa(stateString); // Base64 encode

            // Construct URL (remove existing query string/hash first)
            const baseUrl = window.location.origin + window.location.pathname;
            const shareUrl = `${baseUrl}?state=${encodedState}`;

            // Copy to clipboard
            navigator.clipboard.writeText(shareUrl).then(() => {
                showCustomAlert('Shareable link copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy share link:', err);
                showCustomAlert('Failed to copy link. Please copy it manually.');
                // Optionally display the link in the alert or another element
            });

        } catch (e) {
            console.error("Error generating share link:", e);
            showCustomAlert("Could not generate share link due to an error.");
        }
    });

    // --- Alt+Click Reset Function ---
    async function handleAltReset() {
        const confirmed = await showCustomConfirm("Switch to 'RankMyAnything' mode? This clears all items and cannot be undone (except by normal reset).");
        if (confirmed) {
            // 1. Set mode to RankMyAnything
            appState.isRankAnythingMode = true;

            // 2. Remove all model cards (except add button) from DOM
            unrankedContainer.querySelectorAll('.model-card:not(.add-card)').forEach(card => card.remove());
            document.querySelectorAll('.tier-models').forEach(tierZone => {
                tierZone.innerHTML = ''; // Clear tiered zones too
            });

            // 3. Update Header Text via helper
            updateHeaderBasedOnMode();

            // 4. Clear State models and layout
            appState.models = [];
            appState.layout = {};

            // 5. Save the empty state AND the mode flag
            saveAppState();

            console.log("Tier list cleared and switched to 'RankMyAnything' mode.");
            ensureAddCardIsLast(); // Ensure '+' button is still there and last
        }
    }

    // --- Alt+Click Listeners ---
    headerElement.addEventListener('click', (event) => {
        // Trigger only if clicking directly on H1/A or P, not buttons inside header
        if (event.altKey && (event.target.tagName === 'P' || event.target.closest('h1 a'))) {
            event.preventDefault(); // Prevent link navigation if alt+clicking the H1 link
            handleAltReset();
        }
    });
    // Note: Alt+Click for reset button is handled within its existing listener


    // --- Initial Load ---
    const loadedFromUrl = loadStateFromUrl(); // Try loading from URL first
    if (!loadedFromUrl) {
        loadAppStateFromLocalStorage(); // If not loaded from URL, load from localStorage
    }
    // State (including mode) is now set either from URL or localStorage (with defaults if needed)
    updateHeaderBasedOnMode(); // Ensure header matches the loaded state
    populateModels(); // Populate based on whatever state was loaded
    applyLayout();    // Apply layout based on whatever state was loaded

}); // End DOMContentLoaded
