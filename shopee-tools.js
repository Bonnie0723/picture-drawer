(function () {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    .business-tools{margin-top:24px;padding:14px}.tool-launch{width:100%;min-height:54px;border:3px solid var(--line);box-shadow:4px 4px 0 var(--line);cursor:pointer;background:var(--yellow);color:var(--line);font-family:var(--pixel-font);font-size:12px;font-weight:900}
    .price-mode{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:12px}.price-mode button{min-height:42px;border:3px solid var(--line);background:var(--panel-2);color:var(--ink);font-size:10px;font-weight:800;cursor:pointer}.price-mode button.active{background:var(--mint);color:var(--line)}
    .price-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.price-field{display:grid;gap:5px}.price-field label{color:var(--muted);font-size:10px;line-height:1.4}.price-field input{width:100%;height:42px;padding:0 9px;border:3px solid var(--line);background:var(--field);color:var(--ink)}
    .price-result{margin-top:12px;padding:12px;border:3px solid var(--line);background:var(--field)}.price-hero{display:flex;justify-content:space-between;gap:10px;align-items:end}.price-hero strong{display:block;color:var(--yellow);font-family:var(--pixel-font);font-size:20px}.price-hero small{color:var(--muted)}
    .price-metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px}.price-metric{padding:9px;border:2px solid var(--line);background:var(--panel-2)}.price-metric small{display:block;color:var(--muted);font-size:9px}.price-metric b{display:block;margin-top:4px;color:var(--mint);font-family:var(--pixel-font);font-size:12px}.price-note{margin-top:11px;color:var(--muted);font-size:10px;line-height:1.65}
    @media(max-width:430px){.price-grid{grid-template-columns:1fr}.price-mode{grid-template-columns:1fr}.price-metrics{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(style);

  const tools = document.createElement('section');
  tools.className = 'pixel-card business-tools';
  tools.innerHTML = '<div class="section-heading"><h2 class="section-title">SHOPEE THAILAND</h2><span>TH</span></div><button class="tool-launch" id="openPriceTool" type="button">PRICE &amp; PROFIT CALCULATOR</button>';
  const entries = document.querySelector('.entries');
  entries.parentNode.insertBefore(tools, entries);

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.id = 'priceToolModal';
  modal.hidden = true;
  modal.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-labelledby="priceToolTitle">
    <div class="modal-head"><h2 class="modal-title" id="priceToolTitle">Shopee Thailand Pricing</h2><button class="modal-close" id="closePriceTool" type="button" aria-label="Close">&times;</button></div>
    <div class="modal-body">
      <div class="price-mode">
        <button class="active" data-mode="profit" type="button">1. Sale price &rarr; Profit</button>
        <button data-mode="targetProfit" type="button">2. Target profit &rarr; Price</button>
        <button data-mode="targetMargin" type="button">3. Target margin &rarr; Price</button>
      </div>
      <div class="price-grid">
        <div class="price-field" data-show="profit"><label>Tax-included sale price P (THB)</label><input id="pSale" type="number" step="0.01" value="177"></div>
        <div class="price-field" data-show="targetProfit"><label>Target average profit (RMB/order)</label><input id="pTargetProfit" type="number" step="0.01" value="6.4"></div>
        <div class="price-field" data-show="targetMargin"><label>Target pre-tax profit margin (%)</label><input id="pTargetMargin" type="number" step="0.1" value="20.1"></div>
        <div class="price-field"><label>Product cost C (RMB)</label><input id="pCost" type="number" step="0.01" value="9"></div>
        <div class="price-field"><label>Exchange rate: 1 RMB = THB</label><input id="pFx" type="number" step="0.0001" value="4.779"></div>
        <div class="price-field"><label>Loss reserve L (%)</label><input id="pLoss" type="number" step="0.1" value="3"></div>
        <div class="price-field"><label>Net logistics (THB/order)</label><input id="pLogistics" type="number" step="0.01" value="6"></div>
        <div class="price-field"><label>Commission on pre-tax sale (%)</label><input id="pCommission" type="number" step="0.01" value="22.47"></div>
        <div class="price-field"><label>Infrastructure fee (THB/order)</label><input id="pInfra" type="number" step="0.01" value="1.07"></div>
        <div class="price-field"><label>Transaction fee on P (%)</label><input id="pTransaction" type="number" step="0.01" value="3.21"></div>
        <div class="price-field"><label>VAT on P (%)</label><input id="pVat" type="number" step="0.01" value="7"></div>
        <div class="price-field"><label>Import duty on P (%)</label><input id="pDuty" type="number" step="0.01" value="6.78"></div>
        <div class="price-field"><label>Technical support on P (%)</label><input id="pTech" type="number" step="0.01" value="5.35"></div>
        <div class="price-field"><label>Advertising ROAS</label><input id="pRoas" type="number" step="0.1" value="5"></div>
        <div class="price-field"><label>Creator commission on P (%)</label><input id="pCreator" type="number" step="0.1" value="12"></div>
        <div class="price-field"><label>Natural / Ads / Creator mix (%)</label><input id="pMix" type="text" value="40 / 30 / 30"></div>
      </div>
      <div class="price-result"><div class="price-hero"><div><small id="pMainLabel">Average profit / order</small><strong id="pMainValue">RMB 0.00</strong></div><div><small>Pre-tax margin</small><strong id="pWeightedMargin">0.0%</strong></div></div><div class="price-metrics" id="pMetrics"></div></div>
      <p class="price-note">Change any cost, fee, ROAS or commission and the result updates immediately. Modes 2 and 3 reverse-calculate the sale price. Fees are editable because Shopee rates and order rounding can change.</p>
    </div></section>`;
  document.body.appendChild(modal);

  const $ = (id) => document.getElementById(id);
  const num = (id) => Math.max(0, Number($(id).value) || 0);
  let mode = 'profit';
  function mix() {
    const values = $('pMix').value.split(/[^0-9.]+/).map(Number).filter(Number.isFinite);
    const a = values[0] || 40, b = values[1] || 30, c = values[2] || 30, total = a + b + c || 100;
    return [a / total, b / total, c / total];
  }
  function model(price) {
    const fx = num('pFx') || 4.779;
    const vat = price * num('pVat') / 100;
    const duty = price * num('pDuty') / 100;
    const preTax = Math.max(0, price - vat - duty);
    const commission = preTax * num('pCommission') / 100;
    const transaction = price * num('pTransaction') / 100;
    const tech = price * num('pTech') / 100;
    const income = price - num('pLogistics') - commission - num('pInfra') - transaction - vat - duty - tech;
    const natural = income - num('pCost') * fx - preTax * num('pLoss') / 100;
    const ads = natural - (num('pRoas') ? price / num('pRoas') : 0);
    const creator = natural - price * num('pCreator') / 100;
    const weights = mix();
    const weighted = natural * weights[0] + ads * weights[1] + creator * weights[2];
    return { price, preTax, income, natural, ads, creator, weighted, fx, margin: preTax ? weighted / preTax * 100 : 0 };
  }
  function solve(predicate) {
    let low = 0, high = 5000;
    for (let i = 0; i < 70; i += 1) {
      const mid = (low + high) / 2;
      if (predicate(model(mid))) high = mid; else low = mid;
    }
    return model(high);
  }
  function calculate() {
    let result;
    if (mode === 'targetProfit') {
      const targetThb = num('pTargetProfit') * (num('pFx') || 4.779);
      result = solve((row) => row.weighted >= targetThb);
    } else if (mode === 'targetMargin') {
      const target = num('pTargetMargin');
      result = solve((row) => row.margin >= target);
    } else result = model(num('pSale'));
    $('pMainLabel').textContent = mode === 'profit' ? 'Average profit / order' : 'Suggested tax-included price';
    $('pMainValue').textContent = mode === 'profit' ? `RMB ${(result.weighted / result.fx).toFixed(2)}` : `THB ${result.price.toFixed(0)}`;
    $('pWeightedMargin').textContent = `${result.margin.toFixed(1)}%`;
    $('pMetrics').innerHTML = `<div class="price-metric"><small>Pre-tax sale</small><b>THB ${result.preTax.toFixed(2)}</b></div><div class="price-metric"><small>Estimated platform income</small><b>THB ${result.income.toFixed(2)}</b></div><div class="price-metric"><small>Natural profit</small><b>RMB ${(result.natural/result.fx).toFixed(2)}</b></div><div class="price-metric"><small>Ads profit</small><b>RMB ${(result.ads/result.fx).toFixed(2)}</b></div><div class="price-metric"><small>Creator profit</small><b>RMB ${(result.creator/result.fx).toFixed(2)}</b></div><div class="price-metric"><small>Average profit</small><b>RMB ${(result.weighted/result.fx).toFixed(2)}</b></div>`;
  }
  function setMode(next) {
    mode = next;
    modal.querySelectorAll('[data-mode]').forEach((button) => button.classList.toggle('active', button.dataset.mode === mode));
    modal.querySelectorAll('[data-show]').forEach((field) => { field.hidden = field.dataset.show !== mode; });
    calculate();
  }
  function open() { modal.hidden = false; document.body.style.overflow = 'hidden'; setMode(mode); }
  function close() { modal.hidden = true; document.body.style.overflow = ''; }
  $('openPriceTool').addEventListener('click', open);
  $('closePriceTool').addEventListener('click', close);
  modal.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
  modal.querySelectorAll('input').forEach((input) => input.addEventListener('input', calculate));
  modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) close(); });
})();
