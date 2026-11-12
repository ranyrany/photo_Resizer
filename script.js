/**
 * Smart Image Resizer - Photo Resizing & Aspect Ratio Editing Engine
 * Features:
 *  - 1. Aspect Ratio Mode (1:1, 3:4, 4:3, 9:16, 16:9, Custom W:H)
 *  - 2. Exact Dimension Mode (mm, cm, inch, px) with DPI support (Passport, ID, 4x6, etc.)
 *  - 3. Smart Compression & Target File Size Limiter (e.g. Under 300KB / 500KB)
 *  - 4. Padding (Custom color & transparent PNG) vs Center Cropping
 *  - 5. Clipboard Paste (Ctrl + V) instant image upload
 *  - 6. 90° Clockwise / Counter-Clockwise Rotation
 *  - 7. High-Resolution Large Preview Modal on Thumbnail click
 *  - 8. Real-time progress tracking, single download, and batch ZIP export.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements - Main
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const browseBtn = document.getElementById('browseBtn');
  const queueSection = document.getElementById('queueSection');
  const fileList = document.getElementById('fileList');
  const queueCount = document.getElementById('queueCount');
  const batchDownloadBtn = document.getElementById('batchDownloadBtn');
  const currentSettingsBadge = document.getElementById('currentSettingsBadge');

  // Mode Switcher (Ratio vs Exact Dimension)
  const tabRatioMode = document.getElementById('tabRatioMode');
  const tabDimensionMode = document.getElementById('tabDimensionMode');
  const ratioBlock = document.getElementById('ratioBlock');
  const dimensionBlock = document.getElementById('dimensionBlock');

  // Ratio Controls
  const ratioBtns = document.querySelectorAll('.ratio-btn');
  const customRatioWrap = document.getElementById('customRatioWrap');
  const customWidthInput = document.getElementById('customWidth');
  const customHeightInput = document.getElementById('customHeight');
  const customRatioBadge = document.getElementById('customRatioBadge');

  // Dimension Controls (cm, mm, inch, px + DPI)
  const dimWidthInput = document.getElementById('dimWidthInput');
  const dimHeightInput = document.getElementById('dimHeightInput');
  const dimUnitSelect = document.getElementById('dimUnitSelect');
  const dimDpiSelect = document.getElementById('dimDpiSelect');
  const dimDpiGroup = document.getElementById('dimDpiGroup');
  const calcPixelBadge = document.getElementById('calcPixelBadge');
  const dimChips = document.querySelectorAll('.dim-chip');

  // Fit Mode Controls (Padding vs Crop)
  const fitModeBtns = document.querySelectorAll('.fit-mode-btn');
  const paddingColorPanel = document.getElementById('paddingColorPanel');
  const colorChips = document.querySelectorAll('.color-chip');
  const customColorInput = document.getElementById('customColorInput');
  const customColorText = document.getElementById('customColorText');

  // Compression Controls (Quality Slider vs Target File Size)
  const compressRadios = document.querySelectorAll('input[name="compressStrategy"]');
  const smartQualityPanel = document.getElementById('smartQualityPanel');
  const targetSizePanel = document.getElementById('targetSizePanel');
  const qualityRange = document.getElementById('qualityRange');
  const qualityValBadge = document.getElementById('qualityValBadge');
  const targetChips = document.querySelectorAll('.target-chip');
  const customTargetKbInput = document.getElementById('customTargetKbInput');
  const targetStatusBadge = document.getElementById('targetStatusBadge');
  const compressGuidelineText = document.getElementById('compressGuidelineText');

  // Preview Modal Elements
  const previewModal = document.getElementById('previewModal');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalFileName = document.getElementById('modalFileName');
  const modalBadge = document.getElementById('modalBadge');
  const modalPreviewImg = document.getElementById('modalPreviewImg');
  const modalDownloadBtn = document.getElementById('modalDownloadBtn');
  let activeModalJob = null;

  // ========================================================
  // Global State Configuration
  // ========================================================
  let currentResizeType = 'ratio'; // 'ratio' | 'dimension'

  let currentRatio = { type: '1:1', w: 1, h: 1 };
  let currentDimension = {
    w: 35,
    h: 45,
    unit: 'mm',
    dpi: 300,
    presetName: '여권 (35×45mm)'
  };

  let currentFitMode = 'padding'; // 'padding' | 'crop'
  let currentPaddingColor = '#ffffff'; // hex or 'transparent'

  let currentCompress = {
    strategy: 'smartQuality', // 'smartQuality' | 'targetSize'
    quality: 0.85,            // 0.2 ~ 1.0
    targetKb: 300             // in Kilobytes
  };

  // Stores all file job records: id -> Job
  const fileJobs = new Map();

  // ========================================================
  // 1. Resize Mode Switcher (비율 vs 실제 치수)
  // ========================================================
  tabRatioMode.addEventListener('click', () => {
    tabRatioMode.classList.add('active');
    tabDimensionMode.classList.remove('active');
    ratioBlock.style.display = 'flex';
    dimensionBlock.style.display = 'none';
    currentResizeType = 'ratio';
    updateSettingsBadge();
  });

  tabDimensionMode.addEventListener('click', () => {
    tabDimensionMode.classList.add('active');
    tabRatioMode.classList.remove('active');
    dimensionBlock.style.display = 'flex';
    ratioBlock.style.display = 'none';
    currentResizeType = 'dimension';
    updateDimensionCalculations();
    updateSettingsBadge();
  });

  // ========================================================
  // 2. Aspect Ratio Controls (요구사항 4)
  // ========================================================
  ratioBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      ratioBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const radio = btn.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;

      const ratioType = btn.dataset.ratio;
      if (ratioType === 'custom') {
        customRatioWrap.style.display = 'flex';
        updateCustomRatioFromInputs();
      } else {
        customRatioWrap.style.display = 'none';
        currentRatio = {
          type: ratioType,
          w: parseFloat(btn.dataset.w) || 1,
          h: parseFloat(btn.dataset.h) || 1
        };
      }
      updateSettingsBadge();
    });
  });

  [customWidthInput, customHeightInput].forEach(inp => {
    inp.addEventListener('input', () => {
      updateCustomRatioFromInputs();
      updateSettingsBadge();
    });
  });

  function updateCustomRatioFromInputs() {
    let w = parseFloat(customWidthInput.value) || 1;
    let h = parseFloat(customHeightInput.value) || 1;
    if (w <= 0) w = 1;
    if (h <= 0) h = 1;
    currentRatio = {
      type: 'custom',
      w,
      h
    };
    customRatioBadge.textContent = `${w}:${h} 커스텀 비율`;
  }

  // ========================================================
  // 3. Exact Dimension Controls (cm, mm, inch, px + DPI) (신규 확장)
  // ========================================================
  [dimWidthInput, dimHeightInput].forEach(inp => {
    inp.addEventListener('input', () => {
      currentDimension.presetName = '';
      dimChips.forEach(c => c.classList.remove('active'));
      updateDimensionCalculations();
    });
  });

  dimUnitSelect.addEventListener('change', () => {
    const unit = dimUnitSelect.value;
    if (unit === 'px') {
      dimDpiGroup.style.display = 'none';
    } else {
      dimDpiGroup.style.display = 'flex';
    }
    updateDimensionCalculations();
  });

  dimDpiSelect.addEventListener('change', () => {
    updateDimensionCalculations();
  });

  // Quick Preset Chips (Passport, ID card, 4x6 inch, etc.)
  dimChips.forEach(chip => {
    chip.addEventListener('click', () => {
      dimChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const w = parseFloat(chip.dataset.w);
      const h = parseFloat(chip.dataset.h);
      const unit = chip.dataset.unit;
      const dpi = parseInt(chip.dataset.dpi, 10);

      dimWidthInput.value = w;
      dimHeightInput.value = h;
      dimUnitSelect.value = unit;
      dimDpiSelect.value = dpi;

      if (unit === 'px') {
        dimDpiGroup.style.display = 'none';
      } else {
        dimDpiGroup.style.display = 'flex';
      }

      currentDimension.presetName = chip.textContent.trim();
      updateDimensionCalculations();
    });
  });

  function updateDimensionCalculations() {
    const w = parseFloat(dimWidthInput.value) || 1;
    const h = parseFloat(dimHeightInput.value) || 1;
    const unit = dimUnitSelect.value;
    const dpi = parseInt(dimDpiSelect.value, 10) || 300;

    currentDimension.w = w;
    currentDimension.h = h;
    currentDimension.unit = unit;
    currentDimension.dpi = dpi;

    const pxDim = convertUnitsToPixels(w, h, unit, dpi);
    calcPixelBadge.textContent = `${pxDim.w} × ${pxDim.h} px`;
    updateSettingsBadge();
  }

  function convertUnitsToPixels(w, h, unit, dpi) {
    let pxW, pxH;
    switch (unit) {
      case 'mm':
        pxW = Math.round((w / 25.4) * dpi);
        pxH = Math.round((h / 25.4) * dpi);
        break;
      case 'cm':
        pxW = Math.round((w / 2.54) * dpi);
        pxH = Math.round((h / 2.54) * dpi);
        break;
      case 'inch':
        pxW = Math.round(w * dpi);
        pxH = Math.round(h * dpi);
        break;
      case 'px':
      default:
        pxW = Math.round(w);
        pxH = Math.round(h);
        break;
    }
    return { w: Math.max(1, pxW), h: Math.max(1, pxH) };
  }

  // ========================================================
  // 4. Fit Mode Selection Controls (요구사항 5, 6, 7)
  // ========================================================
  fitModeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      fitModeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const radio = btn.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;

      currentFitMode = btn.dataset.mode; // 'padding' or 'crop'

      if (currentFitMode === 'crop') {
        paddingColorPanel.classList.add('disabled');
      } else {
        paddingColorPanel.classList.remove('disabled');
      }
      updateSettingsBadge();
    });
  });

  // ========================================================
  // 5. Padding Color Controls (요구사항 6)
  // ========================================================
  colorChips.forEach(chip => {
    chip.addEventListener('click', () => {
      colorChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const col = chip.dataset.color;
      currentPaddingColor = col;

      if (col !== 'transparent') {
        customColorInput.value = col;
        customColorText.value = col.toUpperCase();
      } else {
        customColorText.value = '투명 (PNG)';
      }
      updateSettingsBadge();
    });
  });

  customColorInput.addEventListener('input', (e) => {
    const col = e.target.value;
    currentPaddingColor = col;
    customColorText.value = col.toUpperCase();
    colorChips.forEach(c => c.classList.remove('active'));
    updateSettingsBadge();
  });

  customColorText.addEventListener('change', (e) => {
    let val = e.target.value.trim();
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      currentPaddingColor = val;
      customColorInput.value = val;
      customColorText.value = val.toUpperCase();
      colorChips.forEach(c => c.classList.remove('active'));
      updateSettingsBadge();
    }
  });

  // ========================================================
  // 6. Compression & Target File Size Controls (신규 확장)
  // ========================================================
  compressRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      document.querySelectorAll('.compress-radio').forEach(lbl => lbl.classList.remove('active'));
      e.target.closest('.compress-radio').classList.add('active');

      const strategy = e.target.value;
      currentCompress.strategy = strategy;

      if (strategy === 'targetSize') {
        smartQualityPanel.style.display = 'none';
        targetSizePanel.style.display = 'flex';
        compressGuidelineText.innerHTML = `목표 용량 한도: 사진 크기를 <strong>최대 ${currentCompress.targetKb} KB 이하</strong>로 엄격하게 자동 맞춤합니다.`;
      } else {
        smartQualityPanel.style.display = 'flex';
        targetSizePanel.style.display = 'none';
        compressGuidelineText.innerHTML = `스마트 화질: <strong>품질 ${Math.round(currentCompress.quality * 100)}%</strong>로 고해상도를 유지하며 약 60% ~ 80% 압축합니다.`;
      }
      updateSettingsBadge();
    });
  });

  // Quality Range Slider
  qualityRange.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    currentCompress.quality = val / 100;
    let label = '보통';
    if (val >= 90) label = '초고화질';
    else if (val >= 75) label = '고화질 권장';
    else if (val >= 50) label = '경량 최적화';
    else label = '초경량 압축';

    qualityValBadge.textContent = `${val}% (${label})`;
    compressGuidelineText.innerHTML = `품질 <strong>${val}%</strong> 적용: 선명도와 파일 크기(수십 KB ~ 수백 KB)를 최적 균형으로 압축합니다.`;
    updateSettingsBadge();
  });

  // Target KB Chips
  targetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      targetChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const kb = parseInt(chip.dataset.kb, 10);
      currentCompress.targetKb = kb;
      customTargetKbInput.value = kb;
      targetStatusBadge.textContent = `최대 ${kb >= 1024 ? (kb / 1024) + ' MB' : kb + ' KB'}로 자동 최적화`;
      compressGuidelineText.innerHTML = `목표 용량 한도: 사진 크기를 <strong>최대 ${kb >= 1024 ? (kb / 1024) + ' MB' : kb + ' KB'} 이하</strong>로 엄격하게 자동 맞춤합니다.`;
      updateSettingsBadge();
    });
  });

  customTargetKbInput.addEventListener('input', () => {
    let kb = parseInt(customTargetKbInput.value, 10) || 100;
    if (kb <= 10) kb = 10;
    currentCompress.targetKb = kb;
    targetChips.forEach(c => c.classList.remove('active'));
    targetStatusBadge.textContent = `최대 ${kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB'}로 자동 최적화`;
    compressGuidelineText.innerHTML = `목표 용량 한도: 사진 크기를 <strong>최대 ${kb} KB 이하</strong>로 엄격하게 자동 맞춤합니다.`;
    updateSettingsBadge();
  });

  // Top Settings Badge Updater
  function updateSettingsBadge() {
    let sizeDesc = '';
    if (currentResizeType === 'ratio') {
      const ratioStr = currentRatio.type === 'custom' 
        ? `${currentRatio.w}:${currentRatio.h}` 
        : currentRatio.type;
      sizeDesc = `비율 ${ratioStr}`;
    } else {
      const pxDim = convertUnitsToPixels(currentDimension.w, currentDimension.h, currentDimension.unit, currentDimension.dpi);
      const label = currentDimension.presetName ? `${currentDimension.presetName} ` : '';
      sizeDesc = `${label}${currentDimension.w}${currentDimension.unit} (${pxDim.w}×${pxDim.h}px)`;
    }

    const modeStr = currentFitMode === 'padding' 
      ? `Padding (${currentPaddingColor === 'transparent' ? '투명' : currentPaddingColor.toUpperCase()})` 
      : 'Crop (자르기)';

    const compStr = currentCompress.strategy === 'targetSize'
      ? `🎯 최대 ${currentCompress.targetKb}KB 이하`
      : `⚡ 품질 ${Math.round(currentCompress.quality * 100)}%`;

    currentSettingsBadge.textContent = `${sizeDesc} • ${modeStr} • ${compStr}`;
  }

  // ========================================================
  // 7. File Upload & Drag & Drop Handling (요구사항 3)
  // ========================================================
  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropzone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleNewFiles(Array.from(e.target.files));
      fileInput.value = '';
    }
  });

  ['dragenter', 'dragover'].forEach(evtName => {
    window.addEventListener(evtName, (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-active');
    }, false);
  });

  ['dragleave', 'dragend'].forEach(evtName => {
    window.addEventListener(evtName, (e) => {
      e.preventDefault();
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        dropzone.classList.remove('drag-active');
      }
    }, false);
  });

  dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-active');
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-active');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleNewFiles(Array.from(e.dataTransfer.files));
    }
  });

  // Clipboard Paste (Ctrl + V) Handler
  window.addEventListener('paste', (e) => {
    if (!e.clipboardData || !e.clipboardData.items) return;

    const files = [];
    for (let i = 0; i < e.clipboardData.items.length; i++) {
      const item = e.clipboardData.items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const ext = file.type.split('/')[1] || 'png';
          const pastedFile = new File([file], `clipboard_${timestamp}.${ext}`, { type: file.type });
          files.push(pastedFile);
        }
      }
    }

    if (files.length > 0) {
      handleNewFiles(files);
      showToast(`📋 클립보드에서 ${files.length}개의 사진을 성공적으로 붙여넣었습니다!`);
    }
  });

  // ========================================================
  // 8. File Queue Controller (요구사항 8, 9)
  // ========================================================
  function handleNewFiles(files) {
    const validImageFiles = files.filter(f => f.type.startsWith('image/') || f.name.match(/\.(jpg|jpeg|png|webp|bmp|gif)$/i));

    if (validImageFiles.length === 0) {
      showToast('⚠️ 지원되는 이미지 파일(.jpg, .png, .webp, .bmp 등)을 선택해 주세요.');
      return;
    }

    queueSection.style.display = 'flex';

    // Snapshot of current configuration settings for these jobs
    const currentSettings = {
      resizeType: currentResizeType,
      ratio: { ...currentRatio },
      dimension: { ...currentDimension },
      fitMode: currentFitMode,
      paddingColor: currentPaddingColor,
      compress: { ...currentCompress }
    };

    validImageFiles.forEach(file => {
      const id = 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

      const job = {
        id,
        file,
        name: file.name,
        originalSize: file.size,
        settings: currentSettings,
        rotation: 0,
        originalWidth: 0,
        originalHeight: 0,
        targetWidth: 0,
        targetHeight: 0,
        resultBlob: null,
        resultSize: 0,
        thumbnailDataUrl: null,
        status: 'pending',
        progress: 0
      };

      fileJobs.set(id, job);
      renderFileCard(job);
      processImageResize(job);
    });

    updateQueueCount();
  }

  // ========================================================
  // 9. Render File Card (요구사항 8, 9, 회전, 모달, 용량변화)
  // ========================================================
  function renderFileCard(job) {
    const card = document.createElement('div');
    card.id = job.id;
    card.className = 'file-card';

    let specLabel = '';
    if (job.settings.resizeType === 'ratio') {
      const ratioLabel = job.settings.ratio.type === 'custom' 
        ? `${job.settings.ratio.w}:${job.settings.ratio.h}` 
        : job.settings.ratio.type;
      specLabel = `비율 ${ratioLabel}`;
    } else {
      specLabel = `${job.settings.dimension.w}${job.settings.dimension.unit}`;
    }
    const modeLabel = job.settings.fitMode === 'padding' ? 'Padding' : 'Crop';

    card.innerHTML = `
      <div class="file-card-top">
        <div class="file-info-side">
          <div class="file-thumb-box" id="${job.id}_thumbBox" title="클릭하여 대형 화면으로 미리보기">
            <i class="fa-regular fa-image file-thumb-placeholder"></i>
          </div>

          <div class="file-name-group">
            <span class="file-name-text" title="${escapeHtml(job.name)}">${escapeHtml(job.name)}</span>
            <div class="file-meta-row">
              <span class="meta-orig-res" id="${job.id}_origRes">분석 중...</span>
              <span class="meta-arrow">→</span>
              <span class="meta-target-res" id="${job.id}_targetRes">계산 중...</span>
              <span class="meta-settings-tag" id="${job.id}_settingsTag">${specLabel} • ${modeLabel}</span>
              <span class="meta-size-change" id="${job.id}_sizeChange" style="display: none;"></span>
            </div>
          </div>
        </div>

        <div class="file-action-side">
          <button class="btn-rotate-card" id="${job.id}_rotLeftBtn" title="반시계방향 90° 회전">
            <i class="fa-solid fa-rotate-left"></i>
          </button>
          <button class="btn-rotate-card" id="${job.id}_rotRightBtn" title="시계방향 90° 회전">
            <i class="fa-solid fa-rotate-right"></i>
          </button>
          <button id="${job.id}_downloadBtn" class="btn-download-file" disabled title="리사이즈된 이미지 다운로드">
            <i class="fa-solid fa-download"></i>
            <span>다운로드</span>
          </button>
          <button id="${job.id}_removeBtn" class="btn-remove-file" title="목록에서 제거">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <div class="progress-container">
        <div class="progress-track">
          <div class="progress-fill" id="${job.id}_progressFill"></div>
        </div>
        <div class="progress-meta-row">
          <span class="progress-status-text" id="${job.id}_statusText">
            <i class="fa-solid fa-spinner fa-spin"></i> 대기열 등록 완료...
          </span>
          <span class="progress-percent-text" id="${job.id}_percentText">0%</span>
        </div>
      </div>
    `;

    fileList.prepend(card);

    // 썸네일 클릭 시 대형 모달 오픈
    const thumbBox = document.getElementById(`${job.id}_thumbBox`);
    thumbBox.addEventListener('click', () => {
      if (job.status === 'completed' && job.thumbnailDataUrl) {
        openPreviewModal(job);
      }
    });

    // 회전 버튼 이벤트
    const rotLeftBtn = document.getElementById(`${job.id}_rotLeftBtn`);
    rotLeftBtn.addEventListener('click', () => {
      job.rotation = (job.rotation - 90 + 360) % 360;
      processImageResize(job);
      showToast(`🔄 "${job.name}" 90° 좌회전 적용 중...`);
    });

    const rotRightBtn = document.getElementById(`${job.id}_rotRightBtn`);
    rotRightBtn.addEventListener('click', () => {
      job.rotation = (job.rotation + 90) % 360;
      processImageResize(job);
      showToast(`🔄 "${job.name}" 90° 우회전 적용 중...`);
    });

    // 개별 다운로드 버튼
    const downloadBtn = document.getElementById(`${job.id}_downloadBtn`);
    downloadBtn.addEventListener('click', () => {
      if (job.resultBlob) {
        triggerDownload(job.resultBlob, getOutputFilename(job));
      }
    });

    // 제거 버튼
    const removeBtn = document.getElementById(`${job.id}_removeBtn`);
    removeBtn.addEventListener('click', () => {
      card.remove();
      fileJobs.delete(job.id);
      updateQueueCount();
      if (fileJobs.size === 0) {
        queueSection.style.display = 'none';
      }
    });
  }

  // ========================================================
  // 10. Core Resizing & Adaptive Compression Engine
  // ========================================================
  async function processImageResize(job) {
    const progressFill = document.getElementById(`${job.id}_progressFill`);
    const statusText = document.getElementById(`${job.id}_statusText`);
    const percentText = document.getElementById(`${job.id}_percentText`);
    const downloadBtn = document.getElementById(`${job.id}_downloadBtn`);
    const thumbBox = document.getElementById(`${job.id}_thumbBox`);
    const origResEl = document.getElementById(`${job.id}_origRes`);
    const targetResEl = document.getElementById(`${job.id}_targetRes`);
    const settingsTag = document.getElementById(`${job.id}_settingsTag`);
    const sizeChangeEl = document.getElementById(`${job.id}_sizeChange`);
    const cardEl = document.getElementById(job.id);

    // Reset progress UI on re-run
    if (progressFill) {
      progressFill.classList.remove('done');
      progressFill.style.width = '10%';
    }
    if (percentText) {
      percentText.classList.remove('done');
      percentText.textContent = '10%';
    }
    if (downloadBtn) {
      downloadBtn.disabled = true;
      downloadBtn.classList.remove('active');
    }

    function updateProgress(percent, msg) {
      job.progress = percent;
      if (progressFill) progressFill.style.width = percent + '%';
      if (percentText) percentText.textContent = percent + '%';
      if (statusText) {
        if (percent >= 100) {
          statusText.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #10b981;"></i> 리사이즈 & 압축 완료!';
        } else {
          statusText.innerHTML = `<i class="fa-solid fa-gear fa-spin" style="color: #6366f1;"></i> ${msg}`;
        }
      }
    }

    try {
      updateProgress(15, '원본 이미지 파일 디코딩 중...');

      // 1. Read Image File
      const img = await loadImageFromFile(job.file);
      job.originalWidth = img.naturalWidth || img.width;
      job.originalHeight = img.naturalHeight || img.height;

      const isSwapped = (job.rotation === 90 || job.rotation === 270);
      const effectiveW = isSwapped ? job.originalHeight : job.originalWidth;
      const effectiveH = isSwapped ? job.originalWidth : job.originalHeight;

      if (origResEl) {
        const rotText = job.rotation > 0 ? ` (${job.rotation}°)` : '';
        origResEl.textContent = `${effectiveW}×${effectiveH}${rotText}`;
      }

      await sleep(80);
      updateProgress(35, '목표 치수 및 캔버스 비율 계산 중...');

      // 2. Compute Canvas Dimensions based on selected mode (비율 or 실제 치수)
      let targetDimensions;
      if (job.settings.resizeType === 'dimension') {
        const dim = job.settings.dimension;
        targetDimensions = convertUnitsToPixels(dim.w, dim.h, dim.unit, dim.dpi);
      } else {
        const targetRatio = job.settings.ratio.w / job.settings.ratio.h;
        targetDimensions = computeCanvasDimensions(effectiveW, effectiveH, targetRatio);
      }

      job.targetWidth = targetDimensions.w || targetDimensions.canvasW;
      job.targetHeight = targetDimensions.h || targetDimensions.canvasH;

      if (targetResEl) {
        targetResEl.textContent = `${job.targetWidth}×${job.targetHeight} px`;
      }

      if (settingsTag) {
        let modeLabel = job.settings.fitMode === 'padding' ? 'Padding' : 'Crop';
        let specStr = job.settings.resizeType === 'dimension'
          ? `${job.settings.dimension.w}${job.settings.dimension.unit}`
          : (job.settings.ratio.type === 'custom' ? `${job.settings.ratio.w}:${job.settings.ratio.h}` : job.settings.ratio.type);
        const rotLabel = job.rotation > 0 ? ` • ${job.rotation}°` : '';
        settingsTag.textContent = `${specStr} • ${modeLabel}${rotLabel}`;
      }

      await sleep(100);
      updateProgress(55, job.settings.fitMode === 'padding' ? '여백(Padding) 배경 채우기 및 정렬 중...' : '스마트 크롭(Crop) 렌더링 중...');

      // 3. Render Canvas with High Fidelity & Rotation
      const canvas = document.createElement('canvas');
      canvas.width = job.targetWidth;
      canvas.height = job.targetHeight;
      const ctx = canvas.getContext('2d', { alpha: true });

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // (A) Padding Mode
      if (job.settings.fitMode === 'padding') {
        const color = job.settings.paddingColor;
        if (color === 'transparent') {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        } else {
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        const scale = Math.min(canvas.width / effectiveW, canvas.height / effectiveH);
        const drawW = Math.round(effectiveW * scale);
        const drawH = Math.round(effectiveH * scale);

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((job.rotation * Math.PI) / 180);

        const imgDrawW = isSwapped ? drawH : drawW;
        const imgDrawH = isSwapped ? drawW : drawH;
        ctx.drawImage(img, -imgDrawW / 2, -imgDrawH / 2, imgDrawW, imgDrawH);
        ctx.restore();
      } 
      // (B) Crop Mode
      else {
        const scale = Math.max(canvas.width / effectiveW, canvas.height / effectiveH);
        const drawW = Math.round(effectiveW * scale);
        const drawH = Math.round(effectiveH * scale);

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((job.rotation * Math.PI) / 180);

        const imgDrawW = isSwapped ? drawH : drawW;
        const imgDrawH = isSwapped ? drawW : drawH;
        ctx.drawImage(img, -imgDrawW / 2, -imgDrawH / 2, imgDrawW, imgDrawH);
        ctx.restore();
      }

      await sleep(80);
      updateProgress(75, '고효율 용량 압축 & 최적화 인코딩 중...');

      // 4. Adaptive Compression Engine (목표 용량 제한 or 스마트 화질)
      const outMime = determineOutputMime(job.name, job.settings);
      const compressResult = await performAdaptiveCompression(canvas, outMime, job.settings.compress);

      job.resultBlob = compressResult.blob;
      job.resultSize = compressResult.blob.size;
      job.status = 'completed';

      // 5. Update Thumbnail & Modal Preview
      job.thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.82);
      if (thumbBox) {
        thumbBox.innerHTML = `<img src="${job.thumbnailDataUrl}" class="file-thumb-img" alt="Thumbnail">`;
      }

      if (activeModalJob && activeModalJob.id === job.id) {
        modalPreviewImg.src = job.thumbnailDataUrl;
      }

      // Update Size Change Tag
      if (sizeChangeEl) {
        sizeChangeEl.style.display = 'inline-flex';
        const origStr = formatBytes(job.originalSize);
        const resStr = formatBytes(job.resultSize);
        const savedBytes = Math.max(0, job.originalSize - job.resultSize);
        const savedPercent = Math.round((savedBytes / job.originalSize) * 100);

        if (job.settings.compress.strategy === 'targetSize') {
          const okIcon = (job.resultSize <= job.settings.compress.targetKb * 1024) ? '✔' : '';
          sizeChangeEl.innerHTML = `${origStr} → <strong>${resStr}</strong> (${okIcon} 목표 달성)`;
          sizeChangeEl.style.background = '#fee2e2';
          sizeChangeEl.style.color = '#b91c1c';
        } else {
          sizeChangeEl.innerHTML = `${origStr} → <strong>${resStr}</strong> (-${savedPercent}%)`;
          sizeChangeEl.style.background = '#d1fae5';
          sizeChangeEl.style.color = '#059669';
        }
      }

      await sleep(80);
      updateProgress(100, '리사이즈 & 압축 완료!');

      // Complete UI State
      if (progressFill) progressFill.classList.add('done');
      if (percentText) percentText.classList.add('done');
      if (cardEl) cardEl.classList.add('completed');

      // Activate Download Button
      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.classList.add('active');
      }

      updateBatchDownloadState();
    } catch (err) {
      console.error('Image resize error:', err);
      if (statusText) {
        statusText.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i> 오류: ${err.message || '리사이즈 실패'}`;
      }
    }
  }

  // ========================================================
  // 11. Binary Search Target File Size Compression Engine ⭐
  // ========================================================
  async function performAdaptiveCompression(canvas, outMime, compressSettings) {
    // A) Smart Quality Mode
    if (compressSettings.strategy === 'smartQuality' || outMime === 'image/png') {
      const q = (outMime === 'image/png') ? 1.0 : compressSettings.quality;
      const blob = await new Promise(res => canvas.toBlob(res, outMime, q));
      return { blob, quality: q };
    }

    // B) Target Max File Size Mode (Binary Search)
    const targetBytes = compressSettings.targetKb * 1024;
    let low = 0.05;
    let high = 0.95;
    let bestBlob = null;
    let bestQuality = low;

    // Try maximum quality first
    let blob = await new Promise(res => canvas.toBlob(res, outMime, high));
    if (blob.size <= targetBytes) {
      return { blob, quality: high };
    }

    // Perform 6 iterations of binary search to find highest quality under targetBytes
    for (let i = 0; i < 6; i++) {
      const mid = (low + high) / 2;
      blob = await new Promise(res => canvas.toBlob(res, outMime, mid));
      if (blob.size <= targetBytes) {
        bestBlob = blob;
        bestQuality = mid;
        low = mid; // Try higher quality
      } else {
        high = mid; // Exceeds target, lower quality
      }
    }

    // If even lowest quality (0.05) exceeds target, downscale canvas slightly to strictly fulfill target
    if (!bestBlob) {
      let scale = 0.85;
      while (scale >= 0.25) {
        const scaledCanvas = document.createElement('canvas');
        scaledCanvas.width = Math.round(canvas.width * scale);
        scaledCanvas.height = Math.round(canvas.height * scale);
        const sCtx = scaledCanvas.getContext('2d');
        sCtx.imageSmoothingQuality = 'high';
        sCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);

        blob = await new Promise(res => scaledCanvas.toBlob(res, outMime, 0.70));
        if (blob.size <= targetBytes) {
          return { blob, quality: 0.70, scale };
        }
        scale -= 0.15;
      }
      return { blob: blob || bestBlob, quality: 0.5 };
    }

    return { blob: bestBlob, quality: bestQuality };
  }

  // Dimension Calculation Helper for Aspect Ratios
  function computeCanvasDimensions(origW, origH, targetRatio) {
    const MAX_DIM = 2560;
    let canvasW, canvasH;

    if (targetRatio >= 1) {
      canvasW = Math.min(MAX_DIM, Math.max(origW, Math.round(origH * targetRatio)));
      canvasH = Math.round(canvasW / targetRatio);
    } else {
      canvasH = Math.min(MAX_DIM, Math.max(origH, Math.round(origW / targetRatio)));
      canvasW = Math.round(canvasH * targetRatio);
    }

    return { canvasW, canvasH };
  }

  function determineOutputMime(filename, settings) {
    if (settings.fitMode === 'padding' && settings.paddingColor === 'transparent') {
      return 'image/png';
    }
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    return 'image/jpeg';
  }

  function getOutputFilename(job) {
    const ext = job.name.split('.').pop();
    const baseName = job.name.substring(0, job.name.lastIndexOf('.')) || job.name;
    
    let specStr = '';
    if (job.settings.resizeType === 'dimension') {
      specStr = `${job.settings.dimension.w}${job.settings.dimension.unit}`;
    } else {
      specStr = job.settings.ratio.type === 'custom' 
        ? `${job.settings.ratio.w}x${job.settings.ratio.h}` 
        : job.settings.ratio.type.replace(':', 'x');
    }
    
    let targetExt = ext;
    if (job.settings.fitMode === 'padding' && job.settings.paddingColor === 'transparent') {
      targetExt = 'png';
    }

    const rotSuffix = job.rotation > 0 ? `_rot${job.rotation}` : '';
    const compSuffix = job.settings.compress.strategy === 'targetSize' 
      ? `_${job.settings.compress.targetKb}kb` 
      : `_q${Math.round(job.settings.compress.quality * 100)}`;

    return `resized_${baseName}_${specStr}_${job.settings.fitMode}${rotSuffix}${compSuffix}.${targetExt}`;
  }

  // ========================================================
  // 12. Large Preview Modal Controller
  // ========================================================
  function openPreviewModal(job) {
    activeModalJob = job;
    modalFileName.textContent = job.name;

    let specStr = '';
    if (job.settings.resizeType === 'dimension') {
      specStr = `${job.settings.dimension.w}${job.settings.dimension.unit} (${job.targetWidth}×${job.targetHeight}px)`;
    } else {
      const ratioLabel = job.settings.ratio.type === 'custom' 
        ? `${job.settings.ratio.w}:${job.settings.ratio.h}` 
        : job.settings.ratio.type;
      specStr = `${ratioLabel} (${job.targetWidth}×${job.targetHeight}px)`;
    }

    const modeLabel = job.settings.fitMode === 'padding' ? 'Padding' : 'Crop';
    const sizeStr = formatBytes(job.resultSize);
    modalBadge.textContent = `${specStr} • ${modeLabel} • 최종 용량: ${sizeStr}`;
    modalPreviewImg.src = job.thumbnailDataUrl;

    previewModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closePreviewModal() {
    previewModal.classList.remove('active');
    document.body.style.overflow = '';
    activeModalJob = null;
  }

  modalCloseBtn.addEventListener('click', closePreviewModal);
  modalBackdrop.addEventListener('click', closePreviewModal);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && previewModal.classList.contains('active')) {
      closePreviewModal();
    }
  });

  modalDownloadBtn.addEventListener('click', () => {
    if (activeModalJob && activeModalJob.resultBlob) {
      triggerDownload(activeModalJob.resultBlob, getOutputFilename(activeModalJob));
    }
  });

  // ========================================================
  // 13. Batch ZIP Download (요구사항 11)
  // ========================================================
  batchDownloadBtn.addEventListener('click', async () => {
    const completedJobs = Array.from(fileJobs.values()).filter(j => j.status === 'completed' && j.resultBlob);

    if (completedJobs.length === 0) {
      showToast('⚠️ 다운로드할 완료된 사진이 없습니다.');
      return;
    }

    if (!window.JSZip) {
      showToast('❌ JSZip 라이브러리를 불러오지 못했습니다.');
      return;
    }

    batchDownloadBtn.disabled = true;
    batchDownloadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>ZIP 압축 생성 중...</span>';

    try {
      const zip = new window.JSZip();

      completedJobs.forEach(job => {
        const outName = getOutputFilename(job);
        zip.file(outName, job.resultBlob);
      });

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      triggerDownload(zipBlob, 'resized_images.zip');
      showToast(`📦 ${completedJobs.length}개의 리사이즈 사진이 ZIP 파일로 다운로드되었습니다!`);
    } catch (err) {
      console.error('Batch download error:', err);
      showToast('❌ ZIP 압축 파일 생성 중 오류가 발생했습니다.');
    } finally {
      batchDownloadBtn.disabled = false;
      batchDownloadBtn.innerHTML = '<i class="fa-solid fa-file-zipper"></i> <span>전체 ZIP 일괄 다운로드</span>';
      updateBatchDownloadState();
    }
  });

  function updateBatchDownloadState() {
    let completedCount = 0;
    fileJobs.forEach(j => {
      if (j.status === 'completed') completedCount++;
    });
    batchDownloadBtn.disabled = completedCount === 0;
  }

  function updateQueueCount() {
    const count = fileJobs.size;
    queueCount.textContent = count + '개 사진';
    updateBatchDownloadState();
  }

  // ========================================================
  // 14. Utilities & Helpers
  // ========================================================
  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('이미지 파일을 디코딩하지 못했습니다.'));
      };
      img.src = url;
    });
  }

  function triggerDownload(blob, downloadName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2500);
    showToast(`💾 "${downloadName}" 파일이 다운로드되었습니다.`);
  }

  function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[m]));
  }

  let toastTimer = null;
  function showToast(msg) {
    let toast = document.getElementById('toastMsg');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toastMsg';
      toast.className = 'toast-msg';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span>${msg}</span>`;
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  // Initialize
  updateDimensionCalculations();
  updateSettingsBadge();
});
