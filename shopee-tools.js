(function () {
  'use strict';

  const SETTINGS_KEY = 'picture_drawer_shopee_tools_v1';
  const DEFAULTS = {
    site: 'TH',
    profiles: {
      TH: { currency: 'THB', fx: 5.15, saleFee: 8, paymentFee: 3, serviceFee: 0, feeTax: 7 },
      VN: { currency: 'VND', fx: 3500, saleFee: 8, paymentFee: 5, serviceFee: 0, feeTax: 0 }
    },
    holidays: { TH: [], VN: [] }
  };

  const style = document.createElement('style');
  style.textContent = `
    .business-tools { margin-top:24px; padding:14px; }
    .tool-launchers { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .tool-launch { min-height:54px; border:3px solid var(--line); box-shadow:4px 4px 0 var(--line); cursor:pointer; font-family:var(--pixel-font); font-size:12px; font-weight:900; color:var(--line); }
    .tool-launch.dts { background:var(--mint); } .tool-launch.cost { background:var(--yellow); }
    .tool-tabs { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:13px; }
    .tool-tab { min-height:42px; border:3px solid var(--line); background:var(--panel-2); color:var(--ink); font-family:var(--pixel-font); font-size:11px; font-weight:900; cursor:pointer; }
    .tool-tab.active { background:var(--mint); color:var(--line); }
    .tool-panel { display:grid; gap:11px; }
    .tool-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .tool-field { display:grid; gap:5px; min-width:0; }
    .tool-field.full { grid-column:1/-1; }
    .tool-field label { color:var(--muted); font-family:var(--pixel-font); font-size:9px; font-weight:900; }
    .tool-control { width:100%; min-width:0; height:43px; color:var(--ink); background:var(--field); border:3px solid var(--line); padding:0 9px; outline:none; color-scheme:dark; }
    .tool-control:focus { border-color:var(--mint); }
    .tool-result { padding:13px; border:3px solid var(--line); background:var(--field); box-shadow:3px 3px 0 var(--line); }
    .tool-result small { color:var(--muted); font-family:var(--pixel-font); font-size:9px; }
    .tool-result strong { display:block; margin-top:5px; color:var(--yellow); font-family:var(--pixel-font); font-size:20px; }
    .tool-result p { margin-top:8px; color:var(--ink); font-size:11px; line-height:1.6; }
    .metric-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:9px; }
    .metric { padding:8px; border:2px solid var(--line); background:var(--panel-2); }
    .metric b { display:block; margin-top:3px; color:var(--mint); font-family:var(--pixel-font); font-size:13px; }
    .tool-note { color:var(--muted); font-family:var(--pixel-font); font-size:9px; line-height:1.55; }
    @media(max-width:430px){ .tool-grid { grid-template-columns:1fr; } .tool-field.full { grid-column:auto; } }
  `;
  document.head.appendChild(style);

  const tools = document.createElement('section');
  tools.className = 'pixel-card business-tools';
  tools.innerHTML = `
    <div class="section-heading">
      <h2 class="section-title">鈻?SHOPEE TOOLS</h2>
      <span class="tool-note">TH / VN</span>
    </div>
    <div class="tool-launchers">
      <button class="tool-launch dts" id="openDtsTool" type="button">鈻?DTS 鏌ヨ</button>
      <button class="tool-launch cost" id="openCostTool" type="button">楼 鎴愭湰璁＄畻</button>
    </div>`;
  const entries = document.querySelector('.entries');
  entries.parentNode.insertBefore(tools, entries);

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.id = 'shopeeToolsModal';
  modal.hidden = true;
  modal.innerHTML = `
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="shopeeToolsTitle">
      <div class="modal-head">
        <h2 class="modal-title" id="shopeeToolsTitle">Shopee Tools</h2>
        <button class="modal-close" type="button" id="closeShopeeTools" aria-label="Close">脳</button>
      </div>
      <div class="modal-body">
        <div class="tool-tabs">
          <button class="tool-tab active" type="button" data-tool="dts">鈻?DTS 鏌ヨ</button>
          <button class="tool-tab" type="button" data-tool="cost">楼 鎴愭湰璁＄畻</button>
        </div>
        <div class="tool-panel" id="dtsToolPanel">
          <div class="tool-grid">
            <div class="tool-field"><label>绔欑偣</label><select class="tool-control" id="dtsSite"><option value="TH">娉板浗 TH</option><option value="VN">瓒婂崡 VN</option></select></div>
            <div class="tool-field"><label>浠樻纭鏃堕棿</label><input class="tool-control" id="dtsStart" type="datetime-local"></div>
            <div class="tool-field"><label>DTS 宸ヤ綔鏃?/label><input class="tool-control" id="dtsDays" type="number" min="1" max="30" value="1"></div>
            <div class="tool-field"><label>棰濆浼戞伅鏃?/label><input class="tool-control" id="dtsHoliday" type="date"></div>
          </div>
          <div class="tool-result"><small>SHIP-BY DATE</small><strong id="dtsResult">鈥?/strong><p id="dtsBreakdown">杈撳叆璁㈠崟鏃堕棿鍜?DTS 鍚庤嚜鍔ㄨ绠椼€?/p></div>
          <p class="tool-note">鎸夊伐浣滄棩鎺ㄧ畻锛岃嚜鍔ㄦ帓闄ゅ懆鍏€佸懆鏃ュ強浣犱繚瀛樼殑棰濆浼戞伅鏃ャ€係hopee 娲诲姩鏈熸垨鐗╂祦鍟嗙壒娈婂畨鎺掑簲浠?Seller Centre 鏄剧ず鐨勬埅姝㈡椂闂翠负鍑嗐€?/p>
        </div>
        <div class="tool-panel" id="costToolPanel" hidden>
          <div class="tool-grid">
            <div class="tool-field"><label>绔欑偣</label><select class="tool-control" id="costSite"><option value="TH">娉板浗 TH / THB</option><option value="VN">瓒婂崡 VN / VND</option></select></div>
            <div class="tool-field"><label>閿€鍞环锛堝綋鍦板竵锛?/label><input class="tool-control" id="salePrice" type="number" min="0" step="0.01" value="0"></div>
            <div class="tool-field"><label>鍗栧鎶樻墸锛堝綋鍦板竵锛?/label><input class="tool-control" id="sellerDiscount" type="number" min="0" step="0.01" value="0"></div>
            <div class="tool-field"><label>涔板瀹炰粯杩愯垂锛堝綋鍦板竵锛?/label><input class="tool-control" id="buyerShipping" type="number" min="0" step="0.01" value="0"></div>
            <div class="tool-field"><label>璐у搧鎴愭湰锛圕NY锛?/label><input class="tool-control" id="productCost" type="number" min="0" step="0.01" value="0"></div>
            <div class="tool-field"><label>澶寸▼/鍖呮潗锛圕NY锛?/label><input class="tool-control" id="chinaLogistics" type="number" min="0" step="0.01" value="0"></div>
            <div class="tool-field"><label>灏剧▼/鍏朵粬锛堝綋鍦板竵锛?/label><input class="tool-control" id="localLogistics" type="number" min="0" step="0.01" value="0"></div>
            <div class="tool-field"><label>姹囩巼锛? CNY = 褰撳湴甯?/label><input class="tool-control rate" id="fxRate" type="number" min="0.0001" step="0.0001"></div>
            <div class="tool-field"><label>閿€鍞垂 %</label><input class="tool-control rate" id="saleFee" type="number" min="0" max="100" step="0.01"></div>
            <div class="tool-field"><label>鏀粯浜ゆ槗璐?%</label><input class="tool-control rate" id="paymentFee" type="number" min="0" max="100" step="0.01"></div>
            <div class="tool-field"><label>娲诲姩/鏈嶅姟璐?%</label><input class="tool-control rate" id="serviceFee" type="number" min="0" max="100" step="0.01"></div>
            <div class="tool-field"><label>骞冲彴璐圭◣鐜?%</label><input class="tool-control rate" id="feeTax" type="number" min="0" max="100" step="0.01"></div>
          </div>
          <div class="tool-result"><small>棰勮鍗曚欢鍒╂鼎</small><strong id="profitResult">楼0.00</strong><div class="metric-grid" id="costMetrics"></div></div>
          <p class="tool-note">璐圭巼浼氫繚瀛樺湪鏈満銆傞粯璁ゅ€煎彧鐢ㄤ簬璧锋锛岃鎸?Seller Centre 鏈€鏂拌垂鐜囥€佸晢鍝佺被鐩強鍙傚姞鐨勬椿鍔ㄦ洿鏂帮紱鏈€缁堜互璁㈠崟鏀跺叆鏄庣粏涓哄噯銆?/p>
        </div>
      </div>
    </section>`;
  document.body.appendChild(modal);

  const $ = (id) => document.getElementById(id);
  const n = (id) => Math.max(0, Number($(id).value) || 0);
  let state = loadState();

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      return {
        ...DEFAULTS,
        ...saved,
        profiles: { TH: { ...DEFAULTS.profiles.TH, ...(saved.profiles?.TH || {}) }, VN: { ...DEFAULTS.profiles.VN, ...(saved.profiles?.VN || {}) } },
        holidays: { TH: saved.holidays?.TH || [], VN: saved.holidays?.VN || [] }
      };
    } catch (_) { return structuredClone(DEFAULTS); }
  }

  function saveState() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function localInputNow() {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  }

  function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function calculateDts() {
    const site = $('dtsSite').value;
    const start = new Date($('dtsStart').value);
    const days = Math.max(1, Math.min(30, Math.floor(n('dtsDays') || 1)));
    if (Number.isNaN(start.getTime())) return;
    const holidays = new Set(state.holidays[site] || []);
    const date = new Date(start);
    let counted = 0;
    let skipped = 0;
    while (counted < days) {
      date.setDate(date.getDate() + 1);
      const weekend = date.getDay() === 0 || date.getDay() === 6;
      if (weekend || holidays.has(dateKey(date))) skipped += 1;
      else counted += 1;
    }
    $('dtsResult').textContent = `${date.toLocaleDateString('zh-CN')} 路 ${date.toLocaleDateString('en-US', { weekday: 'short' })}`;
    $('dtsBreakdown').textContent = `${site} 路 ${days} 涓伐浣滄棩 路 璺宠繃 ${skipped} 涓懆鏈?浼戞伅鏃?路 璇峰湪褰撳ぉ骞冲彴鎴鏃堕棿鍓嶅畬鎴愪氦杩愭壂鎻忋€俙;
  }

  function addHoliday() {
    const site = $('dtsSite').value;
    const value = $('dtsHoliday').value;
    if (!value) return;
    state.holidays[site] = [...new Set([...(state.holidays[site] || []), value])].sort();
    saveState();
    calculateDts();
    $('dtsHoliday').value = '';
  }

  function loadProfile() {
    const profile = state.profiles[$('costSite').value];
    $('fxRate').value = profile.fx;
    $('saleFee').value = profile.saleFee;
    $('paymentFee').value = profile.paymentFee;
    $('serviceFee').value = profile.serviceFee;
    $('feeTax').value = profile.feeTax;
    calculateCost();
  }

  function calculateCost() {
    const site = $('costSite').value;
    const profile = state.profiles[site];
    profile.fx = n('fxRate') || profile.fx;
    profile.saleFee = n('saleFee');
    profile.paymentFee = n('paymentFee');
    profile.serviceFee = n('serviceFee');
    profile.feeTax = n('feeTax');
    saveState();

    const priceBase = Math.max(0, n('salePrice') - n('sellerDiscount'));
    const paymentBase = priceBase + n('buyerShipping');
    const saleFee = priceBase * profile.saleFee / 100;
    const paymentFee = paymentBase * profile.paymentFee / 100;
    const serviceFee = priceBase * profile.serviceFee / 100;
    const feesBeforeTax = saleFee + paymentFee + serviceFee;
    const feeTax = feesBeforeTax * profile.feeTax / 100;
    const platformFees = feesBeforeTax + feeTax;
    const localNet = priceBase + n('buyerShipping') - platformFees - n('localLogistics');
    const cnyNet = localNet / profile.fx;
    const totalCnyCost = n('productCost') + n('chinaLogistics');
    const profit = cnyNet - totalCnyCost;
    const margin = priceBase > 0 ? profit / (priceBase / profile.fx) * 100 : 0;
    const roi = totalCnyCost > 0 ? profit / totalCnyCost * 100 : 0;

    $('profitResult').textContent = `${profit >= 0 ? '' : '鈭?}楼${Math.abs(profit).toFixed(2)}`;
    $('profitResult').style.color = profit >= 0 ? 'var(--mint)' : 'var(--danger)';
    $('costMetrics').innerHTML = `
      <div class="metric"><small>骞冲彴璐?/small><b>${profile.currency} ${platformFees.toFixed(2)}</b></div>
      <div class="metric"><small>鍑€鍥炴</small><b>楼${cnyNet.toFixed(2)}</b></div>
      <div class="metric"><small>鍒╂鼎鐜?/small><b>${margin.toFixed(1)}%</b></div>
      <div class="metric"><small>鎴愭湰鍥炴姤鐜?/small><b>${roi.toFixed(1)}%</b></div>`;
  }

  function switchTool(name) {
    document.querySelectorAll('.tool-tab').forEach((button) => button.classList.toggle('active', button.dataset.tool === name));
    $('dtsToolPanel').hidden = name !== 'dts';
    $('costToolPanel').hidden = name !== 'cost';
  }

  function openTool(name) {
    switchTool(name);
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    if (name === 'dts') calculateDts();
    else loadProfile();
  }

  function closeTool() {
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  $('dtsStart').value = localInputNow();
  $('dtsSite').value = state.site || 'TH';
  $('costSite').value = state.site || 'TH';
  $('openDtsTool').addEventListener('click', () => openTool('dts'));
  $('openCostTool').addEventListener('click', () => openTool('cost'));
  $('closeShopeeTools').addEventListener('click', closeTool);
  modal.addEventListener('click', (event) => { if (event.target === modal) closeTool(); });
  document.querySelectorAll('.tool-tab').forEach((button) => button.addEventListener('click', () => switchTool(button.dataset.tool)));
  ['dtsSite', 'dtsStart', 'dtsDays'].forEach((id) => $(id).addEventListener('change', calculateDts));
  $('dtsHoliday').addEventListener('change', addHoliday);
  $('costSite').addEventListener('change', () => { state.site = $('costSite').value; saveState(); loadProfile(); });
  document.querySelectorAll('#costToolPanel input').forEach((input) => input.addEventListener('input', calculateCost));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) closeTool(); });
})();

