# 桌面應用程式封裝

桌面版使用 Electron 與 Electron Forge，輸出 Windows x64 應用程式及同時包含 Intel x64、Apple Silicon arm64 的 macOS Universal 應用程式。封裝系統集中於 `desktop/`，透過既有 Vite 設定建置遊戲，與 `src/` 的遊戲邏輯及 UI 維持獨立。網頁版沿用原本的開發、建置與部署流程。

## 開發環境與指令

使用 Node.js 22.12 以上版本與 npm，首次安裝執行 `npm ci`。在專案根目錄執行下列指令，流程會先檢查型別、建置遊戲及桌面入口，再封裝應用程式；完成後在終端機列出輸出位置。

| 指令 | 輸出 |
| --- | --- |
| `npm run package:win` | Windows x64 |
| `npm run package:mac` | macOS Universal，於 macOS 執行 |
| `npm run package:desktop` | 依序產出 Windows x64 與 macOS Universal，於 macOS 執行 |

首次打包會下載對應平台的 Electron 執行環境。Windows 交叉打包適用目前純網頁遊戲及 Electron 入口的結構；若未來加入原生 Node 模組，應重新確認跨平台編譯需求。Windows 版的啟動與效能須於 Windows 實機驗證，Universal 版須分別驗證 Intel 與 Apple Silicon。

產物位於 `out/DiceStickerRoguelite-win32-x64/` 與 `out/DiceStickerRoguelite-darwin-universal/`。前者包含 `DiceStickerRoguelite.exe` 與完整執行資源，分享及上傳時保留整個資料夾；後者包含 `DiceStickerRoguelite.app`。打包只產生檔案，應用程式由使用者手動開啟。

## 系統邊界與資源

`desktop/` 管理應用名稱、識別碼、視窗設定、Electron 主程序及封裝流程。`build/desktop/` 保存封裝暫存資料，`out/` 保存最終產物，兩者皆由 Git 忽略。封裝使用獨立的應用程式清單，將桌面入口及正式網頁資源納入應用程式；專案原始碼、環境設定與開發相依套件保留於開發工作區。

桌面版以固定的本機應用協定提供資源，讓既有 `/assets/`、`/arrow.png` 等根路徑及瀏覽器儲存機制沿用相同邏輯。遊戲在隔離的 Electron renderer 中執行，檔案存取由主程序限制在已封裝的網頁資源目錄。桌面版的 localStorage 使用獨立的應用程式資料目錄，與瀏覽器版紀錄分開保存。視窗提供調整大小、全螢幕切換及開發工具選單，供人工觀察排版與效能。

## 測試包與正式發佈

目前指令輸出本機試跑用應用程式，macOS 使用本機 ad-hoc 簽名，正式 Developer ID 簽名與 Apple 公證於發佈階段配置。發佈至 Steam 的新 macOS 應用程式依 Steamworks 規定提供 64 位元與 Apple 公證，完成後在 Steamworks 勾選對應設定。憑證與公證驗證資料由開發機或 CI 的憑證管理提供。

Steam 的 Windows 啟動路徑設為 `DiceStickerRoguelite.exe`；macOS 優先設為 `DiceStickerRoguelite.app`，由 macOS 選擇合適架構。兩平台各自配置 depot 並透過 SteamPipe 上傳。現階段交付範圍為本機封裝；Steam 上傳、成就與雲端存檔於平台整合階段處理。

參考：[Electron Forge 建置流程](https://www.electronforge.io/core-concepts/build-lifecycle)、[Steam macOS 平台要求](https://partner.steamgames.com/doc/store/application/platforms)、[Steam 啟動與上傳設定](https://partner.steamgames.com/doc/sdk/uploading)。
