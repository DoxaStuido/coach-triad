# Coach a Coach

[English](README.md) | [繁體中文](README.zh-TW.md)

三人同儕教練配對與中英雙語複查工作台。主要流程是：

**原始 Excel → 本機 CLI 配對 → 自帶資料與引擎的私人 HTML → 人工複查 → 匯出 JSON 留存／接續工作。**

這是可在本機執行的配對與複查工具，不只是畫面 mockup；但它也不是已上線的 Google Sheets 營運系統。網頁目前**不能直接上傳 Excel**，只能匯入 `cac-review-v2` JSON。JSON 是 CLI 的產出與後續交接格式，不必先自行整理一份 JSON 名單。

目前規則版本為 `2026-09-13.v6`。完整且權威的配對規則、計分、例外與資料邊界請見 [目前配對與複查規則](docs/matching-review-v2.zh-TW.md)。

## 雙語文件索引

| 文件 / Document | English | 繁體中文 |
| --- | --- | --- |
| 專案入門與交接 / Project setup and handover | [English](README.md) | [繁體中文](README.zh-TW.md) |
| 目前配對與複查規則（v6） / Current matching and review rules (v6) | [English](docs/matching-review-v2.md) | [繁體中文](docs/matching-review-v2.zh-TW.md) |
| 舊版 Google Sheets 與配對設計 / Legacy Google Sheets and matching design | [English](docs/google-sheet-and-matching-spec.md) | [繁體中文](docs/google-sheet-and-matching-spec.zh-TW.md) |
| 舊版 Apps Script 基礎架構 / Legacy Apps Script foundation | [English](apps-script/README.md) | [繁體中文](apps-script/README.zh-TW.md) |

**文件維護規則：** 後續交接文件必須同時提供英文與繁體中文版本，並同步更新。英文使用標準 `.md` 檔名，繁體中文在 `.md` 前加上 `.zh-TW`。翻譯時保留可執行程式碼、命令、識別碼及執行／資料路徑；文件連結應指向對應語言版本，語言切換與雙語索引除外。

## 1. 安裝

需要 Node.js **>=22.13.0**、npm，以及可建立虛擬環境的 Python 3。在專案根目錄執行：

```bash
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install openpyxl
```

`openpyxl` 只用於本機唯讀解析 Excel；`CAC_PYTHON` 必須指向已安裝它的 Python。下列命令以 macOS／Linux 為例，不需要先啟用虛擬環境。

## 2. 從原始 Excel 產生私人複查包

將原始 `.xlsx` 放在不會提交的私人位置；以下用已忽略的 `work/roster.xlsx` 作為示意路徑。來源必須有 `Participants` 工作表，前 20 欄符合 `scripts/read-roster.py` 所檢查的表單欄位與順序；這不是任意 Excel 的通用匯入器。

```bash
node scripts/sync-review-engine.mjs
CAC_PYTHON=.venv/bin/python npm run match:roster -- work/roster.xlsx outputs/private-review
```

先同步引擎，才能讓產出的 HTML 與 CLI 使用同一份核心。CLI 只讀取 Excel，不修改來源；保留來源列號與檔案指紋，使用雜湊 ID，遇到重複身分會停止。雜湊 ID **不代表匿名化**，複查包仍含姓名、聯絡資訊與必要原始回答。

輸出目錄必須是已被 Git 忽略的 `outputs/` **子目錄**，不可直接指定 `outputs/` 或其他位置：

| 檔案 | 用途 |
| --- | --- |
| `outputs/private-review/review.html` | 自帶資料、樣式與配對引擎；直接用瀏覽器開啟即可私人複查，不需啟動伺服器。 |
| `outputs/private-review/matching-review.json` | 初始配對結果；可匯入複查頁，但不會隨瀏覽器操作自動更新。 |

CLI 另接受第三個位置參數 `[overrides.json]` 作為修正資料；它不是完整審核匯出檔，也不是接續既有手動組別與審核歷史的入口。接續工作請在網頁匯入最後一次匯出的 JSON。

### 獨立結果檢查器

可對 CLI 初始結果，或已套用修正並匯出的 v6 複查結果執行：

```bash
node scripts/verify-matching-result.mjs outputs/private-review/matching-review.json work/roster.xlsx
```

檢查器不呼叫配對核心，另行檢查來源指紋、五種狀態計數、重複分組、資格硬限制、人工排除、手動決定與已顯示的共同語言／60 分鐘時段，也掃描公開資產是否包含來源 email。手動草案可保留明確標示的未確認事項，但不能把未知資料當作已驗證，或核准仍有資料問題的組別。先完成必要重算再檢查；失敗不可略過當作通過，通過也不代表已完成人工複查。

## 3. 複查與修正

工作台有五個檢視：

| 檢視 | 應如何處理 |
| --- | --- |
| 配對草案 | 檢查自動／例外／手動組別、原始回答、共同語言、時差與每月候選時段，記錄複查決定。 |
| 資料待確認 | 有會員、承諾、程度、語言、時區或時段等未釐清項目，不進自動配對。 |
| 尚未配對 | 資料可用但尚未找到組別；可進一步人工評估。 |
| 無法配對 | 本人明確陳述常住地／工作基地在亞太區外；不是依 GMT 或 Chapter 推測。 |
| 已排除 | 協調人明確排除的成員；保留原始資料、原因與審核軌跡。 |

已加入手動草案的待確認成員會顯示於草案內，不再重複計入「資料待確認」；但未解決項目仍保留。

- **確認／修正資料**：表單支援城市時區、教練程度、語言與參與承諾，須填確認人及依據。修正與原始回答分開保存，不回寫 Excel；不是所有欄位都能在此編輯。
- **明確重新配對**：儲存修正後，按「依修正資料重新配對」才會更新資格、時段、分數與草案。待重算期間不能核准，也不能建立新手動組別。
- **排除／恢復**：須填審核人與原因，系統記錄時間。排除不刪資料；恢復不會清除原有待確認或亞太區外常住地判定，仍須重新配對。若成員已在手動組別，先解除該組才能排除。
- **複查決定**：通過、退回或重設須有審核人及說明；通過另需確認聲明。通過只代表複查接受，**不是發布、本人同意或已約定會議**。

自動配對先找時差不超過 3 小時的標準組，再從剩餘名單找時數與時差例外；資格硬限制不放寬。共同語言及六個月每月都有連續 60 分鐘候選時段仍是自動配對要求。畫面上的時段是候選，不是預約。單一有效 GMT／UTC 固定時差直接採用；不因大於 +9 或 Chapter 而暫停。亞太區包含澳洲與紐西蘭，暫時旅行／缺席僅標示風險，不等同常住亞太區外。

### 手動三人草案

在「手動配對」從「資料待確認／尚未配對」選擇 **3 位不同成員**，填審核人、原因並確認這只是未驗證規劃草案。系統建立 `M-001` 起的組別，保存建立時間與確認聲明。

手動配對不代表可跳過所有限制：

- 已分組、已排除或常住亞太區外者不可選；教練程度不明者須先修正並重新配對。
- 自動與手動都禁止全 MCC、全 `LEARNING`（學習中），也禁止 MCC 與 ACC／`LEARNING` 同組。MCC 只能與 PCC／MCC 搭配，且仍不可全 MCC；PCC 可以與 ACC／`LEARNING` 搭配。
- 其他待確認項目可以保留在規劃草案中，但系統不會替未知資料補上語言、時區或時段。手動草案的 `score`／`subscores` 為 `null`；沒有證據不是零分或已驗證。
- 成員仍有待確認項目，或草案有 `MANUAL_*_UNVERIFIED` 標記時，不能核准。先取得依據、修正並重新配對；若修正造成教練程度衝突，先解除手動組別。

「手動配對 → 管理既有手動組別」可解除組別，須填審核人及解除原因。解除後成員依原有狀態回到待確認或尚未配對，不會自動改配；建立與解除都保留歷史，且不改動其他既有草案及其審核。

瀏覽器重新配對會保留有效手動組別與建立／解除歷史，但可能重排其他草案；舊審核移入歷史，不沿用為新結果的核准。已退回的確切三人組合會排除於後續瀏覽器重跑。

## 4. 儲存、交接與升級

所有網頁操作只在瀏覽器記憶體中，**沒有自動儲存**，也不會覆寫原本的 HTML 或 JSON。

1. 離開或交接前按「匯出審核紀錄」，下載目前完整 JSON。
2. 確認檔案確實存在；下載被擋時，可複製對話框中的完整內容，另存為 `.json`。
3. 確認後按「已確認儲存／複製」。這個按鈕是人工確認，不是替你寫檔。
4. 下次在複查頁按「匯入結果」，選擇最新匯出檔，即可接續修正、手動組別與歷史。交給下一位協調人時也使用這份檔案，而非單純分享網頁連結。

**舊的自含 HTML 內嵌舊引擎，不會隨程式更新。** 升級後要套用新規則，先保存 JSON，再以最新版複查頁匯入，明確重新配對。單純重新打開舊 HTML 或匯入舊 JSON 不會自動遷移／重算；從 Excel 重跑 CLI 則是新的初始報告，不會合併舊審核歷史。

## 開發與不含私密資料的試用

```bash
npm run dev
```

開啟終端機**實際印出的 URL**；不要假設固定是 `localhost:3000`。首頁載入複查工作台，也可開該網址下的 `/review/`。按「用虛構資料試用」不需要真實名單。

只需靜態複查頁時，可改用：

```bash
node scripts/sync-review-engine.mjs
python3 -m http.server 4173 --bind 127.0.0.1 --directory public
```

開啟 `http://127.0.0.1:4173/review/`。只提供 `public/`，不要從專案根目錄提供 HTTP 服務，以免暴露私人輸出。

開發命令：

```bash
npm run test:matching
npm test
npm run lint
```

- `test:matching` 執行 `apps-script/test/*.test.mjs` 的 Node 測試。
- `npm test` 先執行 `npm run build`，再執行 `test:matching`，不是只有單元測試。
- `lint` 執行 ESLint；不包含獨立結果檢查器或人工／瀏覽器複查。
- `dev` 與 `build` 的前置腳本會同步 `public/review/engine.js`。核心來源在 `apps-script/src/MatchingCore.gs`、`NormalizationCore.gs`、`ReviewMatching.gs`；不要直接修改產生的引擎檔。

## 隱私與現階段邊界

- 名單由本機 Python／Node 或瀏覽器處理，不傳給外部 API、語言模型或遠端儲存服務。複查頁禁止網路資料連線；載入網頁資產本身不等於上傳名單。
- 公開頁面只提供空白檢視器與虛構示範。私人 Excel、HTML、JSON 與匯出紀錄不可放進 `public/`、部署產物、Git、issue 或 PR。下載的 JSON 也要自行妥善保管；`.gitignore` 不是加密或存取控管。
- 沒有多人同步、Excel／Google Sheets 回寫、自動發布組隊或寄信。配對是確定性的啟發式草案，不保證全域最佳解，也不能替代人工核對自由文字限制與參與意願。
- [Google Sheets 與配對設計](docs/google-sheet-and-matching-spec.zh-TW.md) 及 [Apps Script 基礎架構](apps-script/README.zh-TW.md) 是較早期的工作簿／整合文件，不是本機 v6 行為的依據，也不表示已完成正式 Google Sheets 部署。
- 原始畫面保留於 [mockup](public/mockup/index.html)；透過上述靜態伺服器可開 `/mockup/index.html`。它與目前 `/review/` 的可操作複查流程分開。
