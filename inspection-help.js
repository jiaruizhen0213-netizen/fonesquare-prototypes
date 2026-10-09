/* Inspection guidance is illustrative prototype content, independent of answers. */
(() => {
  const en = () => typeof currentLanguage !== 'undefined' && currentLanguage === 'en';
  const t = (zh, english) => en() ? english : zh;
  const guides = {
    '存储容量': ['打开“设置 → 通用 → 关于本机”，查看容量。', 'Open Settings → General → About and check Capacity.', 'Capacity', '512 GB'],
    '开机情况': ['按住电源键，观察设备是否可以正常开机并进入系统。', 'Hold the power button and check whether the device starts normally.', 'Power on', 'Home screen'],
    '机身外观': ['在光线充足处检查边框和背板，观察划痕、磕碰及变形。', 'Inspect the frame and back in good light for scratches, dents and deformation.', 'Body condition', 'Inspect frame'],
    '屏幕外观': ['清洁屏幕后，在亮屏和熄屏状态下检查划痕与裂纹。', 'Clean the screen and inspect for scratches and cracks with the display on and off.', 'Screen condition', 'Inspect display'],
    '蓝牙功能': ['打开“设置 → 蓝牙”，开启蓝牙并确认能搜索附近设备。', 'Open Settings → Bluetooth, enable it and check discovery of nearby devices.', 'Bluetooth', 'On'],
    '更换二手部件': ['打开“设置 → 通用 → 关于本机”，查看“部件与维修历史”，并结合维修记录确认。未显示记录不能直接认定为无更换。', 'Open Settings → General → About and check Parts and Service History together with repair records. Missing history does not prove no replacement.', 'Parts & service', 'Repair history'],
    '电池健康度': ['打开“设置 → 电池 → 电池健康与充电”，查看最大容量，按实际显示值选择；无法读取时选择“无法读取”。', 'Open Settings → Battery → Battery Health & Charging. Select the range matching Maximum Capacity, or Unable to read.', 'Battery health', 'Maximum capacity'],
    '购买渠道': ['打开“设置 → 通用 → 关于本机”，查看型号号码，并结合购买凭证或卖家提供的信息确认购买渠道。', 'Open Settings → General → About and check Model Number together with proof of purchase or seller information.', 'About', 'Model number']
  };
  const valueNotes = {
    '香港零售': ['核对香港零售购买凭证及设备信息。', 'Check Hong Kong retail proof of purchase and device information.', 'Hong Kong retail'],
    '大陆国行': ['核对大陆零售购买凭证及设备信息。', 'Check mainland retail proof of purchase and device information.', 'Mainland retail'],
    '海外版本': ['结合型号信息和购买凭证确认销售地区。', 'Confirm the sales region using model information and proof of purchase.', 'Overseas version'],
    '未知': ['无法确认购买渠道时选择此项。', 'Select when the purchase channel cannot be confirmed.', null],
    '无更换': ['结合部件信息与维修记录确认无更换。', 'Confirm using parts information and repair records.', 'No replacement'],
    '更换屏幕': ['核对显示屏相关的部件和维修记录。', 'Check display parts and service history.', 'Display'],
    '更换电池': ['核对电池相关的部件和维修记录。', 'Check battery parts and service history.', 'Battery'],
    '其他部件': ['核对其他部件的维修或更换记录。', 'Check service history for other replaced parts.', 'Other parts'],
    '90%以上': ['最大容量为 90% 或以上。', 'Maximum capacity is 90% or above.', '95%'],
    '80%–89%': ['最大容量为 80% 至 89%。', 'Maximum capacity is between 80% and 89%.', '85%'],
    '低于80%': ['最大容量低于 80%。', 'Maximum capacity is below 80%.', '75%'],
    '无法读取': ['设备无法显示或读取最大容量。', 'Maximum capacity cannot be displayed or read.', null]
  };
  const style = document.createElement('style');
  style.textContent = `
    #inspectionChoiceDialog,.inspection-help-dialog{width:min(100%,430px);max-height:85dvh;margin:auto auto 0;border-radius:20px 20px 0 0;overflow:auto}
    #inspectionChoiceDialog .dialog-body{padding:22px 16px} #inspectionChoiceTitle{text-align:center;font-size:18px}
    .inspection-choice-row{display:flex;min-height:72px;border:1px solid #e8e8e8;border-radius:12px;overflow:hidden;background:white}
    .inspection-choice-row .choice-option{flex:1;width:auto;border:0;border-radius:0;text-align:center;font-size:15px;font-weight:600}
    .inspection-choice-row:has(.inspection-example) .choice-option{text-align:left}
    .inspection-example{position:relative;flex:0 0 72px;width:72px;padding:0;border:0;border-right:1px solid #eee;background:#f6f7f8;cursor:zoom-in}
    .inspection-example img{display:block;width:72px;height:78px;object-fit:cover}
    .inspection-magnify{position:absolute;right:0;bottom:0;width:23px;height:23px;padding:4px;background:#0006;color:white}
    .inspection-how{display:block;margin:16px auto 0;padding:11px 18px;border:0;border-radius:10px;background:#f7f7f7;color:#888;font-size:13px}
    .inspection-detail .inspection-how{margin:10px 0 0;padding:8px 12px}
    .inspection-help-header{position:sticky;top:0;display:flex;align-items:center;justify-content:center;min-height:60px;background:white;border-bottom:1px solid #f2f2f2;z-index:1}
    .inspection-help-header h2{margin:0;font-size:18px}.inspection-help-close{position:absolute;right:12px;top:10px;border:0;background:none;color:#999;font-size:28px;width:40px;height:40px}
    .inspection-help-content{padding:18px 18px 28px;line-height:1.8;font-size:14px}.inspection-help-content h3{margin:0 0 10px;font-size:16px}
    .inspection-help-content p{margin:0 0 16px}.inspection-help-content img{display:block;width:100%;max-height:380px;object-fit:contain;background:#f5f6f8;border-radius:12px}
    .inspection-help-caption{display:block;color:#999;text-align:center;font-size:11px;margin-top:10px}
    .foldable-photo-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
    .foldable-photo-heading .section-kicker{margin:0;min-width:0}
    #foldablePhotoHelp{flex:none;min-height:44px;padding:6px 0 6px 8px;border:0;background:none;color:var(--orange);font:inherit;font-size:12px;cursor:pointer}
    #foldablePhotoHelp:focus-visible,.photo-guide-image:focus-visible{outline:2px solid var(--orange);outline-offset:2px;border-radius:4px}
    .photo-guide-dialog{overflow:hidden;overscroll-behavior:contain}
    .photo-guide-dialog .inspection-help-header h2{padding:0 52px;font-size:17px;text-align:center}
    .photo-guide-dialog .inspection-help-content{padding:16px 16px calc(16px + env(safe-area-inset-bottom))}
    .photo-guide-viewport{overflow:auto;max-height:calc(85dvh - 150px - env(safe-area-inset-bottom));overscroll-behavior:contain;border-radius:12px;background:#f5f6f8}
    .photo-guide-image{display:block;width:100%;padding:0;border:0;background:none;cursor:zoom-in}
    .photo-guide-image[hidden]{display:none}
    .photo-guide-image[aria-pressed="true"]{width:200%;cursor:zoom-out}
    .photo-guide-image img{width:100%;height:auto;max-height:none;border-radius:0}
    .photo-guide-dialog .inspection-help-caption{color:#666;font-size:12px}
    .photo-guide-error{margin:0;padding:20px;text-align:center;color:#666}
  `;
  document.head.append(style);
  const dialog = document.createElement('dialog');
  dialog.className = 'inspection-help-dialog';
  dialog.setAttribute('aria-labelledby', 'inspectionHelpTitle');
  dialog.innerHTML = '<header class="inspection-help-header"><h2 id="inspectionHelpTitle"></h2><button type="button" class="inspection-help-close">×</button></header><div class="inspection-help-content"></div>';
  document.body.append(dialog);
  dialog.querySelector('button').onclick = () => dialog.close();
  const photoHelpButton = document.getElementById('foldablePhotoHelp');
  if (photoHelpButton) {
    const photoDialog = document.createElement('dialog');
    photoDialog.id = 'foldablePhotoGuideDialog';
    photoDialog.className = 'inspection-help-dialog photo-guide-dialog';
    photoDialog.setAttribute('aria-labelledby', 'foldablePhotoGuideTitle');
    photoDialog.setAttribute('data-no-i18n', '');
    photoDialog.innerHTML = '<header class="inspection-help-header"><h2 id="foldablePhotoGuideTitle"></h2><button type="button" class="inspection-help-close">×</button></header><div class="inspection-help-content"><div class="photo-guide-viewport"><button type="button" class="photo-guide-image" aria-pressed="false"><img draggable="false"></button><p class="photo-guide-error" role="status" hidden></p></div><small class="inspection-help-caption"></small></div>';
    document.body.append(photoDialog);
    const close = photoDialog.querySelector('.inspection-help-close');
    const viewport = photoDialog.querySelector('.photo-guide-viewport');
    const imageButton = photoDialog.querySelector('.photo-guide-image');
    const img = imageButton.querySelector('img');
    const caption = photoDialog.querySelector('.inspection-help-caption');
    const error = photoDialog.querySelector('.photo-guide-error');
    let returnState = null;
    const setZoom = (zoomed) => {
      imageButton.setAttribute('aria-pressed', String(zoomed));
      imageButton.setAttribute('aria-label', zoomed ? t('缩小拍照指引图片', 'Zoom out of photo guide') : t('放大拍照指引图片', 'Zoom into photo guide'));
      caption.textContent = zoomed ? t('滑动查看细节，点击图片缩小', 'Scroll to see details. Tap image to zoom out.') : t('点击图片放大查看', 'Tap image to zoom in');
      viewport.scrollTo(0, 0);
    };
    imageButton.onclick = () => setZoom(imageButton.getAttribute('aria-pressed') !== 'true');
    img.onerror = () => {
      imageButton.hidden = true;
      error.hidden = false;
      error.textContent = t('图片暂时无法加载，请关闭后重试。', 'Image could not load. Close and try again.');
      caption.textContent = '';
    };
    close.onclick = () => photoDialog.close();
    photoDialog.addEventListener('close', () => {
      if (!returnState) return;
      document.documentElement.style.overflow = returnState.htmlOverflow;
      document.body.style.overflow = returnState.bodyOverflow;
      photoHelpButton.focus({ preventScroll: true });
      window.scrollTo({ left: returnState.x, top: returnState.y, behavior: 'instant' });
      returnState = null;
    });
    photoHelpButton.onclick = () => {
      if (photoDialog.open) return;
      photoDialog.querySelector('h2').textContent = t('折叠屏拍照指引', 'Foldable photo guide');
      close.setAttribute('aria-label', t('关闭拍照指引', 'Close photo guide'));
      imageButton.hidden = false;
      error.hidden = true;
      setZoom(false);
      img.alt = t('亮屏照片与暗屏照片的拍摄示意图', 'Illustrated guide to screen-on and screen-off photos');
      img.src = 'assets/foldable-photo-guide-' + (en() ? 'en' : 'zh') + '.svg';
      returnState = { x: window.scrollX, y: window.scrollY, htmlOverflow: document.documentElement.style.overflow, bodyOverflow: document.body.style.overflow };
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      photoDialog.showModal();
      close.focus({ preventScroll: true });
    };
  }
  function illustration(title, value) {
    // Code-native schematic, explicitly labelled rather than implying a real device photo.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="350" viewBox="0 0 320 350"><rect width="320" height="350" fill="#f3f4f6"/><rect x="60" y="15" width="200" height="312" rx="26" fill="#282a2f"/><rect x="67" y="23" width="186" height="296" rx="20" fill="#fff"/><rect x="126" y="28" width="68" height="14" rx="7" fill="#282a2f"/><text x="160" y="84" text-anchor="middle" font-family="Arial" font-size="17" font-weight="bold">${title}</text><path d="M80 108h160M80 148h160M80 230h160" stroke="#eee"/><text x="86" y="134" font-family="Arial" font-size="11" fill="#888">Settings / Device information</text><rect x="77" y="161" width="166" height="52" rx="6" fill="#fff3ed" stroke="#ff6635"/><text x="160" y="192" text-anchor="middle" font-family="Arial" font-size="16" fill="#e75022">${value}</text><text x="160" y="280" text-anchor="middle" font-family="Arial" font-size="11" fill="#999">Illustrative example</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function openHelp(name, answer) {
    const guide = guides[name];
    const note = answer ? valueNotes[answer] : null;
    document.getElementById('inspectionHelpTitle').textContent = answer ? t('属性值示例', 'Value example') : t('查询方法', 'How to check');
    dialog.querySelector('button').ariaLabel = t('关闭', 'Close');
    const body = dialog.querySelector('.inspection-help-content');
    body.replaceChildren();
    const heading = document.createElement('h3'); heading.textContent = answer || name;
    const p = document.createElement('p'); p.textContent = note ? t(note[0], note[1]) : t(guide[0], guide[1]);
    const img = document.createElement('img'); img.src = illustration(guide[2], note?.[2] || guide[3]); img.alt = t('查看位置示意图', 'Illustration of where to check');
    const caption = document.createElement('small'); caption.className = 'inspection-help-caption'; caption.textContent = t('示意图，仅展示查看位置；以实际设备信息为准。', 'Illustration only. Refer to the actual device information.');
    body.append(heading, p, img, caption);
    dialog.showModal();
  }
  function helpButton(name) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'inspection-how';
    button.textContent = t('如何查看' + name + '？', 'How to check ' + guides[name][2] + '?'); button.onclick = () => openHelp(name); return button;
  }
  document.querySelectorAll('[data-inspection-item]').forEach(row => {
    const name = row.querySelector('strong').firstChild.textContent.trim();
    if (guides[name]) row.querySelector('.inspection-detail').append(helpButton(name));
  });
  window.InspectionHelp = {
    decorateChoices(name) {
      const options = document.getElementById('inspectionChoiceOptions');
      options.querySelectorAll('.choice-option').forEach(option => {
        const answer = option.textContent;
        const note = valueNotes[answer];
        const row = document.createElement('div'); row.className = 'inspection-choice-row';
        option.replaceWith(row);
        if (note?.[2]) {
          const preview = document.createElement('button'); preview.type = 'button'; preview.className = 'inspection-example';
          preview.ariaLabel = t('查看“' + answer + '”示例图', 'View example: ' + note[2]);
          const img = document.createElement('img'); img.src = illustration(guides[name][2], note[2]); img.alt = '';
          preview.append(img);
          const magnify = document.createElement('span'); magnify.className = 'inspection-magnify'; magnify.setAttribute('aria-hidden', 'true');
          magnify.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="10" cy="10" r="7"/><path d="m15 15 7 7"/></svg>';
          preview.append(magnify); preview.onclick = () => openHelp(name, answer); row.append(preview);
        }
        row.append(option);
      });
      options.append(helpButton(name));
    }
  };
})();
