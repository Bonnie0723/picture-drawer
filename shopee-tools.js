(function () {
  'use strict';

  const SETTINGS_KEY = 'picture_drawer_shopee_tools_v2';
  const DEFAULTS = {
    site: 'TH',
    profiles: {
      TH: { currency: 'THB', fx: 4.779, saleFee: 22.47, paymentFee: 3.21, serviceFee: 5, feeTax: 7, withdrawRate: 0 }
    },
    holidays: { TH: [] }
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
    .mode-badge { display:inline-block; padding:2px 6px; background:var(--panel-2); border:2px solid var(--line); font-family:var(--pixel-font); font-size:9px; color:var(--yellow); margin-left:6px; }
    .formula-row { display:flex; justify-content:space-between; gap:8px; padding:4px 0; border-bottom:1px dashed #3a3545; font-size:10px; }
    .formula-row:last-child { border-bottom:none; }
    .formula-label { color:var(--muted); }
    .formula-value { color:var(--mint); font-family:var(--pixel-font); }
    @media(max-width:430px){ .tool-grid { grid-template-columns:1fr; } .tool-field.full { grid-column:auto; } }
  `;
  document.head.appendChild(style);

  const tools = document.createElement('section');
  tools.className = 'pixel-card business-tools';
  tools.innerHTML = `
    <div class="section-heading">
      <h2 class="section-title">▣ SHOPEE TOOLS</h2>
      <span class="tool-note">TH</span>
    </div>
    <div class="tool-launchers">
      <button class="tool-launch dts" id="openDtsTool" type="button">▦ DTS 查询</button>
      <button class="tool-launch cost" id="openCostTool" type="button">¥ 成本/定价</button>
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
        <button class="modal-close" type="button" id="closeShopeeTools" aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        <div class="tool-tabs">
          <button class="tool-tab active" type="button" data-tool="dts">▦ DTS 查询</button>
          <button class="tool-tab" type="button" data-tool="cost">¥ 成本/定价</button>
        </div>
        <div class="tool-panel" id="dtsToolPanel">
          <div class="tool-grid">
            <div class="tool-field"><label>站点</label><select class="tool-control" id="dtsSite"><option value="TH">泰国 TH</option></select></div>
            <div class="tool-field"><label>付款确认时间</label><input class="tool-control" id="dtsStart" type="datetime-local"></div>
            <div class="tool-field"><label>DTS 工作日</label><input class="tool-control" id="dtsDays" type="number" min="1" max="30" value="1"></div>
            <div class="tool-field"><label>额外休息日</label><input class="tool-control" id="dtsHoliday" type="date"></div>
          </div>
          <div class="tool-result"><small>SHIP-BY DATE</small><strong id="dtsResult">—</strong><p id="dtsBreakdown">输入订单时间和 DTS 后自动计算。</p></div>
          <p class="tool-note">按工作日推算，自动排除周六、周日及你保存的额外休息日。Shopee 活动期或物流商特殊安排应以 Seller Centre 显示的截止时间为准。</p>
        </div>
        <div class="tool-panel" id="costToolPanel" hidden>
          <div class="tool-grid">
            <div class="tool-field full"><label>计算模式</label><select class="tool-control" id="pricingMode"><option value="profit">已知售价算利润</option><option value="price_by_profit">已知净利算售价</option><option value="price_by_rate">已知利润率算售价</option></select></div>
            <div class="tool-field"><label>站点</label><select class="tool-control" id="costSite"><option value="TH">泰国 TH / THB</option></select></div>
            <div class="tool-field" data-mode="profit"><label>销售价（当地币）</label><input class="tool-control" id="salePrice" type="number" min="0" step="0.01" value="0"></div>
            <div class="tool-field" data-mode="profit"><label>卖家折扣（当地币）</label><input class="tool-control" id="sellerDiscount" type="number" min="0" step="0.01" value="0"></div>
            <div class="tool-field" data-mode="price_by_profit price_by_rate"><label>商品成本价（CNY）</label><input class="tool-control" id="productCost2" type="number" min="0" step="0.01" value="0"></div>
            <div class="tool-field" data-mode="price_by_profit"><label>预期净利润（CNY）</label><input class="tool-control" id="expectedProfit" type="number" min="0" step="0.01" value="0"></div>
            <div class="tool-field" data-mode="price_by_rate"><label>预期净利润率 %</label><input class="tool-control" id="expectedProfitRate" type="number" min="0" max="100" step="0.01" value="0"></div>
            <div class="tool-field" data-mode="price_by_profit price_by_rate"><label>折扣 %OFF</label><input class="tool-control" id="discountOff" type="number" min="0" max="100" step="0.01" value="0"></div>
            <div class="tool-field" data-mode="price_by_profit price_by_rate"><label>境内段运费（CNY）</label><input class="tool-control" id="withinBorderSF" type="number" min="0" step="0.01" value="0"></div>
            <div class="tool-field" data-mode="price_by_profit price_by_rate"><label>藏价（当地币）</label><input class="tool-control" id="hiddenFee" type="number" min="0" step="0.01" value="0"></div>
            <div class="tool-field"><label>买家运费（当地币）</label><input class="tool-control" id="buyerShipping" type="number" min="0" step="0.01" value="0"></div>
            <div class="tool-field" data-mode="profit"><label>货品成本（CNY）</label><input class="tool-control" id="productCost" type="number" min="0" step="0.01" value="0"></div>
            <div class="tool-field" data-mode="profit"><label>头程/包材（CNY）</label><input class="tool-control" id="chinaLogistics" type="number" min="0" step="0.01" value="0"></div>
            <div class="tool-field" data-mode="profit"><label>尾程/其他（当地币）</label><input class="tool-control" id="localLogistics" type="number" min="0" step="0.01" value="0"></div>
            <div class="tool-field"><label>汇率 1 CNY =</label><input class="tool-control rate" id="fxRate" type="number" min="0.0001" step="0.0001"></div>
            <div class="tool-field"><label>佣金费率 %</label><input class="tool-control rate" id="saleFee" type="number" min="0" max="100" step="0.01"></div>
            <div class="tool-field"><label>交易手续费率 %</label><input class="tool-control rate" id="paymentFee" type="number" min="0" max="100" step="0.01"></div>
            <div class="tool-field"><label>活动服务费率 %</label><input class="tool-control rate" id="serviceFee" type="number" min="0" max="100" step="0.01"></div>
            <div class="tool-field"><label>提现手续费率 %</label><input class="tool-control rate" id="withdrawRate" type="number" min="0" max="100" step="0.01" value="0"></div>
          </div>
          <div class="tool-result" id="costResultBox"><small id="costResultLabel">预计单件利润</small><strong id="profitResult">¥0.00</strong><div class="metric-grid" id="costMetrics"></div></div>
          <p class="tool-note" id="costNote">费率保存在本机。默认取自 2026-07-16 泰国手机壳实测订单，请按 Seller Centre 最新费率更新；最终以订单收入明细为准。</p>
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
        profiles: { TH: { ...DEFAULTS.profiles.TH, ...(saved.profiles?.TH || {}) } },
        holidays: { TH: saved.holidays?.TH || [] }
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
    $('dtsResult').textContent = `${date.toLocaleDateString('zh-CN')} · ${date.toLocaleDateString('en-US', { weekday: 'short' })}`;
    $('dtsBreakdown').textContent = `${site} · ${days} 个工作日 · 跳过 ${skipped} 个周末/休息日 · 请在当天平台截止时间前完成交运扫描。`;
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
    $('withdrawRate').value = profile.withdrawRate || 0;
    calculateCost();
  }

  function updateModeVisibility() {
    const mode = $('pricingMode').value;
    document.querySelectorAll('#costToolPanel [data-mode]').forEach((el) => {
      const modes = el.dataset.mode.split(' ');
      el.style.display = modes.includes(mode) ? '' : 'none';
    });
  }

  function calculateCost() {
    const mode = $('pricingMode').value;
    const site = $('costSite').value;
    const profile = state.profiles[site];
    profile.fx = n('fxRate') || profile.fx;
    profile.saleFee = n('saleFee');
    profile.paymentFee = n('paymentFee');
    profile.serviceFee = n('serviceFee');
    profile.feeTax = n('feeTax');
    profile.withdrawRate = n('withdrawRate');
    saveState();

    const fx = profile.fx;
    const s = profile.saleFee / 100;
    const c = profile.paymentFee / 100;
    const l = profile.serviceFee / 100;
    const u = profile.withdrawRate / 100;

    if (mode === 'profit') {
      calculateProfitMode(fx, s, c, l, u, profile);
    } else if (mode === 'price_by_profit') {
      calculatePriceByProfitMode(fx, s, c, l, u, profile);
    } else if (mode === 'price_by_rate') {
      calculatePriceByRateMode(fx, s, c, l, u, profile);
    }
  }

  function calculateProfitMode(fx, s, c, l, u, profile) {
    const priceBase = Math.max(0, n('salePrice') - n('sellerDiscount'));
    const paymentBase = priceBase + n('buyerShipping');
    const saleFee = priceBase * s;
    const paymentFee = paymentBase * c;
    const serviceFee = priceBase * l;
    const feesBeforeTax = saleFee + paymentFee + serviceFee;
    const feeTax = feesBeforeTax * (profile.feeTax / 100);
    const platformFees = feesBeforeTax + feeTax;
    const localNet = priceBase + n('buyerShipping') - platformFees - n('localLogistics');
    const cnyNet = localNet / fx;
    const totalCnyCost = n('productCost') + n('chinaLogistics');
    const profit = cnyNet - totalCnyCost;
    const margin = priceBase > 0 ? profit / (priceBase / fx) * 100 : 0;
    const roi = totalCnyCost > 0 ? profit / totalCnyCost * 100 : 0;

    $('costResultLabel').textContent = '预计单件利润';
    $('profitResult').textContent = `${profit >= 0 ? '' : '−'}¥${Math.abs(profit).toFixed(2)}`;
    $('profitResult').style.color = profit >= 0 ? 'var(--mint)' : 'var(--danger)';
    $('costMetrics').innerHTML = `
      <div class="metric"><small>平台费</small><b>${profile.currency} ${platformFees.toFixed(2)}</b></div>
      <div class="metric"><small>净回款</small><b>¥${cnyNet.toFixed(2)}</b></div>
      <div class="metric"><small>利润率</small><b>${margin.toFixed(1)}%</b></div>
      <div class="metric"><small>成本回报率</small><b>${roi.toFixed(1)}%</b></div>`;
    $('costNote').textContent = '费率保存在本机。默认取自 2026-07-16 泰国手机壳实测订单，请按 Seller Centre 最新费率更新；最终以订单收入明细为准。';
  }

  function calculatePriceByProfitMode(fx, s, c, l, u, profile) {
    const o = n('productCost2') * fx;
    const r = n('expectedProfit') * fx;
    const m = n('withinBorderSF') * fx;
    const p = n('hiddenFee');
    const f = n('buyerShipping');
    const discount = n('discountOff') / 100;

    const denominator = 1 - s - c - l;
    if (denominator <= 0) {
      $('profitResult').textContent = '费率错误';
      $('profitResult').style.color = 'var(--danger)';
      $('costMetrics').innerHTML = '';
      return;
    }

    const salePrice = ((o + r + m) / (1 - u) + p + f * c) / denominator;
    const listPrice = discount < 1 ? salePrice / (1 - discount) : salePrice;
    const profitRate = salePrice > 0 ? (r / salePrice) * 100 : 0;

    const commission = salePrice * s;
    const tradeFee = (salePrice + f) * c;
    const activityFee = salePrice * l;
    const platformFees = commission + tradeFee + activityFee;
    const orderRevenue = salePrice + f - platformFees;

    $('costResultLabel').textContent = '建议折后售价';
    $('profitResult').textContent = `${profile.currency} ${salePrice.toFixed(2)}`;
    $('profitResult').style.color = 'var(--yellow)';
    $('costMetrics').innerHTML = `
      <div class="metric"><small>折前售价</small><b>${profile.currency} ${listPrice.toFixed(2)}</b></div>
      <div class="metric"><small>净利润率</small><b>${profitRate.toFixed(1)}%</b></div>
      <div class="metric"><small>平台费</small><b>${profile.currency} ${platformFees.toFixed(2)}</b></div>
      <div class="metric"><small>订单收入</small><b>${profile.currency} ${orderRevenue.toFixed(2)}</b></div>`;
    $('costNote').textContent = `公式来源：Shopee 官方定价模拟器。藏价 ${p.toFixed(2)} + 买家运费 ${f.toFixed(2)} 已计入。实际定价请以 Seller Centre 为准。`;
  }

  function calculatePriceByRateMode(fx, s, c, l, u, profile) {
    const o = n('productCost2') * fx;
    const m = n('withinBorderSF') * fx;
    const p = n('hiddenFee');
    const f = n('buyerShipping');
    const i = n('expectedProfitRate') / 100;
    const discount = n('discountOff') / 100;

    const denominator = 1 - s - c - l - i / (1 - u);
    if (denominator <= 0) {
      $('profitResult').textContent = '利润率过高';
      $('profitResult').style.color = 'var(--danger)';
      $('costMetrics').innerHTML = '';
      return;
    }

    const salePrice = ((o + m) / (1 - u) + p + f * c) / denominator;
    const listPrice = discount < 1 ? salePrice / (1 - discount) : salePrice;
    const netProfit = salePrice * i;

    const commission = salePrice * s;
    const tradeFee = (salePrice + f) * c;
    const activityFee = salePrice * l;
    const platformFees = commission + tradeFee + activityFee;
    const orderRevenue = salePrice + f - platformFees;

    $('costResultLabel').textContent = '建议折后售价';
    $('profitResult').textContent = `${profile.currency} ${salePrice.toFixed(2)}`;
    $('profitResult').style.color = 'var(--yellow)';
    $('costMetrics').innerHTML = `
      <div class="metric"><small>折前售价</small><b>${profile.currency} ${listPrice.toFixed(2)}</b></div>
      <div class="metric"><small>预期净利</small><b>¥${(netProfit / fx).toFixed(2)}</b></div>
      <div class="metric"><small>平台费</small><b>${profile.currency} ${platformFees.toFixed(2)}</b></div>
      <div class="metric"><small>订单收入</small><b>${profile.currency} ${orderRevenue.toFixed(2)}</b></div>`;
    $('costNote').textContent = `公式来源：Shopee 官方定价模拟器。目标利润率 ${(i * 100).toFixed(1)}% 已计入。实际定价请以 Seller Centre 为准。`;
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
    else { loadProfile(); updateModeVisibility(); }
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
  $('pricingMode').addEventListener('change', () => { updateModeVisibility(); calculateCost(); });
  document.querySelectorAll('#costToolPanel input, #costToolPanel select').forEach((input) => {
    if (input.id !== 'pricingMode') input.addEventListener('input', calculateCost);
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) closeTool(); });
})();
