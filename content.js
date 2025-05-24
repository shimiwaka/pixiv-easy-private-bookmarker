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
  console.log('Adding private bookmark via UI...');
  
  // 1. まず、メニューを開くボタンをクリック
  const triggerButton = document.querySelector('#__next > div > div:nth-child(2) > div.sc-1e6e6d57-0.gQkIQm.__top_side_menu_body > div.sc-8d5ac044-0.cHpDVl > div > div.sc-8d5ac044-3.hvOssX > main > section > div.sc-7d1a8035-0.cxsjmo > div > div.sc-e000c79a-0.vZKXM > div > div.sc-becae342-1.gpnXqv > section > div.sc-a74b10e0-1.hljIHg > button');
  
  if (triggerButton) {
    console.log('Clicking trigger button...');
    triggerButton.click();
    
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
          console.log('Made menu dialog transparent:', selector);
          break;
        }
      }
      
      // 2. 「非公開で」という文字列を含む要素を探してクリック
      const privateBookmarkElements = findElementByText('非公開で');
      console.log('Found elements with "非公開で":', privateBookmarkElements.length);
      
      if (privateBookmarkElements.length > 0) {
        // 最初に見つかった要素をクリック
        const targetElement = privateBookmarkElements[0];
        console.log('Found private bookmark element by text:', targetElement);
        targetElement.click();
        
        // クリック後、少し待ってからダイアログを元に戻す
        setTimeout(() => {
          if (hiddenDialog) {
            hiddenDialog.style.opacity = originalOpacity;
          }
        }, 200);
        
      } else {
        console.log('Private bookmark element not found by text, trying fallback selectors...');
        
        // フォールバック: 従来のセレクターも試す
        const fallbackSelectors = [
          'body > div:nth-child(27) > div > div > div > ul > li:nth-child(1) > span',
          'body > div:nth-child(28) > div > div > div > ul > li:nth-child(1) > span',
          'body > div:nth-child(26) > div > div > div > ul > li:nth-child(1) > span',
          'body > div:nth-child(29) > div > div > div > ul > li:nth-child(1) > span',
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
    alert('ブックマークメニューボタンが見つかりませんでした');
  }
}

function addPrivateBookmarkButton() {
  // 既に追加済みのボタンがあるかチェック
  if (document.querySelector('.private-bookmark-btn')) {
    return;
  }

  const bookmarkButton = document.querySelector('#__next > div > div:nth-child(2) > div.sc-1e6e6d57-0.gQkIQm.__top_side_menu_body > div.sc-8d5ac044-0.cHpDVl > div > div.sc-8d5ac044-3.hvOssX > main > section > div.sc-7d1a8035-0.cxsjmo > div > div.sc-e000c79a-0.vZKXM > div > div.sc-becae342-1.gpnXqv > section > div.sc-a74b10e0-3.fCOpda > button');

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
    console.log('Private bookmark button added');
  }
}

// URL変更を検知する関数
function checkUrlChange() {
  if (currentUrl !== window.location.href) {
    currentUrl = window.location.href;
    console.log('URL changed to:', currentUrl);
    
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