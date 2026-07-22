DiamondMind Frontend V21.1.2 — Self-contained Hotfix

原因：GitHub 儲存庫缺少 assets/styles.css，導致會員站以瀏覽器預設樣式顯示。

本版將會員站 CSS、shared.js、member.js 直接內嵌到 index.html／404.html，並將 Founder Console JS 內嵌到 admin.html。即使手機上傳無法保留 assets 資料夾，會員站與管理後台仍可完整運作。

上傳到 diamondmind-web 根目錄並覆蓋：
- index.html
- admin.html
- 404.html
- manifest.webmanifest
- README_DEPLOY.txt

不需要上傳 assets 資料夾。後端 V21.1.0、Supabase SQL 與 Render 環境變數不用修改。

會員站驗收：/?v=21.1.2
管理後台：admin.html?v=21.1.2
