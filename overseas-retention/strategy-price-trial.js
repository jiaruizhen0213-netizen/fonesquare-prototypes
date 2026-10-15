(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  let nextId = 0;

  function toCents(value) {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 && numeric <= Number.MAX_SAFE_INTEGER / 100
      ? Math.round(numeric * 100) : null;
  }

  function money(cents) {
    if (cents === null) return '未配置';
    return '¥' + (cents / 100).toLocaleString('zh-CN', {
      minimumFractionDigits: cents % 100 ? 2 : 0,
      maximumFractionDigits: 2
    });
  }

  function countWithin(prices, ceiling) {
    let left = 0;
    let right = prices.length;
    while (left < right) {
      const middle = Math.floor((left + right) / 2);
      if (prices[middle] <= ceiling) left = middle + 1;
      else right = middle;
    }
    return left;
  }

  function svgElement(name, attributes, text) {
    const node = document.createElementNS(SVG_NS, name);
    Object.keys(attributes || {}).forEach(key => node.setAttribute(key, String(attributes[key])));
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function mount(container, initialContext, onApply) {
    if (!container || typeof container.replaceChildren !== 'function') {
      throw new TypeError('价格试算需要有效的容器');
    }

    const id = 'spt-' + (++nextId);
    const root = document.createElement('section');
    root.className = 'spt';
    root.setAttribute('aria-labelledby', id + '-title');
    root.innerHTML = `
      <div class="spt-heading"><h3 id="${id}-title">库存价格试算</h3><span class="spt-demo">原型演示数据</span></div>
      <p class="spt-scope" data-trial-role="scope"></p>
      <p class="spt-description">使用符合当前策略条件的可留货库存已有结算价，无价格商品跳过。实际留货时会重新取价。</p>
      <div class="spt-reference"><span>海外预估售价参考 <strong data-trial-role="reference"></strong></span><span class="spt-reference-help">仅作提示，可继续拖动到更高价格</span></div>
      <p class="spt-channels" data-trial-role="channels"></p>
      <div class="spt-result">结算价 ≤ <strong data-trial-role="selected"></strong><span>的库存共 <strong data-trial-role="count">0</strong> 台</span></div>
      <p class="spt-totals">有价格 <span data-trial-role="priced">0</span> 台 · 无价格跳过 <span data-trial-role="missing">0</span> 台<span class="spt-times" data-trial-role="times"></span></p>
      <div class="spt-chart-wrap"><svg class="spt-chart" data-trial-role="chart" role="img" aria-labelledby="${id}-chart-title ${id}-chart-description"></svg></div>
      <div class="spt-controls">
        <div class="spt-slider-field"><label for="${id}-slider">拖动试算价格</label><input data-trial-role="slider" id="${id}-slider" type="range" step="0.01"><div class="spt-range-labels"><span data-trial-role="minimum"></span><span data-trial-role="maximum"></span></div></div>
        <div class="spt-number-field"><label for="${id}-price">试算价格（元）</label><input data-trial-role="price" id="${id}-price" type="number" min="0" step="0.01" inputmode="decimal" aria-describedby="${id}-hint"></div>
        <button type="button" data-trial-role="apply" class="spt-apply">应用价格</button>
      </div>
      <p id="${id}-hint" class="spt-hint" data-trial-role="hint"></p>
      <p class="spt-message" data-trial-role="message" role="alert" hidden></p>
      <p class="spt-status" data-trial-role="status" role="status" aria-live="polite" hidden></p>`;
    container.replaceChildren(root);

    const element = role => root.querySelector('[data-trial-role="' + role + '"]');
    const slider = element('slider');
    const priceInput = element('price');
    const applyButton = element('apply');
    const chart = element('chart');
    let context = {};
    let prices = [];
    let reference = null;
    let selected = 0;
    let lower = 0;
    let upper = 10000;
    let inputValid = true;
    let destroyed = false;
    let pointerId = null;
    let geometry = null;
    let selectionGroup = null;
    let resizeObserver = null;

    function clearMessages() {
      ['message', 'status'].forEach(role => {
        element(role).hidden = true;
        element(role).textContent = '';
      });
    }

    function enabled() {
      return !context.disabledReason && prices.length > 0;
    }

    function updateSelectionGraphic() {
      if (!geometry || !selectionGroup) return;
      selectionGroup.replaceChildren();
      if (!prices.length || !inputValid) return;
      const x = geometry.x(selected);
      const count = countWithin(prices, selected);
      const y = geometry.y(count);
      selectionGroup.append(
        svgElement('line', {x1:x, y1:geometry.top, x2:x, y2:geometry.bottom, class:'spt-selected-line'}),
        svgElement('line', {x1:geometry.left, y1:y, x2:x, y2:y, class:'spt-selected-guide'}),
        svgElement('circle', {cx:x, cy:y, r:5, class:'spt-selected-dot', 'data-price':selected / 100, 'data-count':count})
      );
    }

    function syncSelection(keepInput) {
      const count = countWithin(prices, selected);
      element('selected').textContent = inputValid ? money(selected) : '—';
      element('count').textContent = inputValid ? String(count) : '—';
      slider.value = String(selected / 100);
      slider.setAttribute('aria-valuetext', money(selected) + '，' + count + ' 台');
      if (!keepInput) priceInput.value = String(selected / 100);
      applyButton.disabled = !enabled() || reference === null || !inputValid;
      priceInput.setAttribute('aria-invalid', String(!inputValid));
      const hint = element('hint');
      if (context.disabledReason) hint.textContent = context.disabledReason;
      else if (!prices.length) hint.textContent = '当前条件下暂无有价格的库存，无法试算。';
      else if (!inputValid) hint.textContent = '请输入不小于 0 的有效价格，最多保留两位小数。';
      else if (reference === null) hint.textContent = '海外预估售价配置不完整，请补齐所选渠道价格后再应用；仍可查看库存数量。';
      else if (selected > reference) hint.textContent = '当前试算价格高于海外预估售价，仍可查看对应库存数量。';
      else hint.textContent = '应用后：基准价 = 当前试算价格，最高价 = 海外预估售价参考。';
      root.classList.toggle('spt-above-reference', reference !== null && selected > reference);
      updateSelectionGraphic();
    }

    function calculateDomain() {
      const initial = toCents(context.initialPrice);
      const endpoints = prices.length ? [prices[0], prices[prices.length - 1]] : [];
      if (reference !== null) endpoints.push(reference);
      if (initial !== null) endpoints.push(initial);
      endpoints.push(selected);
      const maximum = Math.max(0, ...endpoints);
      const minimum = Math.min(...endpoints);
      const step = maximum >= 100000 ? 10000 : maximum >= 10000 ? 1000 : 100;
      const headroom = Math.max(step, (maximum - minimum) * 0.1);
      lower = Math.max(0, Math.floor((minimum - headroom) / step) * step);
      upper = Math.ceil(Math.max(maximum + headroom, reference === null ? 0 : reference * 1.2) / step) * step;
      if (upper <= lower) upper = lower + step;
      slider.min = String(lower / 100);
      slider.max = String(upper / 100);
      element('minimum').textContent = money(lower);
      element('maximum').textContent = money(upper);
    }

    function drawChart() {
      if (destroyed) return;
      const measured = root.querySelector('.spt-chart-wrap').getBoundingClientRect().width || container.clientWidth || 720;
      const width = Math.max(240, measured);
      const height = width < 500 ? 230 : 250;
      const left = 58;
      const right = width - 22;
      const top = 44;
      const bottom = height - 45;
      const maxCount = Math.max(1, prices.length);
      const x = value => left + (value - lower) / (upper - lower) * (right - left);
      const y = value => bottom - value / maxCount * (bottom - top);
      geometry = {width, height, left, right, top, bottom, x, y};
      chart.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      chart.setAttribute('height', String(height));
      chart.replaceChildren(
        svgElement('title', {id:id + '-chart-title'}, '价格与累计库存数量'),
        svgElement('desc', {id:id + '-chart-description'}, '横轴为结算价，纵轴为该价格以内的累计库存数量。可拖动图中价格线，或使用下方价格滑块与输入框。'),
        svgElement('text', {x:left, y:17, class:'spt-axis-title', 'data-axis':'y'}, '累计库存（台）'),
        svgElement('text', {x:right, y:height - 2, 'text-anchor':'end', class:'spt-axis-title', 'data-axis':'x'}, '结算价（元）')
      );

      const yTicks = Array.from(new Set([0, Math.round(maxCount / 3), Math.round(maxCount * 2 / 3), maxCount]));
      yTicks.forEach(value => {
        chart.append(
          svgElement('line', {x1:left, y1:y(value), x2:right, y2:y(value), class:'spt-grid-line'}),
          svgElement('text', {x:left - 10, y:y(value) + 4, 'text-anchor':'end', class:'spt-axis-tick'}, String(value))
        );
      });
      const tickCount = width < 500 ? 3 : 5;
      for (let i = 0; i < tickCount; i++) {
        const value = lower + (upper - lower) * i / (tickCount - 1);
        chart.append(svgElement('text', {
          x:x(value), y:bottom + 21, class:'spt-axis-tick',
          'text-anchor':i === 0 ? 'start' : i === tickCount - 1 ? 'end' : 'middle'
        }, (value / 100).toLocaleString('zh-CN', {maximumFractionDigits:2})));
      }
      chart.append(svgElement('rect', {x:left, y:top, width:right-left, height:bottom-top, class:'spt-frame', 'data-chart-frame':''}));

      if (prices.length) {
        let path = 'M ' + x(lower) + ' ' + y(countWithin(prices, lower));
        for (let i = 0; i < prices.length;) {
          const price = prices[i];
          let count = i + 1;
          while (count < prices.length && prices[count] === price) count++;
          if (price > lower && price <= upper) path += ' H ' + x(price) + ' V ' + y(count);
          i = count;
        }
        path += ' H ' + x(upper);
        chart.append(svgElement('path', {d:path, class:'spt-cumulative', 'data-trial-role':'curve'}));
      } else {
        chart.append(svgElement('text', {x:(left+right)/2, y:(top+bottom)/2, 'text-anchor':'middle', class:'spt-empty'}, context.disabledReason || '暂无有价格的库存'));
      }

      if (reference !== null) {
        const referenceX = x(reference);
        chart.append(
          svgElement('line', {x1:referenceX, y1:top, x2:referenceX, y2:bottom, class:'spt-reference-line', 'data-reference':reference / 100}),
          svgElement('text', {x:referenceX, y:top - 8, 'text-anchor':referenceX > right - 80 ? 'end' : 'middle', class:'spt-reference-label'}, '预估售价 ' + money(reference))
        );
      }
      selectionGroup = svgElement('g', {'data-trial-role':'selection'});
      chart.append(selectionGroup);
      updateSelectionGraphic();
    }

    function selectCents(cents, keepInput) {
      clearMessages();
      selected = cents;
      inputValid = true;
      if (selected < lower || selected > upper) {
        calculateDomain();
        drawChart();
      }
      syncSelection(keepInput);
    }

    function onSlider() {
      const cents = toCents(slider.value);
      if (enabled() && cents !== null) selectCents(cents, false);
    }

    function onPriceInput() {
      if (!enabled()) return;
      const cents = toCents(priceInput.value);
      if (cents === null || priceInput.validity.stepMismatch) {
        clearMessages();
        inputValid = false;
        syncSelection(true);
        return;
      }
      selectCents(cents, true);
    }

    function onApplyPrice() {
      clearMessages();
      if (!enabled() || reference === null || !inputValid) return;
      if (selected > reference) {
        element('message').textContent = '超出预估售价请确认后手动输入';
        element('message').hidden = false;
        return;
      }
      if (typeof onApply === 'function') onApply({base:selected / 100, ceiling:reference / 100});
      element('status').textContent = '已应用：基准价 ' + money(selected) + '，最高价 ' + money(reference) + '。保存策略后生效。';
      element('status').hidden = false;
    }

    function priceAtPointer(event) {
      if (!geometry || !enabled()) return;
      const rect = chart.getBoundingClientRect();
      if (!rect.width) return;
      const position = (event.clientX - rect.left) * geometry.width / rect.width;
      const ratio = Math.min(1, Math.max(0, (position - geometry.left) / (geometry.right - geometry.left)));
      selectCents(Math.round(lower + ratio * (upper - lower)), false);
    }

    function onPointerDown(event) {
      if (!enabled() || (event.button !== undefined && event.button !== 0)) return;
      const rect = chart.getBoundingClientRect();
      if (!rect.width || !geometry) return;
      const position = (event.clientX - rect.left) * geometry.width / rect.width;
      const vertical = (event.clientY - rect.top) * geometry.height / rect.height;
      if (position < geometry.left || position > geometry.right || vertical < geometry.top || vertical > geometry.bottom) return;
      event.preventDefault();
      pointerId = event.pointerId;
      if (chart.setPointerCapture) chart.setPointerCapture(pointerId);
      priceAtPointer(event);
    }

    function onPointerMove(event) {
      if (pointerId !== null && event.pointerId === pointerId) priceAtPointer(event);
    }

    function onPointerEnd(event) {
      if (event.pointerId !== pointerId) return;
      if (chart.releasePointerCapture && chart.hasPointerCapture && chart.hasPointerCapture(pointerId)) chart.releasePointerCapture(pointerId);
      pointerId = null;
    }

    function update(nextContext) {
      if (destroyed) return;
      context = nextContext || {};
      const items = Array.isArray(context.items) ? context.items : [];
      prices = items.map(item => toCents(item.price)).filter(value => value !== null).sort((a,b) => a-b);
      const estimates = Array.isArray(context.estimatedPrices) ? context.estimatedPrices : [];
      const estimateValues = estimates.map(estimate => toCents(estimate.price));
      reference = estimateValues.length && estimateValues.every(value => value !== null && value > 0)
        ? Math.min(...estimateValues) : null;
      const initial = toCents(context.initialPrice);
      selected = initial !== null ? initial : prices.length ? prices[Math.floor((prices.length - 1) / 2)] : reference || 0;
      inputValid = true;
      pointerId = null;
      clearMessages();
      element('scope').textContent = context.label || '请先选择货品范围和质量模板';
      element('reference').textContent = money(reference);
      element('channels').textContent = estimates.length ? estimates.map((estimate,index) => String(estimate.channel || '未命名渠道') + '：' + money(estimateValues[index] > 0 ? estimateValues[index] : null)).join('；') + (reference !== null && estimates.length > 1 ? '。多个渠道取最低值。' : '') : '请先配置对应型号、内存、海外购买渠道和海外等级的预估售价。';
      element('priced').textContent = String(prices.length);
      element('missing').textContent = String(items.length - prices.length);
      element('times').textContent = [context.snapshotTime ? '库存快照 ' + context.snapshotTime : '', context.priceTime ? '价格更新 ' + context.priceTime : ''].filter(Boolean).map(value => ' · ' + value).join('');
      slider.disabled = !enabled();
      priceInput.disabled = !enabled();
      calculateDomain();
      drawChart();
      syncSelection(false);
    }

    slider.addEventListener('input', onSlider);
    priceInput.addEventListener('input', onPriceInput);
    applyButton.addEventListener('click', onApplyPrice);
    chart.addEventListener('pointerdown', onPointerDown);
    chart.addEventListener('pointermove', onPointerMove);
    chart.addEventListener('pointerup', onPointerEnd);
    chart.addEventListener('pointercancel', onPointerEnd);
    window.addEventListener('resize', drawChart);
    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(drawChart);
      resizeObserver.observe(root.querySelector('.spt-chart-wrap'));
    }
    update(initialContext);

    return {
      update,
      destroy() {
        if (destroyed) return;
        destroyed = true;
        if (resizeObserver) resizeObserver.disconnect();
        window.removeEventListener('resize', drawChart);
        slider.removeEventListener('input', onSlider);
        priceInput.removeEventListener('input', onPriceInput);
        applyButton.removeEventListener('click', onApplyPrice);
        chart.removeEventListener('pointerdown', onPointerDown);
        chart.removeEventListener('pointermove', onPointerMove);
        chart.removeEventListener('pointerup', onPointerEnd);
        chart.removeEventListener('pointercancel', onPointerEnd);
        root.remove();
      }
    };
  }

  window.RetentionPriceTrial = {mount};
})();
