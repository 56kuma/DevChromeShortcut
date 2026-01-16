// Keyboard Navigator - Content Script

class KeyboardNavigator {
  constructor() {
    this.linkHintMode = false;
    this.searchMode = false;
    this.searchNavigationMode = false;
    this.keyBuffer = '';
    this.hints = [];
    this.searchTerm = '';
    this.searchResults = [];
    this.currentSearchIndex = -1;
    this.init();
  }

  init() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keypress', this.handleKeyPress.bind(this));
  }

  // 入力フィールドにフォーカスがある場合はスキップ
  isTyping() {
    const active = document.activeElement;
    const tagName = active.tagName.toLowerCase();
    const isEditable = active.isContentEditable;
    const isInput = ['input', 'textarea', 'select'].includes(tagName);
    return isInput || isEditable;
  }

  handleKeyDown(e) {
    // リンクヒントモード中
    if (this.linkHintMode) {
      this.handleLinkHintMode(e);
      return;
    }

    // 検索ナビゲーションモード中
    if (this.searchNavigationMode) {
      this.handleSearchNavigationMode(e);
      return;
    }

    // 検索モード中
    if (this.searchMode) {
      this.handleSearchMode(e);
      return;
    }

    // 入力中はスキップ
    if (this.isTyping()) {
      return;
    }

    // Escapeでモードをリセット
    if (e.key === 'Escape') {
      this.resetModes();
      e.preventDefault();
      return;
    }

    // 通常モードのキーバインド
    switch (e.key) {
      case 'j':
        this.scrollDown();
        e.preventDefault();
        break;
      case 'k':
        this.scrollUp();
        e.preventDefault();
        break;
      case 'd':
        this.scrollHalfPageDown();
        e.preventDefault();
        break;
      case 'u':
        this.scrollHalfPageUp();
        e.preventDefault();
        break;
      case 'g':
        if (this.keyBuffer === 'g') {
          this.scrollToTop();
          this.keyBuffer = '';
          e.preventDefault();
        } else {
          this.keyBuffer = 'g';
          setTimeout(() => { this.keyBuffer = ''; }, 1000);
        }
        break;
      case 'G':
        this.scrollToBottom();
        e.preventDefault();
        break;
      case 'f':
        this.activateLinkHintMode();
        e.preventDefault();
        break;
      case '/':
        this.activateSearchMode();
        e.preventDefault();
        break;
      case 'i':
        this.focusFirstInput();
        e.preventDefault();
        break;
      case 'H':
        window.history.back();
        e.preventDefault();
        break;
      case 'L':
        window.history.forward();
        e.preventDefault();
        break;
      case 'r':
        window.location.reload();
        e.preventDefault();
        break;
    }
  }

  handleKeyPress(e) {
    // キープレス時の処理は不要
  }

  // スクロール機能
  scrollDown() {
    window.scrollBy({ top: 60, behavior: 'smooth' });
  }

  scrollUp() {
    window.scrollBy({ top: -60, behavior: 'smooth' });
  }

  scrollHalfPageDown() {
    window.scrollBy({ top: window.innerHeight / 2, behavior: 'smooth' });
  }

  scrollHalfPageUp() {
    window.scrollBy({ top: -window.innerHeight / 2, behavior: 'smooth' });
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  scrollToBottom() {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  // 最初の入力フィールドにフォーカス
  focusFirstInput() {
    const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea');
    if (inputs.length > 0) {
      inputs[0].focus();
    }
  }

  // リンクヒントモード
  activateLinkHintMode() {
    this.linkHintMode = true;
    this.keyBuffer = '';
    this.createHints();
  }

  createHints() {
    // クリック可能な要素を取得
    const clickables = document.querySelectorAll('a, button, input[type="button"], input[type="submit"], [role="button"], [onclick]');

    // 表示されている要素のみをフィルタ
    const visibleClickables = Array.from(clickables).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 &&
             rect.top >= 0 && rect.left >= 0 &&
             rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + 1000 &&
             rect.right <= (window.innerWidth || document.documentElement.clientWidth);
    });

    // ヒントを作成
    this.hints = visibleClickables.map((el, index) => {
      const hint = document.createElement('div');
      hint.className = 'keyboard-nav-hint';
      hint.textContent = index + 1;
      hint.dataset.index = index;

      const rect = el.getBoundingClientRect();
      hint.style.top = `${rect.top + window.scrollY}px`;
      hint.style.left = `${rect.left + window.scrollX}px`;

      document.body.appendChild(hint);

      return {
        element: el,
        hint: hint,
        number: index + 1
      };
    });
  }

  handleLinkHintMode(e) {
    if (e.key === 'Escape') {
      this.exitLinkHintMode();
      e.preventDefault();
      return;
    }

    if (e.key >= '0' && e.key <= '9') {
      this.keyBuffer += e.key;
      const number = parseInt(this.keyBuffer);

      // マッチするヒントを探す
      const match = this.hints.find(h => h.number === number);
      if (match) {
        match.element.click();
        this.exitLinkHintMode();
      }

      e.preventDefault();
    }
  }

  exitLinkHintMode() {
    this.linkHintMode = false;
    this.keyBuffer = '';
    this.hints.forEach(h => h.hint.remove());
    this.hints = [];
  }

  // 検索モード
  activateSearchMode() {
    this.searchMode = true;
    this.searchTerm = '';
    this.createSearchBox();
  }

  createSearchBox() {
    const searchBox = document.createElement('div');
    searchBox.id = 'keyboard-nav-search';
    searchBox.className = 'keyboard-nav-search';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Search...';
    input.className = 'keyboard-nav-search-input';

    searchBox.appendChild(input);
    document.body.appendChild(searchBox);

    input.focus();
  }

  handleSearchMode(e) {
    const searchBox = document.getElementById('keyboard-nav-search');
    const input = searchBox?.querySelector('input');

    if (e.key === 'Escape') {
      this.exitSearchMode();
      e.preventDefault();
      return;
    }

    if (e.key === 'Enter' && input) {
      this.performSearch(input.value);
      e.preventDefault();
      return;
    }
  }

  performSearch(term) {
    if (!term) {
      this.exitSearchMode();
      return;
    }

    this.searchTerm = term;
    this.searchResults = [];
    this.currentSearchIndex = -1;

    // 検索ボックスを削除
    const searchBox = document.getElementById('keyboard-nav-search');
    if (searchBox) {
      searchBox.remove();
    }

    // 検索結果をハイライト
    this.highlightSearchResults(term);

    // 検索モードを終了し、検索ナビゲーションモードに移行
    this.searchMode = false;
    if (this.searchResults.length > 0) {
      this.searchNavigationMode = true;
      this.currentSearchIndex = 0;
      this.focusSearchResult(0);
      this.showSearchInfo();
    }
  }

  highlightSearchResults(term) {
    // 既存のハイライトをクリア
    this.clearSearchHighlights();

    const bodyText = document.body;
    const walker = document.createTreeWalker(
      bodyText,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // スクリプトやスタイルタグは除外
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tagName = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          // 検索ボックスやヒントも除外
          if (parent.closest('.keyboard-nav-search, .keyboard-nav-hint, .keyboard-nav-search-info')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodesToProcess = [];
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.toLowerCase().includes(term.toLowerCase())) {
        nodesToProcess.push(node);
      }
    }

    // テキストノードを処理してハイライト
    nodesToProcess.forEach(textNode => {
      const text = textNode.textContent;
      const parent = textNode.parentNode;
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = [];
      let match;

      while (match = regex.exec(text)) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0]
        });
      }

      if (matches.length === 0) return;

      const fragment = document.createDocumentFragment();
      let lastIndex = 0;

      matches.forEach(m => {
        // マッチ前のテキスト
        if (m.start > lastIndex) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex, m.start)));
        }

        // ハイライトされたテキスト
        const span = document.createElement('span');
        span.className = 'keyboard-nav-search-highlight';
        span.textContent = m.text;
        fragment.appendChild(span);
        this.searchResults.push(span);

        lastIndex = m.end;
      });

      // 残りのテキスト
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
      }

      parent.replaceChild(fragment, textNode);
    });
  }

  clearSearchHighlights() {
    const highlights = document.querySelectorAll('.keyboard-nav-search-highlight, .keyboard-nav-search-highlight-current');
    highlights.forEach(span => {
      const text = document.createTextNode(span.textContent);
      span.parentNode.replaceChild(text, span);
    });
    this.searchResults = [];
    this.currentSearchIndex = -1;

    // 検索情報も削除
    const info = document.getElementById('keyboard-nav-search-info');
    if (info) {
      info.remove();
    }
  }

  focusSearchResult(index) {
    if (index < 0 || index >= this.searchResults.length) return;

    // 前のハイライトを通常に戻す
    if (this.currentSearchIndex >= 0 && this.currentSearchIndex < this.searchResults.length) {
      this.searchResults[this.currentSearchIndex].className = 'keyboard-nav-search-highlight';
    }

    // 新しいハイライトを現在として設定
    this.currentSearchIndex = index;
    const current = this.searchResults[index];
    current.className = 'keyboard-nav-search-highlight-current';

    // スクロールして表示
    current.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // 検索情報を更新
    this.updateSearchInfo();
  }

  showSearchInfo() {
    const info = document.createElement('div');
    info.id = 'keyboard-nav-search-info';
    info.className = 'keyboard-nav-search-info';
    document.body.appendChild(info);
    this.updateSearchInfo();
  }

  updateSearchInfo() {
    const info = document.getElementById('keyboard-nav-search-info');
    if (info) {
      info.textContent = `${this.currentSearchIndex + 1} / ${this.searchResults.length}`;
    }
  }

  handleSearchNavigationMode(e) {
    if (e.key === 'Escape') {
      this.exitSearchNavigationMode();
      e.preventDefault();
      return;
    }

    // 矢印キーでナビゲート
    if (e.key === 'ArrowDown' || e.key === 'Down') {
      const nextIndex = (this.currentSearchIndex + 1) % this.searchResults.length;
      this.focusSearchResult(nextIndex);
      e.preventDefault();
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'Up') {
      const prevIndex = this.currentSearchIndex - 1 < 0
        ? this.searchResults.length - 1
        : this.currentSearchIndex - 1;
      this.focusSearchResult(prevIndex);
      e.preventDefault();
      return;
    }

    // Ctrl+Enterで新しいタブで開く
    if (e.key === 'Enter' && e.ctrlKey) {
      this.openCurrentSearchResultInNewTab();
      e.preventDefault();
      return;
    }
  }

  openCurrentSearchResultInNewTab() {
    if (this.currentSearchIndex < 0 || this.currentSearchIndex >= this.searchResults.length) {
      return;
    }

    const current = this.searchResults[this.currentSearchIndex];
    // 最も近い親リンクを探す
    const link = current.closest('a[href]');

    if (link && link.href) {
      window.open(link.href, '_blank');
    }
  }

  exitSearchMode() {
    this.searchMode = false;
    const searchBox = document.getElementById('keyboard-nav-search');
    if (searchBox) {
      searchBox.remove();
    }
  }

  exitSearchNavigationMode() {
    this.searchNavigationMode = false;
    this.clearSearchHighlights();
  }

  resetModes() {
    this.exitLinkHintMode();
    this.exitSearchMode();
    this.exitSearchNavigationMode();
    this.keyBuffer = '';
  }
}

// 初期化
const navigator = new KeyboardNavigator();
