# Apps Script 基礎整合

[English](README.md) | [繁體中文](README.zh-TW.md)

這些檔案供 Google Apps Script 專案使用；該專案須綁定至已匯入的 Coach a Coach 營運工作簿。

此基礎整合已實作：

- 依欄位標頭讀取工作表，以及僅追加的寫入操作；
- 設定解析與驗證；
- 參與者、語言及可用時段資料的組裝；
- 結合硬限制與軟評分的確定性草案配對；
- 配對前檢查的問題產生；
- 鎖定剩餘兩位組員後，對重新配對候選方案排序；
- 不會自動發布或寄送 email 的營運選單。

配對核心不依賴特定執行環境，並有 Node 測試涵蓋。Google Sheet 整合函式需要綁定的 Apps Script 專案，因此在備妥私人 staging Sheet 前，仍僅限 dry-run。

目前獨立執行的 Excel／瀏覽器流程，請參閱[配對規則](../docs/matching-review-v2.zh-TW.md)與[專案 README](../README.zh-TW.md)。
