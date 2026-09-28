# 場景背景

本文件由 [介面與資訊規則](spec.md#23-介面與資訊規則)導流，背景沿用[畫面縮放與布局](viewport-layout.md)的共用倍率。每套背景以 DOM 圖片分層呈現，素材按場景放在 `src/assets/background/<場景>/`，底色、外圍滿版背景、素材尺寸與位置由 `src/configs/backgrounds/` 管理。目前使用 swamp，最底背景色為 `#C5DE58`；新增場景時提供自己的素材、底色與 fullBackground，沿用同一個背景元件。

## 構圖與座標

遊戲場地與背景構圖固定為 1920 × 1080 設計單位，整組等比例縮放並水平、垂直置中於 viewport。swamp 的原始橫幅寬度為 3810 像素，全部素材以 1920／3810 的共同倍率換算寬高，之後隨遊戲場地一起縮放。素材的 x 與草葉的 localX 使用設計單位，以圖片左緣定位。視窗長寬比改變時保留完整構圖與相對距離，遊戲場地以外的區域由 fullBackground 填補。

back、草葉、石頭與木頭的圖片底緣共同對齊基準線，`baselineY = 1080 − baselineBottom`。`baselineBottom` 是距離遊戲場地底部的設計單位，增加時整批素材向上移動，減少時向下移動。`front_ground` 底緣獨立對齊遊戲場地底部。swamp 的 `baselineBottom` 為 400，地面覆蓋草木根部；確切構圖透過設定檔調整。

每張 back 提供獨立 x，同層的第二個編號預設從左向右排列。每株草以第一個編號分組，整株 x 決定全株位置，第二個編號代表葉片，每片 localX 控制株內水平位置，預設從左向右排列。石頭初始放在最左側，木頭放在最右側，各自有獨立 x。地面橫幅固定水平置中並覆蓋完整構圖寬度。

vine 與 beard 的圖片頂緣共同對齊 `baselineTop`，此值表示距離遊戲場地頂端的設計單位，初始為 0；增加時整組向下移動。每張素材提供獨立 x，vine 1、2 位於左側，vine 3 位於右側，beard 都位於右半側。這些頂部素材與底部基準線各自定位，並隨同一個固定場地縮放。

## 外圍滿版背景

每套場景的 `fullBackground` 指定外圍背景檔名、brightness 與 blur。swamp 使用 `full_bg.png`，亮度 0.45，模糊 6 CSS px。圖片以 CSS cover 置中填滿 viewport，位於完整遊戲場地後方；模糊向外延伸並裁切，讓 viewport 邊緣維持覆蓋。外圍背景使用自己的 viewport 尺寸，遊戲內的圖片保持清晰。

## 遮擋順序

背景及怪物由前至後依序為：front_ground、草、vine 與 beard、石頭與木頭、back_1、back_2、怪物、back_3、back_4、back_5、back_6、back_7、場景底色。vine 與 beard 位於同層。back 第一個編號相同的素材位於同層，編號越小越前面。草株的編號越小越前面，同株葉片位於同層，重疊時由後繪製的葉片覆蓋。怪物陣列形成獨立圖層，攻擊與受擊時仍維持在 back_2 與 back_3 之間。

背景裝飾讓滑鼠事件穿透。地圖、骰盤與底部操作列位於場景素材上方，彈窗與既有浮動演出沿用自己的圖層。背景使用靜態定位，怪物與骰盤保留自己的局部演出。

## 後續受擊效果

玩家受擊時的場景效果由 front 承接：ground 震動、草葉彈簧晃動一至兩下，以及少量碎片噴出後消失；back 與怪物維持場景位置。本次完成靜態構圖與分層，這些 front 效果留待後續實作。

## 設定入口

`src/configs/backgrounds/backgroundConfig.ts` 管理目前場景與共用深度，`swampConfig.ts` 管理 swamp 的底色、fullBackground、原始橫幅寬度、baselineBottom、baselineTop、hanging 頂部素材 x、back 各圖 x、草株 x、草葉 localX 及石頭木頭 x。圖片的 width、height 記錄原始 PNG 尺寸，位置值一律使用設計單位。呈現元件位於 `src/components/background/`。

驗證使用型別檢查、正式建置及受影響的既有核心測試；人工檢視由使用者開啟遊戲，調整不同長寬比、背景座標並確認戰鬥及彈窗圖層。
