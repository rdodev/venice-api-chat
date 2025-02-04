export async function loadSystemPrompts() {
  try {
    const response = await fetch('/api/system-prompts');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const systemPrompts = await response.json();

    const select = document.getElementById('systemPromptSelect');
    
    if (select) {
      // Remember the currently selected prompt
      const currentlySelectedPrompt = select.value;
      
      const promptOptions = systemPrompts.map(prompt => 
        `<option value="${prompt.filename}">${prompt.name}</option>`
      ).join('');
      
      select.innerHTML = promptOptions;
      
      // Restore the previously selected prompt if it still exists
      if (currentlySelectedPrompt && 
          Array.from(select.options).some(option => option.value === currentlySelectedPrompt)) {
        select.value = currentlySelectedPrompt;
        await setActivePrompt(currentlySelectedPrompt);
      } else if (systemPrompts.length > 0) {
        // Set the first prompt as active by default if no previous selection exists
        await setActivePrompt(systemPrompts[0].filename);
      }
    }
  } catch (error) {
    console.error('Error loading system prompts:', error);
  }
}

export async function setActivePrompt(filename) {
  try {
    const response = await fetch('/api/active-prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filename }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error('Failed to set active prompt:', errorBody);
    }
  } catch (error) {
    console.error('Error setting active prompt:', error);
  }
}
