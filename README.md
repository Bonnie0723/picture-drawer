# Picture Drawer

**Picture Drawer** is a mobile-first visual reference organizer for designers, ecommerce operators, product teams, and anyone who saves large numbers of images on a phone.

鎵嬫満鐩稿唽閫傚悎鈥滀繚瀛樺浘鐗団€濓紝浣嗕笉閫傚悎蹇€熷洖绛旇繖浜涢棶棰橈細

- 杩欏紶鍥惧睘浜庝粈涔?*椋庢牸**锛?- 鏉ヨ嚜鍝釜**妗ｅ彛 / 渚涘簲鍟?*锛?- 鏄摢涓€澶╂敹闆嗙殑锛?- 鎯虫壘鏌愮被鍙傝€冨浘鏃讹紝鑳戒笉鑳界珛鍒昏皟鍑烘潵锛?
Picture Drawer 鎶婇浂鏁ｅ浘鐗囨暣鐞嗘垚鍙绱㈢殑瑙嗚璧勬枡搴撱€?
## Core needs

- Collect images from the phone camera or photo album.
- Organize each image by **Category**, **Style**, **Stall**, and **Date**.
- Use editable dropdown options instead of repeatedly typing the same information.
- Filter by category, style, stall, and date, including combined filters.
- Retrieve previously collected visual references quickly during design, sourcing, product selection, or content planning.
- Clean stored records by a selected date range.
- Optionally keep only the latest 30 / 60 / 90 / 180 days of records.
- Install the app on a phone home screen as a PWA.

## Typical use cases

- Designers building a reusable visual inspiration library.
- Ecommerce teams classifying product images and visual directions.
- Phone-case sellers organizing styles such as cute, minimal, cartoon, INS, bow, transparent, metallic, and seasonal themes.
- Tracking images collected from different wholesale stalls or suppliers.
- Retrieving a specific image quickly by date, style, category, or stall.

## Main features

- **Camera and album import**
- **Editable Category / Style / Stall options**
- **Last selection memory** for faster batch entry
- **Date, category, style, and stall filtering**
- **Combined filtering**
- **Date-range cleanup**
- **Optional automatic retention rules**
- **Secure export to a Feishu Drive folder**
- **Shopee TH/VN DTS ship-by calculator**
- **Editable Shopee cost and profit calculator**
- **Local-first storage with IndexedDB**
- **Installable mobile PWA**
- **Pixel-style cat interface**

## Data and privacy

Picture Drawer is local-first. Records and compressed image copies are stored in the browser with IndexedDB.

- Images are not uploaded to an external server by default.
- Photos are sent to Feishu only when you explicitly start an export.
- Deleting a Picture Drawer record does not delete the original image from the phone album.
- Clearing browser or site data may remove locally stored records.

## Product direction

The product is designed around one core workflow:

> Collect once 鈫?classify quickly 鈫?retrieve anytime.

The goal is not to replace the phone album. It adds the structured layer that a normal phone album lacks.

## Planned deployment

The project is intended to be deployed through GitHub Pages and installed from the browser to the phone home screen.

---

Built for visual collection, design reference management, ecommerce sourcing, and mobile image organization.

## Feishu export backend

The browser never receives the Feishu app secret. The `worker/` directory contains a small Cloudflare Worker that exchanges the app credentials for a tenant access token and uploads each selected JPG to a configured Feishu Drive folder.

1. Create a Feishu custom app, enable Drive file upload permission, and add the app to the destination folder.
2. In `worker/`, install dependencies and add the four secrets with `wrangler secret put`: `FEISHU_APP_ID`, `FEISHU_APP_SECRET`, `FEISHU_FOLDER_TOKEN`, and `EXPORT_TOKEN`.
3. Set `ALLOWED_ORIGINS` in `worker/wrangler.jsonc` to the exact Picture Drawer site origin, then deploy the Worker.
4. Open **EXPORT FEISHU** in Picture Drawer and enter the Worker URL and the same `EXPORT_TOKEN`.

Exports run one image at a time and can include either all records or only the records shown by the current filters.

