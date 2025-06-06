console.log('Content script loaded');

let currentUrl = '';

function getIllustId() {
  // URLからillust_idを取得
  const match = window.location.href.match(/artworks\/(\d+)/);
  return match ? match[1] : null;
}

function findElementByText(text) {
  // XPathを使用してテキストを含む要素を検索
  const xpath = `//*[contains(text(), "${text}")]`;
  const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  
  const elements = [];
  for (let i = 0; i < result.snapshotLength; i++) {
    elements.push(result.snapshotItem(i));
  }
  return elements;
}

function addPrivateBookmark() {
  // 1. まず、メニューを開くボタンをクリック
  // 複数のセレクターを試してより堅牢にする
  const triggerButtonSelectors = [
    // pathタグを含むSVGメニューボタン
    'button path[d*="M16,18 C14.8954305,18"]',
    'button svg path[d*="M16,18 C14.8954305,18"]',
    'path[d*="M16,18 C14.8954305,18"]',
    'svg path[d*="M16,18 C14.8954305,18"]',
  ];
  
  let triggerButton = null;
  
  for (let selector of triggerButtonSelectors) {
    triggerButton = document.querySelector(selector);
    if (triggerButton) {
      break;
    }
  }
  
  if (triggerButton) {    
    // path要素やSVG要素の場合は親のbutton要素を取得
    let buttonToClick = triggerButton;
    if (triggerButton.tagName === 'PATH') {
      // pathタグの場合、親をたどってボタンを見つける
      let parent = triggerButton.parentElement;
      let level = 1;
      while (parent && parent.tagName !== 'BUTTON') {
        console.log(`Parent level ${level}:`, parent.tagName, parent);
        parent = parent.parentElement;
        level++;
        if (level > 10) { // 無限ループ防止
          console.log('Too many levels, breaking');
          break;
        }
      }
      if (parent && parent.tagName === 'BUTTON') {
        buttonToClick = parent;
      } else {
        alert('ボタン要素が見つかりませんでした。path要素から' + level + 'レベル辿りました。');
      }
    } else if (triggerButton.tagName === 'SVG') {
      // SVG要素の場合は親のbutton要素を取得
      if (triggerButton.parentElement.tagName === 'BUTTON') {
        buttonToClick = triggerButton.parentElement;
        console.log('SVG found, clicking parent button instead');
      }
    }
    
    if (typeof buttonToClick.click === 'function') {
      buttonToClick.click();
    } else {
      // フォールバック: イベントを手動で発火
      const event = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      buttonToClick.dispatchEvent(event);
    }
    
    // 少し待ってから非公開ブックマークボタンを探す
    setTimeout(() => {
      // メニューダイアログを透明にする
      const menuDialogs = [
        'body > div:nth-child(28) > div > div > div',
        'body > div:nth-child(27) > div > div > div',
        'body > div:nth-child(29) > div > div > div'
      ];
      
      let hiddenDialog = null;
      let originalOpacity = null;
      
      for (let selector of menuDialogs) {
        const dialog = document.querySelector(selector);
        if (dialog && dialog.style.opacity !== '0') {
          hiddenDialog = dialog;
          originalOpacity = dialog.style.opacity || '1';
          dialog.style.opacity = '0';
          dialog.style.transition = 'opacity 0.1s ease';
          break;
        }
      }
      
      // 2. 「非公開で」という文字列を含む要素を探してクリック
      const privateBookmarkElements = findElementByText('非公開で');
      
      if (privateBookmarkElements.length > 0) {
        // 最初の3つまで順番に試す
        let clicked = false;
        const maxTries = Math.min(3, privateBookmarkElements.length);
        
        for (let i = 0; i < maxTries && !clicked; i++) {
          const targetElement = privateBookmarkElements[i];
          
          try {
            targetElement.click();
            clicked = true;
            
            // クリック後、少し待ってからダイアログを元に戻す
            setTimeout(() => {
              if (hiddenDialog) {
                hiddenDialog.style.opacity = originalOpacity;
              }
            }, 200);
            
          } catch (error) {
            console.log(`Failed to click element ${i + 1}:`, error);
            // 次の要素を試す
          }
        }
        
        if (!clicked) {
          console.log('All private bookmark elements failed to click');
          // ダイアログを元に戻す
          if (hiddenDialog) {
            hiddenDialog.style.opacity = originalOpacity;
          }
        }
        
      } else {
        console.log('Private bookmark element not found by text, trying fallback selectors...');
        
        // フォールバック: 従来のセレクターも試す
        const fallbackSelectors = [
          '[role="dialog"] ul li:first-child span',
          '[role="dialog"] ul li:first-child'
        ];
        
        let found = false;
        for (let selector of fallbackSelectors) {
          const button = document.querySelector(selector);
          if (button && (button.textContent.includes('非公開') || button.textContent.includes('♡'))) {
            console.log('Found fallback private bookmark button:', selector);
            button.click();
            found = true;
            
            // クリック後、少し待ってからダイアログを元に戻す
            setTimeout(() => {
              if (hiddenDialog) {
                hiddenDialog.style.opacity = originalOpacity;
              }
            }, 200);
            break;
          }
        }
        
        if (!found) {
          // ボタンが見つからなかった場合はダイアログを元に戻す
          if (hiddenDialog) {
            hiddenDialog.style.opacity = originalOpacity;
          }
          alert('非公開ブックマークボタンが見つかりませんでした');
        }
      }
    }, 300);
  } else {
    console.log('Trigger button not found');
    console.log('Tried selectors:', triggerButtonSelectors);
    alert('ブックマークメニューボタンが見つかりませんでした\n試したセレクター数: ' + triggerButtonSelectors.length);
  }
}

function addPrivateBookmarkButton() {
  // 既に追加済みのボタンがあるかチェック
  if (document.querySelector('.private-bookmark-btn')) {
    return;
  }

  // 複数のセレクターを試してより堅牢にする
  const bookmarkButtonSelectors = [
    // 新しいセレクター対応
    '#__next > div > div:nth-child(2) > div.sc-1e6e6d57-0.gQkIQm.__top_side_menu_body > div.sc-8d5ac044-0.cHpDVl > div > div.sc-8d5ac044-3.hvOssX > main > section > div.sc-7d1a8035-0.cxsjmo > div > div.sc-e000c79a-0.vZKXM > div > div.sc-75e3ed2d-1.itLRwR > section > div.sc-d1c020eb-1.eYpYdX > button',
    // 元のセレクター
    '#__next > div > div:nth-child(2) > div.sc-1e6e6d57-0.gQkIQm.__top_side_menu_body > div.sc-8d5ac044-0.cHpDVl > div > div.sc-8d5ac044-3.hvOssX > main > section > div.sc-7d1a8035-0.cxsjmo > div > div.sc-e000c79a-0.vZKXM > div > div.sc-becae342-1.gpnXqv > section > div.sc-a74b10e0-3.fCOpda > button',
    // より汎用的なセレクター
    'main section button[type="button"]',
    'section button[type="button"]',
    '[data-gtm-value]',
    'button[data-click-action]'
  ];
  
  let bookmarkButton = null;
  
  for (let selector of bookmarkButtonSelectors) {
    bookmarkButton = document.querySelector(selector);
    if (bookmarkButton) {
      break;
    }
  }

  if (bookmarkButton && getIllustId()) {
    const parentContainer = bookmarkButton.parentNode;
    
    // 新しいボタンを作成
    const privateButton = document.createElement('button');
    privateButton.innerHTML = '★非公開ブックマーク';
    privateButton.className = 'private-bookmark-btn';
    privateButton.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      addPrivateBookmark();
    };
    
    // スタイルを設定
    privateButton.style.textDecoration = 'none';
    privateButton.style.color = 'inherit';
    privateButton.style.padding = '8px';
    privateButton.style.border = '1px solid #ccc';
    privateButton.style.borderRadius = '4px';
    privateButton.style.cursor = 'pointer';
    privateButton.style.marginRight = '8px';
    privateButton.style.backgroundColor = '#fff';
    privateButton.style.fontSize = '14px';
    
    // 元のボタンの左側に追加
    parentContainer.insertBefore(privateButton, bookmarkButton);
  }
}

// URL変更を検知する関数
function checkUrlChange() {
  if (currentUrl !== window.location.href) {
    currentUrl = window.location.href;
    
    // URLが変わったら既存のボタンを削除して再作成
    const existingButton = document.querySelector('.private-bookmark-btn');
    if (existingButton) {
      existingButton.remove();
    }
    
    // 少し待ってからボタンを追加（DOMの読み込みを待つ）
    setTimeout(() => {
      addPrivateBookmarkButton();
    }, 1000);
  }
}

// MutationObserverでDOM変更を監視
const observer = new MutationObserver((mutations) => {
  // URL変更をチェック
  checkUrlChange();
  
  // ボタンがまだない場合は追加を試行
  if (!document.querySelector('.private-bookmark-btn') && getIllustId()) {
    addPrivateBookmarkButton();
  }
});

// ページの読み込みが完了したら実行
document.addEventListener('DOMContentLoaded', () => {
  currentUrl = window.location.href;
  addPrivateBookmarkButton();
});

// popstateイベント（ブラウザの戻る/進むボタン）を監視
window.addEventListener('popstate', () => {
  setTimeout(checkUrlChange, 100);
});

// 定期的にチェック
setInterval(() => {
  checkUrlChange();
  if (!document.querySelector('.private-bookmark-btn') && getIllustId()) {
    addPrivateBookmarkButton();
  }
}, 2000);

// MutationObserverを開始
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Background scriptからのメッセージを受信
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "addPrivateBookmark") {
    // アートワークページかどうかをチェック
    if (getIllustId()) {
      addPrivateBookmark();
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: "Not an artwork page" });
    }
  }
  return true;
}); 