(function() {
    let searchIndex = null;
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    let selectedIndex = -1;

    if (!searchInput || !searchResults) return;

    // Set correct shortcut text based on platform
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const kbd = document.querySelector('.search-kbd');
    if (kbd) {
        kbd.textContent = isMac ? '⌘ K' : 'Ctrl K';
    }

    async function loadIndex() {
        if (searchIndex) return;
        try {
            console.log('Loading search index...');
            // Try absolute path first, then relative for subfolder support
            let response = await fetch('/index.json');
            if (!response.ok) {
                console.log('Trying relative path for index.json...');
                response = await fetch('index.json');
            }
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            searchIndex = await response.json();
            console.log('Search index loaded:', searchIndex.length, 'pages');
        } catch (e) {
            console.error('Failed to load search index:', e);
        }
    }

    function search(query) {
        console.log('Searching for:', query);
        if (!query || query.length < 2) {
            searchResults.innerHTML = '';
            searchResults.style.display = 'none';
            return;
        }

        if (!searchIndex) {
            console.warn('Search index not yet loaded');
            return;
        }

        const matches = searchIndex.filter(page => {
            const titleMatch = page.title.toLowerCase().includes(query.toLowerCase());
            const contentMatch = page.content.toLowerCase().includes(query.toLowerCase());
            return titleMatch || contentMatch;
        }).slice(0, 5);

        displayResults(matches);
    }

    function displayResults(matches) {
        if (matches.length === 0) {
            searchResults.innerHTML = '<div class="search-result-item">No results found</div>';
        } else {
            searchResults.innerHTML = matches.map((match, i) => `
                <div class="search-result-item" data-index="${i}">
                    <a href="${match.permalink}">
                        <div class="search-result-title">${match.title}</div>
                        <div class="search-result-summary">${match.summary}</div>
                    </a>
                </div>
            `).join('');
        }
        searchResults.style.display = 'block';
        selectedIndex = -1;
    }

    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            await loadIndex();
            search(e.target.value);
        }, 300);
    });

    searchInput.addEventListener('focus', async () => {
        await loadIndex();
        if (searchInput.value) search(searchInput.value);
    });

    document.addEventListener('keydown', (e) => {
        // Ctrl+K or Cmd+K to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
            return;
        }

        const items = searchResults.querySelectorAll('.search-result-item');
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % items.length;
            updateSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
            updateSelection(items);
        } else if (e.key === 'Enter') {
            if (selectedIndex > -1) {
                e.preventDefault();
                items[selectedIndex].querySelector('a').click();
            }
        } else if (e.key === 'Escape') {
            searchResults.style.display = 'none';
            searchInput.blur();
        }
    });

    function updateSelection(items) {
        items.forEach((item, i) => {
            if (i === selectedIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
})();
