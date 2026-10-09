/* Replace the illustrative asset arrays with device photos when integrating. */
(() => {
  const gallery = document.getElementById('inspectionDeviceGallery');
  if (!gallery) return;
  const t = (zh, en) => document.documentElement.lang === 'en' ? en : zh;
  const photos = {
    standard: [
      ['assets/device-standard-front.svg', '正面', 'Front'],
      ['assets/device-standard-back.svg', '背面', 'Back'],
      ['assets/device-standard-side.svg', '侧面', 'Side']
    ],
    foldable: [
      ['assets/device-foldable-front.svg', '外屏正面', 'Cover screen'],
      ['assets/device-foldable-back.svg', '背面', 'Back'],
      ['assets/device-foldable-open.svg', '展开内屏', 'Unfolded screen']
    ]
  };
  const style = document.createElement('style');
  style.textContent = `
    .device-gallery{width:88px;min-width:0}
    .device-gallery-open{display:block;width:88px;height:104px;padding:0;overflow:hidden;border:0;border-radius:13px;background:#eef0f1;touch-action:pan-y;cursor:zoom-in}
    .device-gallery-open img{display:block;width:100%;height:100%;object-fit:contain;pointer-events:none}
    .device-gallery-controls{display:flex;align-items:center;justify-content:space-between;margin-top:3px;font-size:10px;color:#666}
    .device-gallery-controls button{width:28px;height:32px;padding:0;border:0;border-radius:8px;background:none;color:var(--orange);font-size:23px;line-height:1}
    .device-gallery-controls button:disabled{opacity:.3;cursor:default}
    #devicePhotoDialog{position:fixed;inset:0;width:100vw;max-width:100vw;height:100dvh;max-height:100dvh;margin:0;padding:0;border:0;border-radius:0;background:#151719;color:#fff;overflow:hidden}
    #devicePhotoDialog[open]{display:flex;flex-direction:column}
    .device-photo-header{display:flex;align-items:center;justify-content:space-between;flex:none;min-height:64px;padding:calc(8px + env(safe-area-inset-top)) 16px 8px;gap:12px}
    .device-photo-header h2{margin:0;font-size:17px;font-weight:600}
    .device-photo-close,.device-photo-nav,.device-photo-zoom{min-width:44px;min-height:44px;border:0;border-radius:12px;background:#ffffff14;color:#fff}
    .device-photo-close{font-size:28px;line-height:1}
    .device-photo-stage{position:relative;flex:1;min-height:0;overflow:hidden;touch-action:none;cursor:zoom-in;outline-offset:-4px}
    .device-photo-stage.is-zoomed{cursor:grab}
    .device-photo-stage.is-dragging{cursor:grabbing}
    .device-photo-stage img{display:block;width:100%;height:100%;object-fit:contain;user-select:none;pointer-events:none;will-change:transform}
    .device-photo-error{position:absolute;inset:0;place-content:center;padding:24px;text-align:center;color:#ddd}
    .device-photo-error:not([hidden]){display:grid}
    .device-photo-footer{flex:none;padding:12px 16px calc(16px + env(safe-area-inset-bottom));text-align:center}
    .device-photo-toolbar{display:flex;align-items:center;justify-content:center;gap:12px;max-width:480px;margin:auto}
    .device-photo-nav{font-size:26px}
    .device-photo-position{flex:1;min-width:0;font-size:13px;line-height:1.5}
    .device-photo-position small{display:block;font-size:11px;color:#b8bdc4}
    .device-photo-zoom{padding:0 14px;font-size:12px}
    .device-photo-hint{margin:10px 0 0;color:#b8bdc4;font-size:12px;line-height:1.5}
  `;
  document.head.append(style);
  const viewer = document.createElement('dialog');
  viewer.id = 'devicePhotoDialog';
  viewer.setAttribute('data-no-i18n', '');
  viewer.setAttribute('aria-labelledby', 'devicePhotoTitle');
  viewer.innerHTML = '<header class="device-photo-header"><h2 id="devicePhotoTitle"></h2><button type="button" class="device-photo-close">×</button></header><div class="device-photo-stage" tabindex="0" role="button"><img draggable="false"><p class="device-photo-error" role="status" hidden></p></div><footer class="device-photo-footer"><div class="device-photo-toolbar"><button type="button" class="device-photo-nav device-photo-prev">‹</button><div class="device-photo-position" aria-live="polite"><span></span><small></small></div><button type="button" class="device-photo-nav device-photo-next">›</button><button type="button" class="device-photo-zoom" aria-pressed="false"></button></div><p class="device-photo-hint"></p></footer>';
  document.body.append(viewer);
  const open = gallery.querySelector('.device-gallery-open');
  const thumb = open.querySelector('img');
  const thumbPrev = gallery.querySelector('.device-gallery-prev');
  const thumbNext = gallery.querySelector('.device-gallery-next');
  const close = viewer.querySelector('.device-photo-close');
  const stage = viewer.querySelector('.device-photo-stage');
  const image = stage.querySelector('img');
  const error = viewer.querySelector('.device-photo-error');
  const prev = viewer.querySelector('.device-photo-prev');
  const next = viewer.querySelector('.device-photo-next');
  const zoomButton = viewer.querySelector('.device-photo-zoom');
  let items = [], index = 0, scale = 1, panX = 0, panY = 0, returnState = null;
  let gesture = null, pinch = null, suppressClickUntil = 0, thumbStart = null;
  const pointers = new Map();
  const clamp = (value, max) => Math.max(-max, Math.min(max, value));
  function updateTransform() {
    const fit = image.naturalWidth ? Math.min(stage.clientWidth / image.naturalWidth, stage.clientHeight / image.naturalHeight) : 1;
    panX = clamp(panX, Math.max(0, (image.naturalWidth * fit * scale - stage.clientWidth) / 2));
    panY = clamp(panY, Math.max(0, (image.naturalHeight * fit * scale - stage.clientHeight) / 2));
    image.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    stage.classList.toggle('is-zoomed', scale > 1);
    zoomButton.setAttribute('aria-pressed', String(scale > 1));
    zoomButton.textContent = scale > 1 ? t('还原', 'Reset') : t('放大', 'Zoom in');
    stage.setAttribute('aria-label', scale > 1 ? t('拖动查看细节，点击还原图片', 'Drag to pan. Tap to reset image') : t('左右滑动切换，点击放大图片', 'Swipe to switch. Tap to zoom image'));
    viewer.querySelector('.device-photo-hint').textContent = scale > 1 ? t('拖动查看细节 · 点击还原', 'Drag to pan · Tap to reset') : t('左右滑动切换 · 点击或双指放大', 'Swipe to switch · Tap or pinch to zoom');
  }
  function resetZoom() {
    scale = 1; panX = 0; panY = 0;
    updateTransform();
  }
  function render() {
    const item = items[index];
    open.disabled = !item;
    [thumbPrev, thumbNext, prev, next].forEach(button => { button.disabled = items.length < 2; });
    thumbPrev.setAttribute('aria-label', t('上一张设备照片', 'Previous device photo'));
    thumbNext.setAttribute('aria-label', t('下一张设备照片', 'Next device photo'));
    prev.setAttribute('aria-label', t('上一张设备照片', 'Previous device photo'));
    next.setAttribute('aria-label', t('下一张设备照片', 'Next device photo'));
    close.setAttribute('aria-label', t('关闭设备照片', 'Close device photos'));
    viewer.querySelector('h2').textContent = t('设备照片', 'Device photos');
    gallery.querySelector('.device-gallery-count').textContent = `${item ? index + 1 : 0} / ${items.length}`;
    if (!item) return;
    const label = t(item[1], item[2]);
    open.setAttribute('aria-label', t('放大查看：', 'Enlarge: ') + label);
    thumb.alt = image.alt = t('设备照片：', 'Device photo: ') + label;
    if (thumb.getAttribute('src') !== item[0]) thumb.src = item[0];
    if (image.getAttribute('src') !== item[0]) {
      error.hidden = true; image.style.visibility = '';
      image.src = item[0];
    }
    viewer.querySelector('.device-photo-position span').textContent = `${index + 1} / ${items.length}`;
    viewer.querySelector('.device-photo-position small').textContent = label;
    error.textContent = t('图片暂时无法加载，请切换其他照片。', 'Image could not load. Try another photo.');
    updateTransform();
  }
  function move(delta) {
    if (items.length < 2) return;
    index = (index + delta + items.length) % items.length;
    resetZoom(); render();
  }
  function toggleZoom() {
    scale = scale > 1 ? 1 : 2;
    panX = 0; panY = 0;
    updateTransform();
  }
  thumbPrev.onclick = prev.onclick = () => move(-1);
  thumbNext.onclick = next.onclick = () => move(1);
  zoomButton.onclick = toggleZoom;
  close.onclick = () => viewer.close();
  image.onload = updateTransform;
  image.onerror = () => { image.style.visibility = 'hidden'; error.hidden = false; };
  open.onclick = () => {
    if (!items.length || performance.now() < suppressClickUntil) return;
    returnState = { x: scrollX, y: scrollY, html: document.documentElement.style.overflow, body: document.body.style.overflow };
    document.documentElement.style.overflow = document.body.style.overflow = 'hidden';
    resetZoom(); render(); viewer.showModal(); updateTransform();
    close.focus({ preventScroll: true });
  };
  viewer.addEventListener('close', () => {
    pointers.clear(); gesture = pinch = null; stage.classList.remove('is-dragging');
    if (!returnState) return;
    document.documentElement.style.overflow = returnState.html;
    document.body.style.overflow = returnState.body;
    open.focus({ preventScroll: true });
    window.scrollTo({ left: returnState.x, top: returnState.y, behavior: 'instant' });
    returnState = null;
  });
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1); }
    if (event.target === stage && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); toggleZoom(); }
  });
  open.addEventListener('pointerdown', event => { thumbStart = { x: event.clientX, y: event.clientY }; open.setPointerCapture(event.pointerId); });
  open.addEventListener('pointerup', event => {
    if (!thumbStart) return;
    const dx = event.clientX - thumbStart.x, dy = event.clientY - thumbStart.y;
    if (Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy) * 1.3) { move(dx < 0 ? 1 : -1); suppressClickUntil = performance.now() + 350; }
    thumbStart = null;
  });
  open.addEventListener('pointercancel', () => { thumbStart = null; });
  stage.onclick = () => { if (performance.now() >= suppressClickUntil) toggleZoom(); };
  const distance = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  stage.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    stage.setPointerCapture(event.pointerId);
    if (pointers.size === 1) gesture = { x: event.clientX, y: event.clientY, panX, panY, zoomed: scale > 1, moved: false };
    if (pointers.size === 2) { pinch = { distance: Math.max(1, distance()), scale }; gesture = null; }
    stage.classList.toggle('is-dragging', scale > 1);
  });
  stage.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2 && pinch) {
      scale = Math.max(1, Math.min(3, pinch.scale * distance() / pinch.distance));
      updateTransform(); return;
    }
    if (!gesture) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (Math.abs(dx) + Math.abs(dy) > 8) gesture.moved = true;
    if (gesture.zoomed) { panX = gesture.panX + dx; panY = gesture.panY + dy; updateTransform(); }
  });
  function endPointer(event) {
    if (!pointers.has(event.pointerId)) return;
    const dx = gesture ? event.clientX - gesture.x : 0, dy = gesture ? event.clientY - gesture.y : 0;
    if (pinch || gesture?.moved || event.type === 'pointercancel') suppressClickUntil = performance.now() + 350;
    if (event.type === 'pointerup' && !pinch && gesture && !gesture.zoomed && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) move(dx < 0 ? 1 : -1);
    pointers.delete(event.pointerId); gesture = null;
    if (!pointers.size) pinch = null;
    stage.classList.remove('is-dragging');
  }
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);
  window.addEventListener('resize', updateTransform);
  let language = document.documentElement.lang;
  new MutationObserver(() => {
    if (language === document.documentElement.lang) return;
    language = document.documentElement.lang; render();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  window.StoreDeviceGallery = {
    setDevice(profileKey) { items = photos[profileKey] || []; index = 0; resetZoom(); render(); }
  };
  window.StoreDeviceGallery.setDevice(typeof lotDraft !== 'undefined' ? lotDraft.scanProfile : null);
})();
