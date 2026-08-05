(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    .business-tools{margin-top:24px;padding:14px}.tool-launch{width:100%;min-height:54px;border:3px solid var(--line);box-shadow:4px 4px 0 var(--line);cursor:pointer;background:var(--yellow);color:var(--line);font-family:var(--pixel-font);font-size:12px;font-weight:900}
    .price-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.price-field{display:grid;gap:5px}.price-field label{color:var(--muted);font-size:10px;line-height:1.4}.price-field input{width:100%;height:42px;padding:0 9px;border:3px solid var(--line);background:var(--field);color:var(--ink)}
    .price-result{margin-top:12px;padding:12px;border:3px solid var(--line);background:var(--field)}.price-hero{display:flex;justify-content:space-between;gap:10px;align-items:end}.price-hero strong{color:var(--yellow);font-family:var(--pixel-font);font-size:22px}.price-hero small{color:var(--muted)}
    .price-metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px}.price-metric{padding:9px;border:2px solid var(--line);background:var(--panel-2)}.price-metric small{display:block;color:var(--muted);font-size:9px}.price-metric b{display:block;margin-top:4px;color:var(--mint);font-family:var(--pixel-font);font-size:12px}.price-note{margin-top:11px;color:var(--muted);font-size:10px;line-height:1.65}
    @media(max-width:430px){.price-grid{grid-template-columns:1fr}.price-metrics{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(style);

  const tools = document.createElement('section');
  tools.className = 'pixel-card business-tools';
  tools.innerHTML = `<div class="section-heading"><h2 class="section-title">SHOPEE 泰国</h2><span>TH</span></div><button class="tool-launch" id="openPriceTool" type="button">价格与利润计算</button>`;
  const entries = document.querySelector('.entries');
  entries.parentNode.insertBefore(tools, entries);

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.id = 'priceToolModal';
  modal.hidden = true;
  modal.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-labelledby="priceToolTitle">
    <div class="modal-head"><h2 class="modal-title" id="priceToolTitle">Shopee 泰国价格与利润</h2><button class="modal-close" id="closePriceTool" type="button" aria-label="关闭">×</button></div>
    <div class="modal-body">
      <div class="price-grid">
        <div class="price-field"><label>含税售价 P（THB）</label><input id="pSale" type="number" step="0.01" value="177"></div>
        <div class="price-field"><label>税前销售额（THB）</label><input id="pNetSale" type="number" step="0.01" value="153"></div>
        <div class="price-field"><label>平台预估订单收入 I(P)（THB）</label><input id="pIncome" type="number" step="0.01" value="96"></div>
        <div class="price-field"><label>拿货成本 C（RMB）</label><input id="pCost" type="number" step="0.01" value="9"></div>
        <div class="price-field"><label>汇率 R：1 RMB = THB</label><input id="pFx" type="number" step="0.0001" value="4.779"></div>
        <div class="price-field"><label>货损准备率 L（%）</label><input id="pLoss" type="number" step="0.1" value="3"></div>
        <div class="price-field"><label>广告 ROAS</label><input id="pRoas" type="number" step="0.1" value="5"></div>
        <div class="price-field"><label>达人佣金 K（%）</label><input id="pCreator" type="number" step="0.1" value="12"></div>
        <div class="price-field"><label>自然订单占比（%）</label><input id="pNaturalMix" type="number" step="1" value="40"></div>
        <div class="price-field"><label>广告订单占比（%）</label><input id="pAdMix" type="number" step="1" value="30"></div>
        <div class="price-field"><label>达人订单占比（%）</label><input id="pCreatorMix" type="number" step="1" value="30"></div>
      </div>
      <div class="price-result"><div class="price-hero"><div><small>综合平均利润 / 单</small><strong id="pWeightedProfit">¥0.00</strong></div><div><small>综合税前利润率</small><strong id="pWeightedMargin">0.0%</strong></div></div><div class="price-metrics" id="pMetrics"></div></div>
      <p class="price-note">三种订单互斥。优先填写 Shopee 订单页显示的预估收入 I(P)，避免重复扣除平台已经计算的税费、关税和物流。默认值来自你提供的 177 THB 手机壳模型。</p>
    </div></section>`;
  document.body.appendChild(modal);

  const $ = (id) => document.getElementById(id);
  const value = (id) => Math.max(0, Number($(id).value) || 0);
  function calculate() {
    const sale = value('pSale');
    const netSale = value('pNetSale');
    const income = value('pIncome');
    const fx = value('pFx') || 4.779;
    const productCostThb = value('pCost') * fx;
    const lossReserve = netSale * value('pLoss') / 100;
    const natural = income - productCostThb - lossReserve;
    const ad = natural - (value('pRoas') ? sale / value('pRoas') : 0);
    const creator = natural - sale * value('pCreator') / 100;
    const mixTotal = value('pNaturalMix') + value('pAdMix') + value('pCreatorMix') || 100;
    const weighted = (natural * value('pNaturalMix') + ad * value('pAdMix') + creator * value('pCreatorMix')) / mixTotal;
    const toRmb = (thb) => thb / fx;
    const margin = (thb) => netSale ? thb / netSale * 100 : 0;
    $('pWeightedProfit').textContent = `¥${toRmb(weighted).toFixed(2)}`;
    $('pWeightedMargin').textContent = `${margin(weighted).toFixed(1)}%`;
    $('pMetrics').innerHTML = `
      <div class="price-metric"><small>自然单利润</small><b>¥${toRmb(natural).toFixed(2)} · ${margin(natural).toFixed(1)}%</b></div>
      <div class="price-metric"><small>广告单利润</small><b>¥${toRmb(ad).toFixed(2)} · ${margin(ad).toFixed(1)}%</b></div>
      <div class="price-metric"><small>达人单利润（保守含税基数）</small><b>¥${toRmb(creator).toFixed(2)} · ${margin(creator).toFixed(1)}%</b></div>
      <div class="price-metric"><small>商品毛利率</small><b>${netSale ? ((netSale / fx - value('pCost')) / (netSale / fx) * 100).toFixed(1) : '0.0'}%</b></div>`;
  }
  function open() { modal.hidden = false; document.body.style.overflow = 'hidden'; calculate(); }
  function close() { modal.hidden = true; document.body.style.overflow = ''; }
  $('openPriceTool').addEventListener('click', open);
  $('closePriceTool').addEventListener('click', close);
  modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
  modal.querySelectorAll('input').forEach((input) => input.addEventListener('input', calculate));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) close(); });
})();
