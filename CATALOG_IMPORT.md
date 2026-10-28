# Picture Drawer 商品图库：Excel 导入与手机访问

## 手机网页
https://bonnie0723.github.io/picture-drawer/catalog.html

此页是**独立的商品图库**，不会删除或改写原有 Picture Drawer 的 IndexedDB 数据、备份、图片记录、利润功能。

## Excel 模板
第一行是表头。建议用下列列名，顺序不限：

| 名称 | SKU | 分类 | 档口 | 风格 | 日期 | 备注 | 图片链接 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 粉色波点磁吸手机壳 | CASE001 | 手机壳 | 3A-108 | 韩系 | 2026-10-28 | iPhone 17 Pro Max | https://example.com/case001.jpg |

支持中文和英文列别名（见 catalog.html 中 fields）。支持 .xlsx/.xls/.csv；多个工作表合并。按 SKU（或名称加档口）去重。

**图片注意：** 手机图库需要可访问的 HTTPS 图片链接。Excel 单元格里**嵌入**的图片不会被普通 XLSX 表格解析器提取；只有文字图片链接能直接显示。请先让 AI 把 Excel 中嵌入图片提取到仓库的 `data/images/`，再将对应行的“图片链接”写成相对路径 `./data/images/xxx.jpg`。图片不要用 data:、javascript: URL。图库页面仅使用 http(s) URL。

## 导入方式
1. 打开 catalog.html 点击“从本机导入 Excel”。这会导入当前设备的浏览器本地存储，可直接查看、筛选；其他手机不会自动看到。
2. 点击“导出 JSON（供 AI 发布）”，得到 catalog.json。
3. 将 catalog.json 提交到此仓库的 `data/catalog.json`。刷新手机网页后，所有设备都可以查看云端目录。

如果 Excel 已有图片链接，也可由 AI 直接将 Excel 转为 JSON 数组提交到 `data/catalog.json`，不用在手机导入一次。严禁未经用户确认公开上传客户、订单或个人信息：本仓库是公开仓库，GitHub Pages 数据对公众可见。

## 验收
- 手机 Safari / Chrome 竖屏，两列卡片，支持大图、关键词、分类和档口筛选。
- 没有 JSON 或表格时显示友好空状态。
- 未上传 Excel 前绝不声称数据已导入。
- 本机导入与 GitHub 云端发布是两个不同步骤。
- 原有首页与功能保持不变。
