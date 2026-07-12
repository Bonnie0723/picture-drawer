# Picture Drawer

**Picture Drawer** is a mobile-first visual reference organizer for designers, ecommerce operators, product teams, and anyone who saves large numbers of images on a phone.

手机相册适合“保存图片”，但不适合快速回答这些问题：

- 这张图属于什么**风格**？
- 来自哪个**档口 / 供应商**？
- 是哪一天收集的？
- 想找某类参考图时，能不能立刻调出来？

Picture Drawer 把零散图片整理成可检索的视觉资料库。

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
- **Local-first storage with IndexedDB**
- **Installable mobile PWA**
- **Pixel-style cat interface**

## Data and privacy

Picture Drawer is local-first. Records and compressed image copies are stored in the browser with IndexedDB.

- Images are not uploaded to an external server by default.
- Deleting a Picture Drawer record does not delete the original image from the phone album.
- Clearing browser or site data may remove locally stored records.

## Product direction

The product is designed around one core workflow:

> Collect once → classify quickly → retrieve anytime.

The goal is not to replace the phone album. It adds the structured layer that a normal phone album lacks.

## Planned deployment

The project is intended to be deployed through GitHub Pages and installed from the browser to the phone home screen.

---

Built for visual collection, design reference management, ecommerce sourcing, and mobile image organization.
