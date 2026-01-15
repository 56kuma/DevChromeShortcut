// Keyboard Navigator - Content Script

class KeyboardNavigator {
  constructor() {
    this.linkHintMode = false;
    this.searchMode = false;
    this.keyBuffer = '';
    this.hints = [];
    this.searchTerm = '';
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
    if (term) {
      window.find(term, false, false, true, false, true, false);
    }
    this.exitSearchMode();
  }

  exitSearchMode() {
    this.searchMode = false;
    const searchBox = document.getElementById('keyboard-nav-search');
    if (searchBox) {
      searchBox.remove();
    }
  }

  resetModes() {
    this.exitLinkHintMode();
    this.exitSearchMode();
    this.keyBuffer = '';
  }
}

// 初期化
const navigator = new KeyboardNavigator();
