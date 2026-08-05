(function () {
  'use strict';

  const DB_NAME = 'tujika_db';
  const DB_VERSION = 1;
  const STORE_NAME = 'entries';
  const LEGACY_KEY = 'tujika_entries';
  const CATEGORY_KEY = 'picture_drawer_categories_v1';
  const STYLE_KEY = 'picture_drawer_styles_v1';
  const STALL_KEY = 'picture_drawer_stalls_v1';
  const FORM_PREF_KEY = 'picture_drawer_form_pref_v1';
  const RETENTION_KEY = 'picture_drawer_retention_days_v1';
  const AUTO_CLEAN_LAST_KEY = 'picture_drawer_auto_clean_last_v1';
  const DEFAULT_CATEGORIES = ['Minimal', 'Cute', 'Cartoon', 'INS'];
  const DEFAULT_STYLES = ['Minimal', 'Cute', 'Cartoon', 'INS', 'Pink', 'Dark', 'Clear'];
  const DEFAULT_STALLS = ['3A-108', '3A-107', '3B-205'];
  const MAX_IMAGE_EDGE = 1600;
  const JPEG_QUALITY = 0.84;

  const $ = (id) => document.getElementById(id);

  const imgArea = $('imgArea');
  const cameraInput = $('cameraInput');
  const albumInput = $('albumInput');
  const cameraBtn = $('cameraBtn');
  const albumBtn = $('albumBtn');
  const preview = $('preview');
  const placeholder = $('placeholder');
  const categoryInput = $('category');
  const styleInput = $('style');
  const stallInput = $('stall');
  const dateInput = $('date');
  const saveBtn = $('saveBtn');
  const clearBtn = $('clearBtn');
  const entryList = $('entryList');
  const entryCount = $('entryCount');
  const categoryChips = $('categoryChips');
  const categoryFilter = $('categoryFilter');
  const stallFilter = $('stallFilter');
  const styleFilter = $('styleFilter');
  const dateFilter = $('dateFilter');
  const exportStatusFilter = $('exportStatusFilter');
  const resetFiltersBtn = $('resetFiltersBtn');
  const filterStatus = $('filterStatus');
  const manageCategoriesBtn = $('manageCategoriesBtn');
  const manageStylesBtn = $('manageStylesBtn');
  const manageStallsBtn = $('manageStallsBtn');
  const editCategoriesLink = $('editCategoriesLink');
  const categoryModal = $('categoryModal');
  const closeCategoryModalBtn = $('closeCategoryModal');
  const newCategoryInput = $('newCategoryInput');
  const addCategoryBtn = $('addCategoryBtn');
  const categoryManagerList = $('categoryManagerList');
  const optionModal = $('optionModal');
  const closeOptionModalBtn = $('closeOptionModal');
  const styleOptionTab = $('styleOptionTab');
  const stallOptionTab = $('stallOptionTab');
  const newOptionInput = $('newOptionInput');
  const addOptionBtn = $('addOptionBtn');
  const optionManagerList = $('optionManagerList');
  const openCleanupBtn = $('openCleanupBtn');
  const cleanupModal = $('cleanupModal');
  const closeCleanupModalBtn = $('closeCleanupModal');
  const cleanupFrom = $('cleanupFrom');
  const cleanupTo = $('cleanupTo');
  const cleanupSummary = $('cleanupSummary');
  const deleteRangeBtn = $('deleteRangeBtn');
  const deleteAllBtn = $('deleteAllBtn');
  const retentionDays = $('retentionDays');
  const saveRetentionBtn = $('saveRetentionBtn');
  const openExportBtn = $('openExportBtn');
  const exportModal = $('exportModal');
  const closeExportModalBtn = $('closeExportModal');
  const exportProgress = $('exportProgress');
  const exportExcelBtn = $('exportExcelBtn');
  const toast = $('toast');

  let currentImageBlob = null;
  let currentPreviewUrl = '';
  let toastTimer = null;
  let dbPromise = null;
  let useMemoryStore = false;
  let memoryEntries = [];
  let memoryId = 1;
  const objectUrls = new Set();
  let allEntries = [];
  let categories = loadCategoriesFromStorage();
  let styleOptions = loadOptionList(STYLE_KEY, DEFAULT_STYLES);
  let stallOptions = loadOptionList(STALL_KEY, DEFAULT_STALLS);
  let activeOptionType = 'style';

  function localDateValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function setToday() {
    dateInput.value = localDateValue(new Date());
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function loadExportSettings() {
    try {
      const value = JSON.parse(localStorage.getItem(EXPORT_SETTINGS_KEY) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch (_) {
      return {};
    }
  }

  function saveExportSettings() {
    try {
      localStorage.setItem(EXPORT_SETTINGS_KEY, JSON.stringify({
        apiUrl: exportApiUrl.value.trim().replace(/\/+$/, ''),
        accessToken: exportAccessToken.value
      }));
    } catch (_) {}
  }

  function openExportModal() {
    const shown = getFilteredEntries(allEntries).length;
    const pending = allEntries.filter((entry) => !entry.exportedAt).length;
    exportProgress.textContent = `当前显示 ${shown} 条 · 尚未导出 ${pending} 条`;
    exportProgress.textContent = `${shown} shown  -  ${allEntries.length} total  -  ready to export`;
    exportProgress.textContent = `当前显示 ${shown} 条 · 尚未导出 ${pending} 条`;
    exportModal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeExportModal() {
    exportModal.hidden = true;
    document.body.style.overflow = '';
  }

  function safeFilePart(value, fallback) {
    const text = normalizeText(value) || fallback;
    return text.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/\s+/g, '_').slice(0, 48);
  }

  function exportFileName(entry, index) {
    return [
      safeFilePart(entry.date, 'no-date'),
      safeFilePart(entry.category, 'uncategorized'),
      safeFilePart(entry.style, 'no-style'),
      safeFilePart(entry.stall, 'no-stall'),
      String(entry.id || index + 1)
    ].join('_') + '.jpg';
  }

  function exportMetadata(entry, index) {
    return {
      id: entry.id ?? index + 1,
      date: normalizeText(entry.date),
      category: normalizeText(entry.category),
      style: normalizeText(entry.style),
      stall: normalizeText(entry.stall),
      image_file: exportFileName(entry, index),
      captured_at: entry.ts ? new Date(entry.ts).toISOString() : ''
    };
  }

  function downloadTextFile(content, fileName, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function csvCell(value) {
    const text = String(value ?? '');
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function exportEntriesLocally(entries, format) {
    if (!entries.length) {
      showToast('No records to export');
      return;
    }
    const rows = entries.map(exportMetadata);
    const stamp = localDateValue(new Date());
    if (format === 'json') {
      downloadTextFile(JSON.stringify({
        schema: 'picture-drawer-export/v1',
        exported_at: new Date().toISOString(),
        count: rows.length,
        entries: rows
      }, null, 2), `picture-drawer-${stamp}.json`, 'application/json;charset=utf-8');
    } else if (format === 'csv') {
      const fields = ['id', 'date', 'category', 'style', 'stall', 'image_file', 'captured_at'];
      const csv = '\uFEFF' + [fields.map(csvCell).join(','), ...rows.map(row => fields.map(field => csvCell(row[field])).join(','))].join('\r\n');
      downloadTextFile(csv, `picture-drawer-${stamp}.csv`, 'text/csv;charset=utf-8');
    } else {
      const lines = [
        '# Picture Drawer Export',
        '',
        `Exported: ${new Date().toISOString()}`,
        `Records: ${rows.length}`,
        '',
        '> AI note: metadata is complete below. Images remain in Picture Drawer; use each image_file value when matching separately downloaded images.',
        ''
      ];
      rows.forEach((row, index) => {
        lines.push(
          `## ${index + 1}. ${row.image_file}`,
          '',
          `- ID: ${row.id}`,
          `- Date: ${row.date || ' - '}`,
          `- Category: ${row.category || ' - '}`,
          `- Style: ${row.style || ' - '}`,
          `- Stall: ${row.stall || ' - '}`,
          `- Captured at: ${row.captured_at || ' - '}`,
          ''
        );
      });
      downloadTextFile(lines.join('\n'), `picture-drawer-${stamp}.md`, 'text/markdown;charset=utf-8');
    }
    exportProgress.textContent = `${rows.length} shown records downloaded as ${format.toUpperCase()}`;
    showToast(`${format.toUpperCase()} downloaded ?`);
  }

  const CRC32_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let value = n;
      for (let bit = 0; bit < 8; bit += 1) {
        value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
      }
      table[n] = value >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let index = 0; index < bytes.length; index += 1) {
      crc = CRC32_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function writeZipNumber(view, offset, value, bytes) {
    if (bytes === 2) view.setUint16(offset, value, true);
    else view.setUint32(offset, value >>> 0, true);
  }

  function zipDateTime(date) {
    return {
      time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
      date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
    };
  }

  async function createStoredZip(files) {
    const encoder = new TextEncoder();
    const now = zipDateTime(new Date());
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const file of files) {
      const name = encoder.encode(file.name);
      const data = file.data instanceof Uint8Array ? file.data : new Uint8Array(await file.data.arrayBuffer());
      const checksum = crc32(data);
      const local = new Uint8Array(30 + name.length);
      const localView = new DataView(local.buffer);
      writeZipNumber(localView, 0, 0x04034b50, 4);
      writeZipNumber(localView, 4, 20, 2);
      writeZipNumber(localView, 6, 0x0800, 2);
      writeZipNumber(localView, 8, 0, 2);
      writeZipNumber(localView, 10, now.time, 2);
      writeZipNumber(localView, 12, now.date, 2);
      writeZipNumber(localView, 14, checksum, 4);
      writeZipNumber(localView, 18, data.length, 4);
      writeZipNumber(localView, 22, data.length, 4);
      writeZipNumber(localView, 26, name.length, 2);
      local.set(name, 30);
      localParts.push(local, data);

      const central = new Uint8Array(46 + name.length);
      const centralView = new DataView(central.buffer);
      writeZipNumber(centralView, 0, 0x02014b50, 4);
      writeZipNumber(centralView, 4, 20, 2);
      writeZipNumber(centralView, 6, 20, 2);
      writeZipNumber(centralView, 8, 0x0800, 2);
      writeZipNumber(centralView, 10, 0, 2);
      writeZipNumber(centralView, 12, now.time, 2);
      writeZipNumber(centralView, 14, now.date, 2);
      writeZipNumber(centralView, 16, checksum, 4);
      writeZipNumber(centralView, 20, data.length, 4);
      writeZipNumber(centralView, 24, data.length, 4);
      writeZipNumber(centralView, 28, name.length, 2);
      writeZipNumber(centralView, 42, offset, 4);
      central.set(name, 46);
      centralParts.push(central);
      offset += local.length + data.length;
    }

    const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    writeZipNumber(endView, 0, 0x06054b50, 4);
    writeZipNumber(endView, 8, files.length, 2);
    writeZipNumber(endView, 10, files.length, 2);
    writeZipNumber(endView, 12, centralSize, 4);
    writeZipNumber(endView, 16, offset, 4);
    return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
  }

  function exportCsvText(rows) {
    const fields = ['id', 'date', 'category', 'style', 'stall', 'image_file', 'captured_at'];
    return '\uFEFF' + [fields.map(csvCell).join(','), ...rows.map(row => fields.map(field => csvCell(row[field])).join(','))].join('\r\n');
  }

  function xmlEscape(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function inlineCell(reference, value, style = 0) {
    return `<c r="${reference}" t="inlineStr"${style ? ` s="${style}"` : ''}><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
  }

  async function createExcelWithImages(entries) {
    const encoder = new TextEncoder();
    const rows = entries.map(exportMetadata);
    const images = [];
    entries.forEach((entry, index) => {
      if (entry.image instanceof Blob) {
        images.push({ entryIndex: index, data: entry.image, name: `image${images.length + 1}.jpg` });
      }
    });

    const sheetRows = [
      `<row r="1" ht="26" customHeight="1">${['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1'].map((ref, i) => inlineCell(ref, ['Image', 'ID', 'Date', 'Category', 'Style', 'Stall', 'Image file'][i], 1)).join('')}</row>`
    ];
    rows.forEach((row, index) => {
      const excelRow = index + 2;
      sheetRows.push(
        `<row r="${excelRow}" ht="90" customHeight="1">` +
        inlineCell(`B${excelRow}`, row.id) +
        inlineCell(`C${excelRow}`, row.date) +
        inlineCell(`D${excelRow}`, row.category) +
        inlineCell(`E${excelRow}`, row.style) +
        inlineCell(`F${excelRow}`, row.stall) +
        inlineCell(`G${excelRow}`, row.image_file) +
        '</row>'
      );
    });

    const drawingAnchors = images.map((image, index) => {
      const row = image.entryIndex + 1;
      const relId = index + 1;
      return `<xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>47625</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>47625</xdr:rowOff></xdr:from><xdr:ext cx="1143000" cy="809625"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${relId}" name="Picture ${relId}" descr="${xmlEscape(rows[image.entryIndex].image_file)}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${relId}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1143000" cy="809625"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;
    }).join('');

    const drawingRels = images.map((image, index) =>
      `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${image.name}"/>`
    ).join('');

    const files = [
      { name: '[Content_Types].xml', data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`) },
      { name: '_rels/.rels', data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`) },
      { name: 'xl/workbook.xml', data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Picture Drawer" sheetId="1" r:id="rId1"/></sheets></workbook>`) },
      { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`) },
      { name: 'xl/styles.xml', data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF6B4EFF"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`) },
      { name: 'xl/worksheets/sheet1.xml', data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="20" customWidth="1"/><col min="2" max="2" width="10" customWidth="1"/><col min="3" max="3" width="14" customWidth="1"/><col min="4" max="6" width="18" customWidth="1"/><col min="7" max="7" width="46" customWidth="1"/></cols><sheetData>${sheetRows.join('')}</sheetData><autoFilter ref="A1:G${rows.length + 1}"/><drawing r:id="rId1"/></worksheet>`) },
      { name: 'xl/worksheets/_rels/sheet1.xml.rels', data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`) },
      { name: 'xl/drawings/drawing1.xml', data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${drawingAnchors}</xdr:wsDr>`) },
      { name: 'xl/drawings/_rels/drawing1.xml.rels', data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${drawingRels}</Relationships>`) }
    ];
    images.forEach((image) => files.push({ name: 'xl/media/' + image.name, data: image.data }));
    const archive = await createStoredZip(files);
    return new Blob([await archive.arrayBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  async function exportExcelWithImages(entries) {
    if (!entries.length) {
      showToast('No records to export');
      return;
    }
    exportExcelBtn.disabled = true;
    exportProgress.textContent = `Building Excel with ${entries.length} embedded images - `;
    try {
      const workbook = await createExcelWithImages(entries);
      const url = URL.createObjectURL(workbook);
      const link = document.createElement('a');
      link.href = url;
      link.download = `picture-drawer-${localDateValue(new Date())}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      const exportedAt = new Date().toISOString();
      await Promise.all(entries.map((entry) => putEntry({ ...entry, exportedAt })));
      await loadEntries();
      exportProgress.textContent = `已导出 ${entries.length} 条，并标记为“已导出”`;
      showToast('带图表格已下载');
      exportProgress.textContent = `${entries.length} records exported with embedded pictures`;
      showToast('Excel with pictures downloaded');
      exportProgress.textContent = `已导出 ${entries.length} 条，并标记为“已导出”`;
      showToast('带图表格已下载');
    } catch (error) {
      exportProgress.textContent = error.message || 'Could not create Excel';
      showToast('Excel export failed');
    } finally {
      exportExcelBtn.disabled = false;
    }
  }

  async function exportImagesWithCsv(entries) {
    if (!entries.length) {
      showToast('No records to export');
      return;
    }
    exportPackageBtn.disabled = true;
    exportCsvBtn.disabled = true;
    try {
      const rows = entries.map(exportMetadata);
      const files = [{ name: 'picture-drawer.csv', data: new TextEncoder().encode(exportCsvText(rows)) }];
      entries.forEach((entry, index) => {
        if (entry.image instanceof Blob) {
          files.push({ name: 'images/' + rows[index].image_file, data: entry.image });
        }
      });
      exportProgress.textContent = `Packing ${files.length - 1} images and CSV - `;
      const zip = await createStoredZip(files);
      const url = URL.createObjectURL(zip);
      const link = document.createElement('a');
      link.href = url;
      link.download = `picture-drawer-${localDateValue(new Date())}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      exportProgress.textContent = `${files.length - 1} images + CSV downloaded in one ZIP`;
      showToast('Images + CSV downloaded ?');
    } catch (error) {
      exportProgress.textContent = error.message || 'Could not create ZIP';
      showToast('ZIP export failed');
    } finally {
      exportPackageBtn.disabled = false;
      exportCsvBtn.disabled = false;
    }
  }

  async function exportEntriesToFeishu(entries) {
    const apiUrl = exportApiUrl.value.trim().replace(/\/+$/, '');
    const accessToken = exportAccessToken.value;
    if (!apiUrl || !/^https?:\/\//i.test(apiUrl)) {
      showToast('Enter a valid backend URL');
      exportApiUrl.focus();
      return;
    }
    if (!accessToken) {
      showToast('Enter the export access token');
      exportAccessToken.focus();
      return;
    }
    if (entries.length === 0) {
      showToast('No photos to export');
      return;
    }

    saveExportSettings();
    exportFilteredBtn.disabled = true;
    exportAllBtn.disabled = true;
    let exported = 0;
    let lastFileToken = '';
    const failures = [];

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      const image = entry.image instanceof Blob ? entry.image : null;
      if (!image) {
        failures.push({ index: index + 1, error: 'No image data' });
        continue;
      }

      exportProgress.textContent = `Exporting ${index + 1}/${entries.length}  -  ${exportFileName(entry, index)}`;
      const body = new FormData();
      body.append('file', image, exportFileName(entry, index));
      body.append('category', normalizeText(entry.category));
      body.append('style', normalizeText(entry.style));
      body.append('stall', normalizeText(entry.stall));
      body.append('date', normalizeText(entry.date));

      try {
        const response = await fetch(`${apiUrl}/api/export/feishu`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.ok === false) {
          let detail = result.error || `Export failed (${response.status})`;
          if (result.feishu_code) {
            detail = `Feishu ${result.feishu_code}: ${result.feishu_detail || result.error || 'unknown'}`;
          }
          throw new Error(detail);
        }
        exported += 1;
        lastFileToken = result.fileToken || '';
      } catch (error) {
        failures.push({ index: index + 1, error: error.message || 'Export failed' });
        exportProgress.textContent = `#${index + 1} failed  -  ${error.message || 'Export failed'}`;
      }
    }

    exportFilteredBtn.disabled = false;
    exportAllBtn.disabled = false;
    if (failures.length) {
      const summary = failures.map(f => `#${f.index}: ${f.error}`).join(' | ');
      exportProgress.textContent = `${exported}/${entries.length} exported  -  ${summary}`;
    } else {
      exportProgress.textContent = `${exported}/${entries.length} exported  -  token: ${lastFileToken || 'n/a'}`;
    }
    showToast(failures.length ? 'Export finished with errors' : 'Exported to Feishu ?');
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function normalizeCategoryName(value) {
    return normalizeText(value).replace(/\s+/g, ' ').slice(0, 24);
  }

  function dedupeCategories(items) {
    const seen = new Set();
    const result = [];
    items.forEach((item) => {
      const name = normalizeCategoryName(item);
      const key = name.toLocaleLowerCase();
      if (!name || seen.has(key)) return;
      seen.add(key);
      result.push(name);
    });
    return result;
  }

  function loadCategoriesFromStorage() {
    try {
      const raw = localStorage.getItem(CATEGORY_KEY);
      if (!raw) return [...DEFAULT_CATEGORIES];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [...DEFAULT_CATEGORIES];
      return dedupeCategories(parsed);
    } catch (_) {
      return [...DEFAULT_CATEGORIES];
    }
  }

  function saveCategoriesToStorage() {
    try {
      localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories));
    } catch (_) {
      showToast('Category settings could not be saved');
    }
  }

  function normalizeOptionName(value) {
    return normalizeText(value).replace(/\s+/g, ' ').slice(0, 40);
  }

  function dedupeOptions(items) {
    const seen = new Set();
    const result = [];
    items.forEach((item) => {
      const name = normalizeOptionName(item);
      const key = name.toLocaleLowerCase();
      if (!name || seen.has(key)) return;
      seen.add(key);
      result.push(name);
    });
    return result;
  }

  function loadOptionList(key, defaults) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [...defaults];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? dedupeOptions(parsed) : [...defaults];
    } catch (_) {
      return [...defaults];
    }
  }

  function saveOptionList(key, items) {
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch (_) {
      showToast('Option settings could not be saved');
    }
  }

  function saveFormPreferences() {
    try {
      localStorage.setItem(FORM_PREF_KEY, JSON.stringify({
        category: categoryInput.value,
        style: styleInput.value,
        stall: stallInput.value
      }));
    } catch (_) {}
  }

  function loadFormPreferences() {
    try {
      const parsed = JSON.parse(localStorage.getItem(FORM_PREF_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function applyFormPreferences() {
    const prefs = loadFormPreferences();
    if (categories.includes(prefs.category)) categoryInput.value = prefs.category;
    if (styleOptions.includes(prefs.style)) styleInput.value = prefs.style;
    if (stallOptions.includes(prefs.stall)) stallInput.value = prefs.stall;
  }

  function openDatabase() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('ts', 'ts');
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open local database'));
      request.onblocked = () => reject(new Error('Database upgrade is blocked by another tab'));
    });

    return dbPromise;
  }

  async function getEntries() {
    if (useMemoryStore) {
      return memoryEntries.map((entry) => ({ ...entry })).sort((a, b) => (b.ts || 0) - (a.ts || 0));
    }
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => {
        const rows = Array.isArray(request.result) ? request.result : [];
        rows.sort((a, b) => (b.ts || 0) - (a.ts || 0));
        resolve(rows);
      };
      request.onerror = () => reject(request.error || new Error('Could not read records'));
    });
  }

  async function addEntry(entry) {
    if (useMemoryStore) {
      const saved = { ...entry, id: memoryId++ };
      memoryEntries.push(saved);
      return saved.id;
    }
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const request = tx.objectStore(STORE_NAME).add(entry);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not save record'));
    });
  }

  async function putEntry(entry) {
    if (useMemoryStore) {
      const index = memoryEntries.findIndex((item) => item.id === entry.id);
      if (index >= 0) memoryEntries[index] = { ...entry };
      return entry.id;
    }
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const request = tx.objectStore(STORE_NAME).put(entry);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not update record'));
    });
  }

  async function deleteEntry(id) {
    if (useMemoryStore) {
      memoryEntries = memoryEntries.filter((entry) => entry.id !== id);
      return;
    }
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const request = tx.objectStore(STORE_NAME).delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('Could not delete record'));
    });
  }

  async function deleteEntriesByIds(ids) {
    const uniqueIds = [...new Set(ids)].filter((id) => id !== undefined && id !== null);
    if (uniqueIds.length === 0) return 0;
    if (useMemoryStore) {
      const idSet = new Set(uniqueIds);
      const before = memoryEntries.length;
      memoryEntries = memoryEntries.filter((entry) => !idSet.has(entry.id));
      return before - memoryEntries.length;
    }
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      uniqueIds.forEach((id) => store.delete(id));
      tx.oncomplete = () => resolve(uniqueIds.length);
      tx.onerror = () => reject(tx.error || new Error('Could not delete records'));
      tx.onabort = () => reject(tx.error || new Error('Delete was cancelled'));
    });
  }

  async function clearAllEntries() {
    if (useMemoryStore) {
      memoryEntries = [];
      return;
    }
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const request = tx.objectStore(STORE_NAME).clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('Could not clear records'));
    });
  }

  function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(',');
    if (parts.length !== 2) throw new Error('Invalid legacy image');
    const mimeMatch = parts[0].match(/data:([^;]+)/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  async function migrateLegacyEntries() {
    if (useMemoryStore) return;
    let raw = null;
    try {
      raw = localStorage.getItem(LEGACY_KEY);
    } catch (_) {
      return;
    }
    if (!raw) return;

    let legacyRows;
    try {
      legacyRows = JSON.parse(raw);
    } catch (_) {
      try { localStorage.removeItem(LEGACY_KEY); } catch (_) {}
      showToast('Skipped damaged legacy data');
      return;
    }

    if (!Array.isArray(legacyRows) || legacyRows.length === 0) {
      try { localStorage.removeItem(LEGACY_KEY); } catch (_) {}
      return;
    }

    const existing = await getEntries();
    if (existing.length > 0) {
      try { localStorage.removeItem(LEGACY_KEY); } catch (_) {}
      return;
    }

    let migrated = 0;
    for (const row of legacyRows) {
      try {
        if (!row || typeof row.img !== 'string') continue;
        const image = dataUrlToBlob(row.img);
        await addEntry({
          image,
          category: '',
          style: normalizeText(row.style).slice(0, 40),
          stall: normalizeText(row.stall).slice(0, 40),
          date: normalizeText(row.date),
          ts: Number(row.ts) || Date.now()
        });
        migrated += 1;
      } catch (_) {
        // Continue when one legacy row is damaged.
      }
    }

    try { localStorage.removeItem(LEGACY_KEY); } catch (_) {}
    if (migrated > 0) showToast(`Migrated ${migrated} old records`);
  }

  function revokeCurrentPreview() {
    if (currentPreviewUrl) {
      URL.revokeObjectURL(currentPreviewUrl);
      currentPreviewUrl = '';
    }
  }

  function clearRenderedObjectUrls() {
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.clear();
  }

  function setPreview(blob) {
    revokeCurrentPreview();
    currentImageBlob = blob;
    currentPreviewUrl = URL.createObjectURL(blob);
    preview.src = currentPreviewUrl;
    preview.hidden = false;
    placeholder.hidden = true;
    imgArea.classList.add('has-img');
  }

  function resetImage() {
    revokeCurrentPreview();
    currentImageBlob = null;
    preview.removeAttribute('src');
    preview.hidden = true;
    placeholder.hidden = false;
    imgArea.classList.remove('has-img');
    cameraInput.value = '';
    albumInput.value = '';
  }

  function clearForm() {
    resetImage();
    setToday();
    categoryInput.value = categories[0] || '';
    styleInput.value = styleOptions[0] || '';
    stallInput.value = stallOptions[0] || '';
    saveFormPreferences();
  }

  function loadImageElement(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Could not read image'));
      };
      image.src = url;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Image compression failed'));
      }, type, quality);
    });
  }

  async function prepareImage(file) {
    if (!file.type.startsWith('image/')) throw new Error('Please choose an image file');

    let source;
    let width;
    let height;
    let closeSource = null;

    if ('createImageBitmap' in window) {
      try {
        source = await createImageBitmap(file, { imageOrientation: 'from-image' });
        width = source.width;
        height = source.height;
        closeSource = () => source.close();
      } catch (_) {
        source = await loadImageElement(file);
        width = source.naturalWidth;
        height = source.naturalHeight;
      }
    } else {
      source = await loadImageElement(file);
      width = source.naturalWidth;
      height = source.naturalHeight;
    }

    if (!width || !height) throw new Error('Invalid image size');

    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
    if (closeSource) closeSource();

    const blob = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY);
    return blob.size < file.size ? blob : file;
  }

  function renderCategoryControls() {
    const fragment = document.createDocumentFragment();
    const allButton = document.createElement('button');
    allButton.className = 'category-chip active';
    allButton.type = 'button';
    allButton.dataset.value = '';
    allButton.textContent = 'All';
    allButton.addEventListener('click', () => {
      categoryFilter.value = '';
      renderEntries();
    });
    fragment.appendChild(allButton);

    categories.forEach((name) => {
      const button = document.createElement('button');
      button.className = 'category-chip';
      button.type = 'button';
      button.dataset.value = name;
      button.textContent = name;
      button.addEventListener('click', () => {
        categoryFilter.value = name;
        renderEntries();
      });
      fragment.appendChild(button);
    });

    const uncategorizedButton = document.createElement('button');
    uncategorizedButton.className = 'category-chip';
    uncategorizedButton.type = 'button';
    uncategorizedButton.dataset.value = '__uncategorized__';
    uncategorizedButton.textContent = 'Uncategorized';
    uncategorizedButton.addEventListener('click', () => {
      categoryFilter.value = '__uncategorized__';
      renderEntries();
    });
    fragment.appendChild(uncategorizedButton);

    categoryChips.replaceChildren(fragment);
  }

  function option(text, value) {
    const element = document.createElement('option');
    element.textContent = text;
    element.value = value;
    return element;
  }

  function renderFormOptionControls() {
    const categoryFragment = document.createDocumentFragment();
    categoryFragment.appendChild(option('', 'Uncategorized'));
    categories.forEach((name) => categoryFragment.appendChild(option(name, name)));
    categoryInput.replaceChildren(categoryFragment);
    if (!categories.includes(categoryInput.value)) categoryInput.value = categories[0] || '';

    const styleFragment = document.createDocumentFragment();
    styleOptions.forEach((name) => styleFragment.appendChild(option(name, name)));
    styleInput.replaceChildren(styleFragment);
    if (!styleOptions.includes(styleInput.value)) styleInput.value = styleOptions[0] || '';

    const stallFragment = document.createDocumentFragment();
    stallOptions.forEach((name) => stallFragment.appendChild(option(name, name)));
    stallInput.replaceChildren(stallFragment);
    if (!stallOptions.includes(stallInput.value)) stallInput.value = stallOptions[0] || '';
  }

  function openCategoryModal() {
    renderCategoryManager();
    categoryModal.hidden = false;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => newCategoryInput.focus(), 0);
  }

  function closeCategoryModal() {
    categoryModal.hidden = true;
    document.body.style.overflow = '';
  }

  function addCategory() {
    const name = normalizeCategoryName(newCategoryInput.value);
    if (!name) {
      showToast('Enter a category name');
      return;
    }
    if (categories.some((item) => item.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      showToast('That category already exists');
      return;
    }
    categories = [...categories, name];
    saveCategoriesToStorage();
    newCategoryInput.value = '';
    renderCategoryControls();
    renderFormOptionControls();
    renderCategoryManager();
    showToast('Category added');
    newCategoryInput.focus();
  }

  function renderCategoryManager() {
    const fragment = document.createDocumentFragment();
    categories.forEach((name, index) => {
      const row = document.createElement('div');
      row.className = 'category-row';

      const input = document.createElement('input');
      input.className = 'category-name';
      input.type = 'text';
      input.value = name;
      input.maxLength = 24;

      const upButton = document.createElement('button');
      upButton.className = 'row-action';
      upButton.type = 'button';
      upButton.textContent = ' - ';
      upButton.disabled = index === 0;
      upButton.addEventListener('click', () => moveCategory(index, -1));

      const downButton = document.createElement('button');
      downButton.className = 'row-action';
      downButton.type = 'button';
      downButton.textContent = ' - ';
      downButton.disabled = index === categories.length - 1;
      downButton.addEventListener('click', () => moveCategory(index, 1));

      const deleteButton = document.createElement('button');
      deleteButton.className = 'row-action delete';
      deleteButton.type = 'button';
      deleteButton.textContent = ' - ';
      deleteButton.addEventListener('click', () => deleteCategory(index));

      row.append(input, upButton, downButton, deleteButton);
      fragment.appendChild(row);
    });
    categoryManagerList.replaceChildren(fragment);
  }

  function moveCategory(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= categories.length) return;
    const next = [...categories];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    categories = next;
    saveCategoriesToStorage();
    renderCategoryControls();
    renderFormOptionControls();
    renderCategoryManager();
  }

  function deleteCategory(index) {
    const name = categories[index];
    const affected = allEntries.filter((entry) => normalizeText(entry.category) === name);
    if (!window.confirm(`Delete category "${name}"?${affected.length > 0 ? ` ${affected.length} record${affected.length === 1 ? '' : 's'} will become "Uncategorized".` : ''}`)) return;
    categories = categories.filter((_, i) => i !== index);
    saveCategoriesToStorage();
    renderCategoryControls();
    renderFormOptionControls();
    renderCategoryManager();
    showToast('Category deleted');
  }

  function getOptionConfig(type) {
    if (type === 'stall' || activeOptionType === 'stall') {
      return { label: 'Stall', field: 'stall', key: STALL_KEY, values: stallOptions, setValues: (v) => { stallOptions = v; } };
    }
    return { label: 'Style', field: 'style', key: STYLE_KEY, values: styleOptions, setValues: (v) => { styleOptions = v; } };
  }

  function renderOptionManager() {
    const config = getOptionConfig();
    const fragment = document.createDocumentFragment();
    config.values.forEach((name, index) => {
      const row = document.createElement('div');
      row.className = 'category-row';

      const input = document.createElement('input');
      input.className = 'category-name';
      input.type = 'text';
      input.value = name;
      input.maxLength = 40;

      const renameButton = document.createElement('button');
      renameButton.className = 'row-action';
      renameButton.type = 'button';
      renameButton.textContent = '?';
      renameButton.addEventListener('click', () => renameManagedOption(config.field, name, input.value));

      const upButton = document.createElement('button');
      upButton.className = 'row-action';
      upButton.type = 'button';
      upButton.textContent = ' - ';
      upButton.disabled = index === 0;
      upButton.addEventListener('click', () => moveManagedOption(config.field, index, -1));

      const downButton = document.createElement('button');
      downButton.className = 'row-action';
      downButton.type = 'button';
      downButton.textContent = ' - ';
      downButton.disabled = index === config.values.length - 1;
      downButton.addEventListener('click', () => moveManagedOption(config.field, index, 1));

      const deleteButton = document.createElement('button');
      deleteButton.className = 'row-action delete';
      deleteButton.type = 'button';
      deleteButton.textContent = ' - ';
      deleteButton.addEventListener('click', () => deleteManagedOption(config.field, name));

      row.append(input, renameButton, upButton, downButton, deleteButton);
      fragment.appendChild(row);
    });
    optionManagerList.replaceChildren(fragment);
  }

  async function renameManagedOption(field, oldName, newName) {
    const name = normalizeOptionName(newName);
    if (!name || name === oldName) return;
    const config = getOptionConfig(field);
    if (config.values.some((item) => item.toLocaleLowerCase() === name.toLocaleLowerCase() && item !== oldName)) {
      showToast('That option already exists');
      return;
    }
    try {
      const next = config.values.map((item) => (item === oldName ? name : item));
      config.setValues(next);
      saveOptionList(config.key, next);
      for (const entry of allEntries) {
        if (normalizeText(entry[field]) === oldName) {
          await putEntry({ ...entry, [field]: name });
        }
      }
      await loadEntries();
      renderOptionManager();
      showToast(`${config.label} option renamed`);
    } catch (error) {
      showToast(error.message || 'Rename failed');
    }
  }

  function moveManagedOption(field, index, direction) {
    const newIndex = index + direction;
    const config = getOptionConfig(field);
    if (newIndex < 0 || newIndex >= config.values.length) return;
    const next = [...config.values];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    config.setValues(next);
    saveOptionList(config.key, next);
    renderFormOptionControls();
    renderOptionManager();
  }

  async function deleteManagedOption(type, name) {
    const config = getOptionConfig(type);
    const affected = allEntries.filter((entry) => normalizeText(entry[config.field]) === name);
    const detail = affected.length
      ? ` ${affected.length} saved record${affected.length === 1 ? '' : 's'} will have an empty ${config.label.toLowerCase()} field.`
      : '';
    if (!window.confirm(`Delete "${name}"?${detail}`)) return;

    try {
      const next = config.values.filter((item) => item !== name);
      config.setValues(next);
      saveOptionList(config.key, next);
      for (const entry of affected) {
        await putEntry({ ...entry, [config.field]: '' });
      }
      await loadEntries();
      renderOptionManager();
      showToast(`${config.label} option deleted`);
    } catch (error) {
      styleOptions = loadOptionList(STYLE_KEY, DEFAULT_STYLES);
      stallOptions = loadOptionList(STALL_KEY, DEFAULT_STALLS);
      renderFormOptionControls();
      renderOptionManager();
      showToast(error.message || 'Delete failed');
    }
  }

  function addManagedOption() {
    const config = getOptionConfig();
    const name = normalizeOptionName(newOptionInput.value);
    if (!name) {
      showToast(`Enter a ${config.label.toLowerCase()} option`);
      return;
    }
    if (config.values.some((item) => item.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      showToast('That option already exists');
      return;
    }
    const next = [...config.values, name];
    config.setValues(next);
    saveOptionList(config.key, next);
    newOptionInput.value = '';
    renderFormOptionControls();
    if (activeOptionType === 'style') styleInput.value = name;
    else stallInput.value = name;
    saveFormPreferences();
    renderOptionManager();
    showToast(`${config.label} option added`);
    newOptionInput.focus();
  }

  function setActiveOptionType(type) {
    activeOptionType = type === 'stall' ? 'stall' : 'style';
    renderOptionManager();
  }

  function openOptionModal(type) {
    setActiveOptionType(type);
    optionModal.hidden = false;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => newOptionInput.focus(), 0);
  }

  function closeOptionModal() {
    optionModal.hidden = true;
    document.body.style.overflow = '';
  }

  function mergeOptionsFromEntries() {
    const styles = uniqueSortedValues(allEntries, 'style');
    const stalls = uniqueSortedValues(allEntries, 'stall');
    styleOptions = dedupeOptions([...styleOptions, ...styles]);
    stallOptions = dedupeOptions([...stallOptions, ...stalls]);
    saveOptionList(STYLE_KEY, styleOptions);
    saveOptionList(STALL_KEY, stallOptions);
  }

  function uniqueSortedValues(entries, key) {
    return [...new Set(entries.map((entry) => normalizeText(entry[key])).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' }));
  }

  function fillFilterOptions(select, values, emptyLabel) {
    const currentValue = select.value;
    const fragment = document.createDocumentFragment();
    fragment.appendChild(option('', emptyLabel));
    values.forEach((value) => fragment.appendChild(option(value, value)));
    select.replaceChildren(fragment);
    select.value = values.includes(currentValue) ? currentValue : '';
  }

  function refreshFilterOptions() {
    mergeOptionsFromEntries();
    renderFormOptionControls();
    fillFilterOptions(stallFilter, uniqueSortedValues(allEntries, 'stall'), 'All Stalls');
    fillFilterOptions(styleFilter, uniqueSortedValues(allEntries, 'style'), 'All Styles');
    renderCategoryControls();
  }

  function getFilteredEntries(entries) {
    const selectedCategory = categoryFilter.value;
    const selectedStall = stallFilter.value;
    const selectedStyle = styleFilter.value;
    const selectedDate = dateFilter.value;
    const selectedExportStatus = exportStatusFilter.value;

    return entries.filter((entry) => {
      const entryCategory = normalizeText(entry.category);
      if (selectedCategory === '__uncategorized__' && entryCategory) return false;
      if (selectedCategory && selectedCategory !== '__uncategorized__' && entryCategory !== selectedCategory) return false;
      if (selectedStall && normalizeText(entry.stall) !== selectedStall) return false;
      if (selectedStyle && normalizeText(entry.style) !== selectedStyle) return false;
      if (selectedDate && normalizeText(entry.date) !== selectedDate) return false;
      if (selectedExportStatus === 'pending' && entry.exportedAt) return false;
      if (selectedExportStatus === 'exported' && !entry.exportedAt) return false;
      return true;
    });
  }

  function hasActiveFilters() {
    return Boolean(categoryFilter.value || stallFilter.value || styleFilter.value || dateFilter.value || exportStatusFilter.value);
  }

  function updateFilterStatus(filteredCount, totalCount) {
    const activeLabels = [];
    if (categoryFilter.value) {
      activeLabels.push(`Category: ${categoryFilter.value === '__uncategorized__' ? 'Uncategorized' : categoryFilter.value}`);
    }
    if (stallFilter.value) activeLabels.push(`Stall: ${stallFilter.value}`);
    if (styleFilter.value) activeLabels.push(`Style: ${styleFilter.value}`);
    if (dateFilter.value) activeLabels.push(`Date: ${dateFilter.value}`);
    if (exportStatusFilter.value) activeLabels.push(exportStatusFilter.value === 'pending' ? '未导出' : '已导出');

    filterStatus.textContent = activeLabels.length
      ? `${activeLabels.join('  -  ')}  -  ${filteredCount} result${filteredCount === 1 ? '' : 's'}`
      : `Showing all ${totalCount} record${totalCount === 1 ? '' : 's'}`;
  }

  function makeTag(text, className) {
    const tag = document.createElement('span');
    tag.className = `tag${className ? ` ${className}` : ''}`;
    tag.textContent = text || 'Uncategorized';
    return tag;
  }

  function renderEmptyState(isFiltered) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = isFiltered
      ? 'No matching photos  -  try another filter ?'
      : 'No photos yet  -  add your first one ?';
    entryList.appendChild(empty);
  }

  function renderEntries() {
    clearRenderedObjectUrls();
    entryList.replaceChildren();

    const data = getFilteredEntries(allEntries);
    const filtered = hasActiveFilters();
    entryCount.textContent = filtered
      ? `${data.length}/${allEntries.length} RECORDS`
      : `${allEntries.length} RECORD${allEntries.length === 1 ? '' : 'S'}`;
    updateFilterStatus(data.length, allEntries.length);

    [...categoryChips.querySelectorAll('.category-chip')].forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.value === categoryFilter.value);
    });

    if (data.length === 0) {
      renderEmptyState(filtered);
      return;
    }

    const fragment = document.createDocumentFragment();

    data.forEach((entry) => {
      const card = document.createElement('article');
      card.className = 'entry';

      const thumb = document.createElement('div');
      thumb.className = 'entry-thumb';

      const image = document.createElement('img');
      image.alt = `${entry.category || entry.style || 'Photo'} record`;
      image.loading = 'lazy';
      const imageBlob = entry.image instanceof Blob ? entry.image : null;
      if (imageBlob) {
        const url = URL.createObjectURL(imageBlob);
        objectUrls.add(url);
        image.src = url;
      }

      const deleteButton = document.createElement('button');
      deleteButton.className = 'delete-btn';
      deleteButton.type = 'button';
      deleteButton.setAttribute('aria-label', `Delete record from ${entry.date || 'unknown date'}`);
      deleteButton.textContent = ' - ';
      deleteButton.addEventListener('click', async () => {
        if (!window.confirm('Delete this photo record?')) return;
        deleteButton.disabled = true;
        try {
          await deleteEntry(entry.id);
          await loadEntries();
          showToast('Record deleted');
        } catch (error) {
          deleteButton.disabled = false;
          showToast(error.message || 'Delete failed');
        }
      });

      thumb.append(image, deleteButton);

      const info = document.createElement('div');
      info.className = 'entry-info';

      const categoryRow = document.createElement('div');
      categoryRow.className = 'tag-row';
      categoryRow.appendChild(makeTag(normalizeText(entry.category) || 'Uncategorized', 'category'));

      const detailRow = document.createElement('div');
      detailRow.className = 'tag-row';
      detailRow.appendChild(makeTag(entry.style || 'No style'));
      detailRow.appendChild(makeTag(entry.stall || 'No stall', 'stall'));

      const date = document.createElement('div');
      date.className = 'entry-date';
      date.textContent = `? ${entry.date || 'No date'}`;

      info.append(categoryRow, detailRow, date);
      card.append(thumb, info);
      fragment.appendChild(card);
    });

    entryList.appendChild(fragment);
  }

  async function loadEntries() {
    try {
      allEntries = await getEntries();
      refreshFilterOptions();
      renderEntries();
    } catch (error) {
      allEntries = [];
      entryList.replaceChildren();
      renderEmptyState(false);
      entryCount.textContent = 'ERROR';
      filterStatus.textContent = 'Filters unavailable';
      showToast(error.message || 'Could not read records');
    }
  }

  function effectiveEntryDate(entry) {
    const value = normalizeText(entry.date);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const timestamp = Number(entry.ts);
    return Number.isFinite(timestamp) ? localDateValue(new Date(timestamp)) : '';
  }

  function entriesInDateRange(from, to) {
    if (!from || !to || from > to) return [];
    return allEntries.filter((entry) => {
      const date = effectiveEntryDate(entry);
      return date && date >= from && date <= to;
    });
  }

  function formatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (value < 1024 * 1024) return `${Math.max(0, value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  function totalStoredBytes(entries = allEntries) {
    return entries.reduce((sum, entry) => {
      const image = entry.image instanceof Blob ? entry.image : null;
      return sum + (image ? image.size : 0);
    }, 0);
  }

  function updateCleanupSummary() {
    const from = cleanupFrom.value;
    const to = cleanupTo.value;
    const selected = entriesInDateRange(from, to);
    const totalText = `${allEntries.length} saved  -  ${formatBytes(totalStoredBytes())}`;
    if (!from || !to) {
      cleanupSummary.textContent = `Choose both dates  -  ${totalText}`;
      deleteRangeBtn.disabled = true;
      return;
    }
    if (from > to) {
      cleanupSummary.textContent = `Start date must be before end date  -  ${totalText}`;
      deleteRangeBtn.disabled = true;
      return;
    }
    cleanupSummary.textContent = `${selected.length} photo${selected.length === 1 ? '' : 's'} selected  -  ${formatBytes(totalStoredBytes(selected))}  -  ${totalText}`;
    deleteRangeBtn.disabled = selected.length === 0;
  }

  function loadRetentionSetting() {
    try {
      const value = Number(localStorage.getItem(RETENTION_KEY) || 0);
      return [0, 30, 60, 90, 180].includes(value) ? value : 0;
    } catch (_) {
      return 0;
    }
  }

  function openCleanupModal() {
    const dates = allEntries.map(effectiveEntryDate).filter(Boolean).sort();
    cleanupFrom.value = dates[0] || localDateValue(new Date());
    cleanupTo.value = dates[dates.length - 1] || localDateValue(new Date());
    retentionDays.value = String(loadRetentionSetting());
    updateCleanupSummary();
    cleanupModal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeCleanupModal() {
    cleanupModal.hidden = true;
    document.body.style.overflow = '';
  }

  async function deleteSelectedRange() {
    const from = cleanupFrom.value;
    const to = cleanupTo.value;
    const matches = entriesInDateRange(from, to);
    if (!from || !to || from > to || matches.length === 0) {
      updateCleanupSummary();
      return;
    }
    if (!window.confirm(`Delete ${matches.length} photo record${matches.length === 1 ? '' : 's'} from ${from} through ${to}?`)) return;
    deleteRangeBtn.disabled = true;
    try {
      await deleteEntriesByIds(matches.map((entry) => entry.id));
      await loadEntries();
      updateCleanupSummary();
      showToast(`${matches.length} records deleted`);
    } catch (error) {
      showToast(error.message || 'Range cleanup failed');
    } finally {
      updateCleanupSummary();
    }
  }

  async function deleteEveryRecord() {
    if (allEntries.length === 0) return;
    if (!window.confirm(`Delete all ${allEntries.length} saved photo records? This cannot be undone.`)) return;
    deleteAllBtn.disabled = true;
    try {
      await clearAllEntries();
      await loadEntries();
      updateCleanupSummary();
      showToast('All records deleted');
    } catch (error) {
      showToast(error.message || 'Delete all failed');
    } finally {
      deleteAllBtn.disabled = false;
    }
  }

  function saveRetentionSetting() {
    const days = Number(retentionDays.value) || 0;
    try {
      localStorage.setItem(RETENTION_KEY, String(days));
      localStorage.removeItem(AUTO_CLEAN_LAST_KEY);
    } catch (_) {}
    showToast(days ? `Auto cleanup: keep ${days} days` : 'Auto cleanup turned off');
  }

  async function runAutoCleanup() {
    const days = loadRetentionSetting();
    if (!days || allEntries.length === 0) return 0;
    const today = localDateValue(new Date());
    try {
      if (localStorage.getItem(AUTO_CLEAN_LAST_KEY) === today) return 0;
    } catch (_) {}

    const cutoffDate = new Date();
    cutoffDate.setHours(12, 0, 0, 0);
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoff = localDateValue(cutoffDate);
    const oldEntries = allEntries.filter((entry) => {
      const date = effectiveEntryDate(entry);
      return date && date < cutoff;
    });

    if (oldEntries.length > 0) {
      await deleteEntriesByIds(oldEntries.map((entry) => entry.id));
    }
    try { localStorage.setItem(AUTO_CLEAN_LAST_KEY, today); } catch (_) {}
    return oldEntries.length;
  }

  function openAlbumPicker() {
    albumInput.value = '';
    albumInput.click();
  }

  function openCameraPicker() {
    cameraInput.value = '';
    cameraInput.click();
  }

  async function handleSelectedPhoto(event) {
    const input = event.currentTarget;
    const file = input.files && input.files[0];
    if (!file) return;

    imgArea.setAttribute('aria-busy', 'true');
    cameraBtn.disabled = true;
    albumBtn.disabled = true;
    try {
      const compressed = await prepareImage(file);
      setPreview(compressed);
      showToast('Photo loaded');
    } catch (error) {
      showToast(error.message || 'Could not read photo');
    } finally {
      input.value = '';
      cameraBtn.disabled = false;
      albumBtn.disabled = false;
      imgArea.removeAttribute('aria-busy');
    }
  }

  imgArea.addEventListener('click', openAlbumPicker);
  imgArea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openAlbumPicker();
    }
  });
  cameraBtn.addEventListener('click', openCameraPicker);
  albumBtn.addEventListener('click', openAlbumPicker);
  cameraInput.addEventListener('change', handleSelectedPhoto);
  albumInput.addEventListener('change', handleSelectedPhoto);

  saveBtn.addEventListener('click', async () => {
    if (!currentImageBlob) {
      showToast('Add a photo first');
      return;
    }

    const category = normalizeText(categoryInput.value);
    const style = normalizeText(styleInput.value);
    const stall = normalizeText(stallInput.value);
    const date = dateInput.value;

    if (!style || !stall || !date) {
      showToast('Choose Style, Stall and Date');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const newEntry = {
        image: currentImageBlob,
        category,
        style,
        stall,
        date,
        ts: Date.now()
      };
      const hiddenByCurrentFilters = hasActiveFilters() && getFilteredEntries([newEntry]).length === 0;
      await addEntry(newEntry);
      saveFormPreferences();
      resetImage();
      await loadEntries();
      showToast(hiddenByCurrentFilters ? 'Saved - hidden by current filters' : 'Saved');
    } catch (error) {
      if (error && error.name === 'QuotaExceededError') showToast('Device storage is full');
      else showToast(error.message || 'Save failed');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    }
  });

  clearBtn.addEventListener('click', () => {
    clearForm();
    showToast('Form cleared');
  });

  [categoryInput, styleInput, stallInput].forEach((control) => {
    control.addEventListener('change', saveFormPreferences);
  });

  [categoryFilter, stallFilter, styleFilter, dateFilter, exportStatusFilter].forEach((control) => {
    control.addEventListener('change', renderEntries);
  });

  resetFiltersBtn.addEventListener('click', () => {
    categoryFilter.value = '';
    stallFilter.value = '';
    styleFilter.value = '';
    dateFilter.value = '';
    exportStatusFilter.value = '';
    renderEntries();
    showToast('Filters reset');
  });

  manageCategoriesBtn.addEventListener('click', openCategoryModal);
  editCategoriesLink.addEventListener('click', openCategoryModal);
  closeCategoryModalBtn.addEventListener('click', closeCategoryModal);
  categoryModal.addEventListener('click', (event) => {
    if (event.target === categoryModal) closeCategoryModal();
  });
  addCategoryBtn.addEventListener('click', addCategory);
  newCategoryInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') addCategory();
  });

  manageStylesBtn.addEventListener('click', () => openOptionModal('style'));
  manageStallsBtn.addEventListener('click', () => openOptionModal('stall'));
  closeOptionModalBtn.addEventListener('click', closeOptionModal);
  optionModal.addEventListener('click', (event) => {
    if (event.target === optionModal) closeOptionModal();
  });
  styleOptionTab.addEventListener('click', () => setActiveOptionType('style'));
  stallOptionTab.addEventListener('click', () => setActiveOptionType('stall'));
  addOptionBtn.addEventListener('click', addManagedOption);
  newOptionInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') addManagedOption();
  });

  openCleanupBtn.addEventListener('click', openCleanupModal);
  closeCleanupModalBtn.addEventListener('click', closeCleanupModal);
  cleanupModal.addEventListener('click', (event) => {
    if (event.target === cleanupModal) closeCleanupModal();
  });
  cleanupFrom.addEventListener('change', updateCleanupSummary);
  cleanupTo.addEventListener('change', updateCleanupSummary);
  deleteRangeBtn.addEventListener('click', deleteSelectedRange);
  deleteAllBtn.addEventListener('click', deleteEveryRecord);
  saveRetentionBtn.addEventListener('click', saveRetentionSetting);

  openExportBtn.addEventListener('click', openExportModal);
  closeExportModalBtn.addEventListener('click', closeExportModal);
  exportModal.addEventListener('click', (event) => {
    if (event.target === exportModal) closeExportModal();
  });
  exportExcelBtn.addEventListener('click', () => exportExcelWithImages(getFilteredEntries(allEntries)));

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!categoryModal.hidden) closeCategoryModal();
    if (!optionModal.hidden) closeOptionModal();
    if (!cleanupModal.hidden) closeCleanupModal();
    if (!exportModal.hidden) closeExportModal();
  });

  window.addEventListener('beforeunload', () => {
    revokeCurrentPreview();
    clearRenderedObjectUrls();
  });

  async function init() {
    setToday();
    renderCategoryControls();
    renderFormOptionControls();
    try {
      await openDatabase();
      await migrateLegacyEntries();
    } catch (_) {
      useMemoryStore = true;
      dbPromise = null;
      showToast('Preview mode  -  records reset after refresh');
    }
    await loadEntries();
    applyFormPreferences();
    const autoDeleted = await runAutoCleanup();
    if (autoDeleted > 0) {
      await loadEntries();
      applyFormPreferences();
      showToast(`Auto cleanup removed ${autoDeleted} old records`);
    }
  }

  init();
})();
