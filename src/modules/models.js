export async function fetchAndPopulateModels(config) {
    // Check local storage first
    const cachedModels = localStorage.getItem('venice_models');
    if (cachedModels) {
        const models = JSON.parse(cachedModels);
        populateModelDropdown(models, config);
        return;
    }

    try {
        const response = await fetch('/api/models');
        if (!response.ok) {
            throw new Error('Failed to fetch models');
        }
        const models = await response.json();
        
        // Cache models in local storage
        localStorage.setItem('venice_models', JSON.stringify(models));
        
        populateModelDropdown(models, config);
    } catch (error) {
        showError('Error fetching models: ' + error.message);
    }
}

export function populateModelDropdown(models, config) {
    const modelSelect = document.getElementById('modelSelect');
    const currentModel = localStorage.getItem('current_model') || config.api.model;

    modelSelect.innerHTML = ''; // Clear existing options

    // Robust model filtering and processing
    let processedModels = [];
    if (Array.isArray(models)) {
        // If it's an array, filter text models
        processedModels = models.filter(model => 
            model && (model.type === 'text' || model.type === 'TEXT')
        );
    } else if (models && models.data && Array.isArray(models.data)) {
        // If it's a response with a data property
        processedModels = models.data.filter(model => 
            model && (model.type === 'text' || model.type === 'TEXT')
        );
    } else {
        return;
    }

    processedModels.forEach(model => {
        const modelId = model.id || model.identifier || model.name;
        if (!modelId) {
            return;
        }

        const option = document.createElement('option');
        option.value = modelId;
        option.textContent = modelId;
        
        if (modelId === currentModel) {
            option.selected = true;
        }
        
        modelSelect.appendChild(option);
    });

    // Add event listener for model selection
    modelSelect.addEventListener('change', async (event) => {
        const selectedModel = event.target.value;
        
        try {
            const response = await fetch('/api/update-model', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ model: selectedModel })
            });

            if (!response.ok) {
                throw new Error('Failed to update model');
            }

            // Update local storage
            localStorage.setItem('current_model', selectedModel);
        } catch (error) {
            showError('Error updating model: ' + error.message);
        }
    });
}

// Import showError from main.js or create a separate error handling module
function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        
        // Optional: Auto-hide error after 5 seconds
        setTimeout(() => {
            errorContainer.textContent = '';
            errorContainer.style.display = 'none';
        }, 5000);
    }
    console.error(message);
}
