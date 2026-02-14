// @ts-check
(function () {
  // Get VS Code API
  const vscode = acquireVsCodeApi();

  // State management
  let currentTheme = 'light';
  let currentScale = 1.0;
  let currentContent = null;
  let currentFormat = null;

  // DOM elements
  const diagramContent = document.getElementById('diagram-content');
  const diagramContainer = document.getElementById('diagram-container');
  const errorContainer = document.getElementById('error-container');
  const errorMessage = document.getElementById('error-message');
  const loadingIndicator = document.getElementById('loading-indicator');
  const minimap = document.getElementById('minimap');
  const minimapContent = document.getElementById('minimap-content');
  const minimapViewport = document.getElementById('minimap-viewport');

  // Toolbar buttons
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  const fitScreenBtn = document.getElementById('fit-screen');
  const exportBtn = document.getElementById('export');

  // Search elements
  const searchInput = document.getElementById('search');
  const searchNav = document.getElementById('search-nav');
  const searchCount = document.getElementById('search-count');
  const searchPrevBtn = document.getElementById('search-prev');
  const searchNextBtn = document.getElementById('search-next');

  let searchMatches = [];
  let currentMatchIndex = -1;

  /**
   * Search for text in SVG elements
   */
  function performSearch(query) {
    // Clear previous highlights
    clearSearchHighlights();
    searchMatches = [];
    currentMatchIndex = -1;

    if (!query || query.trim() === '') {
      searchNav.classList.remove('visible');
      return;
    }

    const content = diagramContent.firstElementChild;
    if (!content) return;

    // Search in SVG text elements
    if (content.tagName === 'svg' || content.querySelector('svg')) {
      const svg = content.tagName === 'svg' ? content : content.querySelector('svg');
      const textElements = svg.querySelectorAll('text, tspan');

      textElements.forEach((element) => {
        const text = element.textContent || '';
        if (text.toLowerCase().includes(query.toLowerCase())) {
          searchMatches.push(element);
          element.classList.add('highlight');
        }
      });
    }

    // Update search UI
    if (searchMatches.length > 0) {
      searchNav.classList.add('visible');
      currentMatchIndex = 0;
      highlightCurrentMatch();
      updateSearchCount();
      scrollToCurrentMatch();
    } else {
      searchNav.classList.remove('visible');
      searchCount.textContent = '0/0';
    }
  }

  /**
   * Clear search highlights
   */
  function clearSearchHighlights() {
    const highlighted = diagramContent.querySelectorAll('.highlight, .highlight-current');
    highlighted.forEach((element) => {
      element.classList.remove('highlight', 'highlight-current');
    });
  }

  /**
   * Highlight current match
   */
  function highlightCurrentMatch() {
    searchMatches.forEach((element, index) => {
      element.classList.remove('highlight-current');
      if (index === currentMatchIndex) {
        element.classList.add('highlight-current');
      }
    });
  }

  /**
   * Update search count display
   */
  function updateSearchCount() {
    if (searchMatches.length > 0) {
      searchCount.textContent = `${currentMatchIndex + 1}/${searchMatches.length}`;
    } else {
      searchCount.textContent = '0/0';
    }
  }

  /**
   * Scroll to current match
   */
  function scrollToCurrentMatch() {
    if (currentMatchIndex < 0 || currentMatchIndex >= searchMatches.length) return;

    const element = searchMatches[currentMatchIndex];
    const elementRect = element.getBoundingClientRect();
    const containerRect = diagramContainer.getBoundingClientRect();

    // Calculate scroll position to center the element
    const scrollX = diagramContainer.scrollLeft + elementRect.left - containerRect.left - containerRect.width / 2;
    const scrollY = diagramContainer.scrollTop + elementRect.top - containerRect.top - containerRect.height / 2;

    diagramContainer.scrollTo({
      left: scrollX,
      top: scrollY,
      behavior: 'smooth'
    });
  }

  /**
   * Navigate to previous match
   */
  function searchPrevious() {
    if (searchMatches.length === 0) return;

    currentMatchIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    highlightCurrentMatch();
    updateSearchCount();
    scrollToCurrentMatch();
  }

  /**
   * Navigate to next match
   */
  function searchNext() {
    if (searchMatches.length === 0) return;

    currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
    highlightCurrentMatch();
    updateSearchCount();
    scrollToCurrentMatch();
  }

  // Search event listeners
  searchInput.addEventListener('input', (event) => {
    performSearch(event.target.value);
  });

  searchPrevBtn.addEventListener('click', searchPrevious);
  searchNextBtn.addEventListener('click', searchNext);

  // Search keyboard shortcuts
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) {
        searchPrevious();
      } else {
        searchNext();
      }
    } else if (event.key === 'Escape') {
      searchInput.value = '';
      performSearch('');
      searchInput.blur();
    }
  });

  // Export functionality
  exportBtn.addEventListener('click', () => {
    // Get the actual rendered content from the DOM
    const renderedContent = diagramContent.innerHTML;
    
    if (!renderedContent || renderedContent.trim() === '') {
      vscode.postMessage({
        type: 'error',
        message: 'No diagram to export'
      });
      return;
    }

    // Determine the actual format from the rendered content
    let actualFormat = 'svg';
    
    // Check if it's an image (PNG)
    const imgElement = diagramContent.querySelector('img');
    if (imgElement && imgElement.src) {
      actualFormat = 'png';
    }

    // Send export request to extension with rendered content
    vscode.postMessage({
      type: 'export',
      content: renderedContent,
      format: actualFormat
    });
  });

  /**
   * Handle messages from the extension
   */
  window.addEventListener('message', (event) => {
    const message = event.data;

    switch (message.type) {
      case 'update':
        handleUpdate(message.content, message.format);
        break;
      case 'error':
        handleError(message.message);
        break;
      case 'theme':
        handleThemeChange(message.theme);
        break;
      case 'loading':
        handleLoading(message.isLoading);
        break;
    }
  });

  /**
   * Handle diagram update
   */
  async function handleUpdate(content, format) {
    console.log('='.repeat(60));
    console.log('[Webview] ========== HANDLE UPDATE ==========');
    console.log('[Webview] Received update at:', new Date().toISOString());
    console.log('[Webview] Format parameter:', format);
    console.log('[Webview] Content length:', content?.length);
    console.log('[Webview] Content type:', typeof content);
    console.log('[Webview] Content preview (first 100 chars):', content?.substring(0, 100));
    console.log('='.repeat(60));
    
    // DEBUGGING: Show visible status in the panel
    if (!content || content.length === 0) {
      showError('DEBUG: Received empty content from extension');
      return;
    }
    
    // DEBUGGING: Show visible status message
    const debugInfo = `Format: ${format}, Length: ${content.length}, Type: ${typeof content}`;
    console.log('[Webview] DEBUG INFO:', debugInfo);
    
    hideLoading();
    hideError();

    currentContent = content;
    currentFormat = format;

    if (format === 'svg') {
      console.log('[Webview] Format is SVG, checking content type...');
      
      // Check if this is raw mermaid content or already rendered SVG
      const trimmedContent = content.trim();
      
      // More robust SVG detection with fallback check
      const startsWithSvg = trimmedContent.startsWith('<svg');
      const startsWithXml = trimmedContent.startsWith('<?xml');
      const containsSvg = trimmedContent.includes('<svg');
      const isSvg = startsWithSvg || startsWithXml || containsSvg;
      
      console.log('[Webview] Content detection results:');
      console.log('[Webview]   - startsWithSvg:', startsWithSvg);
      console.log('[Webview]   - startsWithXml:', startsWithXml);
      console.log('[Webview]   - containsSvg:', containsSvg);
      console.log('[Webview]   - isSvg (final):', isSvg);
      console.log('='.repeat(60));
      
      if (!isSvg) {
        // This is raw mermaid content, render it
        console.log('[Webview] 🎨 DECISION: Rendering as MERMAID');
        console.log('[Webview] Calling renderMermaid()...');
        await renderMermaid(content);
        console.log('[Webview] ✅ Mermaid rendering complete');
      } else {
        // This is already rendered SVG
        console.log('[Webview] 🌐 DECISION: Displaying as SVG (direct DOM insertion)');
        console.log('[Webview] Inserting into diagramContent.innerHTML...');
        try {
          diagramContent.innerHTML = content;
          console.log('[Webview] ✅ SVG inserted successfully');
          console.log('[Webview] DOM now contains:', diagramContent.innerHTML.substring(0, 100));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('[Webview] ❌ Failed to insert SVG into DOM:', errorMessage);
          showError(`Failed to display SVG diagram: ${errorMessage}`);
        }
      }
    } else if (format === 'png') {
      console.log('[Webview] 🖼️ DECISION: Displaying as PNG');
      diagramContent.innerHTML = `<img src="${content}" alt="Diagram" />`;
      console.log('[Webview] ✅ PNG inserted successfully');
    }

    console.log('='.repeat(60));
    console.log('[Webview] Update complete');
    console.log('='.repeat(60));

    // Update minimap
    updateMinimap();

    // Send ready message
    vscode.postMessage({ type: 'ready' });
  }

  /**
   * Render mermaid diagram
   */
  async function renderMermaid(content) {
    try {
      // Wait for mermaid to be loaded
      if (typeof window.mermaid === 'undefined') {
        // Wait a bit and try again
        await new Promise(resolve => setTimeout(resolve, 100));
        if (typeof window.mermaid === 'undefined') {
          throw new Error('Mermaid library not loaded');
        }
      }

      const id = `mermaid-${Date.now()}`;
      const { svg } = await window.mermaid.render(id, content);
      diagramContent.innerHTML = svg;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      showError(`Mermaid rendering error: ${errorMessage}`);
    }
  }

  /**
   * Handle error display
   */
  function handleError(message) {
    console.log('[Webview] Displaying error:', message);
    hideLoading();
    showError(message);
  }

  /**
   * Handle theme change
   */
  function handleThemeChange(theme) {
    currentTheme = theme;
    document.body.className = theme;
  }

  /**
   * Handle loading state
   */
  function handleLoading(isLoading) {
    if (isLoading) {
      showLoading();
    } else {
      hideLoading();
    }
  }

  /**
   * Show error message
   */
  function showError(message) {
    errorMessage.textContent = message;
    errorContainer.classList.add('visible');
    diagramContent.style.display = 'none';
  }

  /**
   * Hide error message
   */
  function hideError() {
    errorContainer.classList.remove('visible');
    diagramContent.style.display = 'block';
  }

  /**
   * Show loading indicator
   */
  function showLoading() {
    loadingIndicator.classList.add('visible');
  }

  /**
   * Hide loading indicator
   */
  function hideLoading() {
    loadingIndicator.classList.remove('visible');
  }

  /**
   * Update minimap visibility and content
   */
  function updateMinimap() {
    const content = diagramContent.firstElementChild;
    if (!content) {
      minimap.classList.remove('visible');
      return;
    }

    // Get the actual SVG/image element dimensions
    const contentRect = content.getBoundingClientRect();
    const containerRect = diagramContainer.getBoundingClientRect();

    // Account for scale transform
    const actualWidth = contentRect.width / currentScale;
    const actualHeight = contentRect.height / currentScale;

    // Show minimap if content is larger than viewport
    if (actualWidth > containerRect.width || actualHeight > containerRect.height) {
      minimap.classList.add('visible');
      
      // Clone content to minimap
      minimapContent.innerHTML = '';
      const clone = content.cloneNode(true);
      minimapContent.appendChild(clone);
      
      updateMinimapViewport();
    } else {
      minimap.classList.remove('visible');
    }
  }

  /**
   * Update minimap viewport indicator
   */
  function updateMinimapViewport() {
    const content = diagramContent.firstElementChild;
    if (!content) return;

    const contentRect = content.getBoundingClientRect();
    const containerRect = diagramContainer.getBoundingClientRect();
    const minimapRect = minimapContent.getBoundingClientRect();

    // Account for scale and calculate scroll position
    const scaledWidth = content.offsetWidth * currentScale;
    const scaledHeight = content.offsetHeight * currentScale;

    // Calculate viewport position and size relative to content
    const viewportLeft = (diagramContainer.scrollLeft / scaledWidth) * minimapRect.width;
    const viewportTop = (diagramContainer.scrollTop / scaledHeight) * minimapRect.height;
    const viewportWidth = (containerRect.width / contentRect.width) * minimapRect.width;
    const viewportHeight = (containerRect.height / contentRect.height) * minimapRect.height;

    minimapViewport.style.left = `${Math.max(0, viewportLeft)}px`;
    minimapViewport.style.top = `${Math.max(0, viewportTop)}px`;
    minimapViewport.style.width = `${Math.min(minimapRect.width, viewportWidth)}px`;
    minimapViewport.style.height = `${Math.min(minimapRect.height, viewportHeight)}px`;
  }

  /**
   * Handle minimap click for navigation
   */
  minimap.addEventListener('click', (event) => {
    const content = diagramContent.firstElementChild;
    if (!content) return;

    const minimapRect = minimap.getBoundingClientRect();
    const clickX = event.clientX - minimapRect.left;
    const clickY = event.clientY - minimapRect.top;

    // Calculate corresponding position in diagram
    const scrollX = (clickX / minimapRect.width) * content.offsetWidth;
    const scrollY = (clickY / minimapRect.height) * content.offsetHeight;

    // Center the viewport on the clicked position
    const containerRect = diagramContainer.getBoundingClientRect();
    diagramContainer.scrollLeft = scrollX - containerRect.width / 2;
    diagramContainer.scrollTop = scrollY - containerRect.height / 2;

    updateMinimapViewport();
  });

  // Zoom and Pan functionality
  const MIN_SCALE = 0.25;
  const MAX_SCALE = 4.0;
  const SCALE_STEP = 0.1;

  /**
   * Set zoom scale
   */
  function setScale(scale) {
    currentScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
    diagramContent.style.transform = `scale(${currentScale})`;
    updateMinimap();
  }

  /**
   * Zoom in
   */
  function zoomIn() {
    setScale(currentScale + SCALE_STEP);
  }

  /**
   * Zoom out
   */
  function zoomOut() {
    setScale(currentScale - SCALE_STEP);
  }

  /**
   * Fit to screen
   */
  function fitToScreen() {
    const content = diagramContent.firstElementChild;
    if (!content) return;

    const contentRect = content.getBoundingClientRect();
    const containerRect = diagramContainer.getBoundingClientRect();

    // Calculate scale to fit content in viewport
    const scaleX = containerRect.width / (contentRect.width / currentScale);
    const scaleY = containerRect.height / (contentRect.height / currentScale);
    const scale = Math.min(scaleX, scaleY, 1.0); // Don't scale up beyond 100%

    setScale(scale);

    // Center the content
    diagramContainer.scrollLeft = 0;
    diagramContainer.scrollTop = 0;
  }

  // Zoom button event listeners
  zoomInBtn.addEventListener('click', zoomIn);
  zoomOutBtn.addEventListener('click', zoomOut);
  fitScreenBtn.addEventListener('click', fitToScreen);

  // Keyboard shortcuts
  document.addEventListener('keydown', (event) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? event.metaKey : event.ctrlKey;

    if (!modifier) return;

    switch (event.key) {
      case '+':
      case '=':
        event.preventDefault();
        zoomIn();
        break;
      case '-':
      case '_':
        event.preventDefault();
        zoomOut();
        break;
      case '0':
        event.preventDefault();
        fitToScreen();
        break;
    }
  });

  // Pan with mouse drag
  let isPanning = false;
  let startX = 0;
  let startY = 0;
  let scrollLeft = 0;
  let scrollTop = 0;

  diagramContainer.addEventListener('mousedown', (event) => {
    // Only pan with middle mouse button or space + left click
    if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
      isPanning = true;
      startX = event.clientX;
      startY = event.clientY;
      scrollLeft = diagramContainer.scrollLeft;
      scrollTop = diagramContainer.scrollTop;
      diagramContainer.style.cursor = 'grabbing';
      event.preventDefault();
    }
  });

  document.addEventListener('mousemove', (event) => {
    if (!isPanning) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    diagramContainer.scrollLeft = scrollLeft - dx;
    diagramContainer.scrollTop = scrollTop - dy;

    updateMinimapViewport();
  });

  document.addEventListener('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      diagramContainer.style.cursor = 'default';
    }
  });

  // Update minimap viewport on scroll
  diagramContainer.addEventListener('scroll', () => {
    updateMinimapViewport();
  });

  // Initialize
  vscode.postMessage({ type: 'ready' });
})();
