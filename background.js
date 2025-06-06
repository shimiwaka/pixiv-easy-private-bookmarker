chrome.action.onClicked.addListener(async (tab) => {
  // Pixivのアートワークページかどうかをチェック
  if (tab.url && tab.url.match(/https:\/\/www\.pixiv\.net\/artworks\/\d+/)) {
    try {
      // コンテンツスクリプトに非公開ブックマーク実行のメッセージを送信
      await chrome.tabs.sendMessage(tab.id, { action: "addPrivateBookmark" });
    } catch (error) {
      console.error("メッセージ送信エラー:", error);
    }
  }
}); 