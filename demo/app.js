const translations = {
  en: {
    page_title: "DeepNoise Flow - Personal Audio Processing Demo",
    logo: "DeepNoise Flow",
    nav_overview: "Overview",
    nav_pipeline: "Pipeline",
    nav_demo: "Demo",
    nav_tech: "Tech",
    nav_safety: "Safety",
    nav_usage: "Usage",
    nav_cta: "Try the Demo",
    hero_eyebrow: "Personal Engineering Showcase",
    hero_title: "Interactive Noise Reduction Pipeline",
    hero_sub:
      "DeepNoise Flow is a personal demo website for audio denoise workflows. Upload or record audio, run node-based processing, preview waveform and playback, then download output.",
    hero_cta_primary: "See Interactive Demo",
    hero_cta_secondary: "Run Locally",
    metric_input: "Input methods",
    metric_visual: "Visual workflow",
    metric_export: "Export",
    card_live: "Flow Preview",
    card_ready: "Public Demo",
    card_action_1: "Quick Actions",
    card_action_1_sub: "Upload / Record / Replay",
    card_action_2: "Inspector",
    card_action_2_sub: "Advanced settings",
    overview_title: "Project Overview",
    overview_sub: "A clean public showcase for audio workflow engineering.",
    overview_what_title: "What this tool does",
    overview_what_body:
      "It demonstrates a visual audio pipeline where users can clean noisy speech and inspect each processing step in a node editor.",
    overview_tech_title: "Technologies",
    overview_tech_body:
      "ReactFlow front-end, FastAPI backend, DeepFilterNet denoise, and optional SepFormer speaker separation.",
    overview_demo_title: "What the workflow demonstrates",
    overview_demo_body:
      "Interaction consistency, quick action panels, advanced inspector controls, and safe backend processing for public traffic.",
    pipeline_title: "Audio Processing Workflow Demo",
    pipeline_sub: "From source input to downloadable output in a single visual graph.",
    pipeline_step_1_title: "1. Input",
    pipeline_step_1_body: "Upload WAV/MP3/WEBM or record from microphone.",
    pipeline_step_2_title: "2. Noise Reduction",
    pipeline_step_2_body: "Run DeepFilterNet to suppress background noise.",
    pipeline_step_3_title: "3. Preview",
    pipeline_step_3_body: "Inspect waveform and playback processed audio instantly.",
    pipeline_step_4_title: "4. Export",
    pipeline_step_4_body: "Download clean output in your selected format.",
    demo_title: "Interactive Demo",
    demo_sub:
      "The live editor supports upload/recording, waveform preview, playback, and output download.",
    demo_input_title: "Input Node Quick Actions",
    demo_input_upload_label: "Upload audio",
    demo_input_upload_desc: "WAV / MP3 / WEBM (max 10MB)",
    demo_input_record_label: "Record audio",
    demo_input_record_desc: "Capture short clips and replay instantly",
    demo_input_note: "Waveform preview and replay are available in the floating quick panel.",
    demo_output_title: "Output Node Quick Actions",
    demo_output_preview_label: "Preview processed audio",
    demo_output_preview_desc: "View waveform and play result",
    demo_output_download_label: "Download file",
    demo_output_download_desc: "Export output for editing or sharing",
    demo_output_note: "Advanced format/bitrate settings are in the right inspector.",
    demo_shot_1: "Node canvas and workflow controls",
    demo_shot_2: "Floating quick actions and inspector panel",
    tech_title: "Technical Notes",
    tech_sub: "Designed as a practical personal demo that can be shared publicly.",
    tech_frontend_title: "Frontend",
    tech_backend_title: "Backend",
    tech_models_title: "Audio Models",
    safety_title: "Public Traffic Safety",
    safety_sub: "Safeguards are enabled to prevent abuse and overload.",
    safety_limit_title: "Input limits",
    safety_limit_1: "Max upload: 10MB",
    safety_limit_2: "Max duration: 30 seconds",
    safety_limit_3: "Allowed types: WAV / MP3 / WEBM",
    safety_traffic_title: "Traffic controls",
    safety_traffic_1: "Per-IP rate limiting per minute",
    safety_traffic_2: "Short-interval throttling",
    safety_traffic_3: "Friendly error on limit exceeded",
    safety_runtime_title: "Runtime protection",
    safety_runtime_1: "Processing timeout for long jobs",
    safety_runtime_2: "Concurrent job cap + queue cap",
    safety_runtime_3: "Graceful busy response when overloaded",
    usage_title: "Run the Demo Locally",
    usage_sub: "Use these commands to launch core mode or full demo mode.",
    usage_backend_title: "Core mode",
    usage_frontend_title: "Demo mode",
    usage_try_title: "Try the workflow",
    usage_try_1: "Open the ReactFlow editor in browser.",
    usage_try_2: "Upload or record short audio.",
    usage_try_3: "Run pipeline, preview result, and download output.",
    footer_brand: "DeepNoise Flow",
    footer_tagline: "Personal experimental audio workflow demo",
    footer_back: "Back to top",
  },
  zh: {
    page_title: "DeepNoise Flow - 個人音訊流程展示",
    logo: "DeepNoise Flow",
    nav_overview: "專案",
    nav_pipeline: "流程",
    nav_demo: "互動展示",
    nav_tech: "技術",
    nav_safety: "保護機制",
    nav_usage: "啟動方式",
    nav_cta: "立即試用",
    hero_eyebrow: "個人技術作品展示",
    hero_title: "互動式降噪流程",
    hero_sub:
      "DeepNoise Flow 是一個個人音訊處理展示網站。你可以上傳或錄音、執行節點流程、觀看波形與播放結果，最後下載處理後音訊。",
    hero_cta_primary: "看互動展示",
    hero_cta_secondary: "本地啟動",
    metric_input: "輸入方式",
    metric_visual: "視覺化流程",
    metric_export: "輸出下載",
    card_live: "流程預覽",
    card_ready: "公開展示版",
    card_action_1: "快速操作",
    card_action_1_sub: "上傳 / 錄音 / 重播",
    card_action_2: "檢視面板",
    card_action_2_sub: "進階設定",
    overview_title: "專案概述",
    overview_sub: "可公開分享的音訊流程工程展示頁。",
    overview_what_title: "工具功能",
    overview_what_body: "以節點式介面展示音訊降噪流程，並可在各步驟進行預覽與調整。",
    overview_tech_title: "使用技術",
    overview_tech_body: "前端使用 ReactFlow，後端使用 FastAPI，模型包含 DeepFilterNet 與可選 SepFormer。",
    overview_demo_title: "這個流程展示了什麼",
    overview_demo_body: "一致的節點互動、快速操作面板、進階 inspector 與公開環境下的處理保護機制。",
    pipeline_title: "音訊流程展示",
    pipeline_sub: "從輸入到下載輸出，完整走過一條視覺化處理鏈。",
    pipeline_step_1_title: "1. 輸入",
    pipeline_step_1_body: "上傳 WAV/MP3/WEBM 或直接錄音。",
    pipeline_step_2_title: "2. 降噪",
    pipeline_step_2_body: "以 DeepFilterNet 進行背景噪音抑制。",
    pipeline_step_3_title: "3. 預覽",
    pipeline_step_3_body: "即時查看波形並播放處理結果。",
    pipeline_step_4_title: "4. 匯出",
    pipeline_step_4_body: "下載處理後音訊。",
    demo_title: "互動展示",
    demo_sub: "展示版支援上傳/錄音、波形預覽、播放與下載。",
    demo_input_title: "Input 節點快速操作",
    demo_input_upload_label: "上傳音訊",
    demo_input_upload_desc: "WAV / MP3 / WEBM（上限 10MB）",
    demo_input_record_label: "錄製音訊",
    demo_input_record_desc: "錄製短音訊並立即重播",
    demo_input_note: "波形預覽與重播都在浮動快速面板完成。",
    demo_output_title: "Output 節點快速操作",
    demo_output_preview_label: "預覽處理結果",
    demo_output_preview_desc: "查看波形並播放結果",
    demo_output_download_label: "下載檔案",
    demo_output_download_desc: "輸出可編輯或可分享音訊檔",
    demo_output_note: "格式、位元率等進階參數在右側 inspector。",
    demo_shot_1: "節點畫布與流程控制",
    demo_shot_2: "浮動快速操作與右側設定面板",
    tech_title: "技術說明",
    tech_sub: "這是一個可公開分享的實作型個人作品。",
    tech_frontend_title: "前端",
    tech_backend_title: "後端",
    tech_models_title: "模型",
    safety_title: "公開流量保護",
    safety_sub: "系統內建限制，避免濫用與過載。",
    safety_limit_title: "輸入限制",
    safety_limit_1: "上傳大小上限：10MB",
    safety_limit_2: "音訊長度上限：30 秒",
    safety_limit_3: "允許格式：WAV / MP3 / WEBM",
    safety_traffic_title: "流量控制",
    safety_traffic_1: "每 IP 每分鐘請求速率限制",
    safety_traffic_2: "短時間連續請求節流",
    safety_traffic_3: "超限時回傳友善錯誤訊息",
    safety_runtime_title: "運行保護",
    safety_runtime_1: "處理作業 timeout 限制",
    safety_runtime_2: "併發與排隊上限控制",
    safety_runtime_3: "過載時回傳稍後重試",
    usage_title: "本地啟動方式",
    usage_sub: "使用以下指令啟動 core 模式或完整 demo 模式。",
    usage_backend_title: "Core 模式",
    usage_frontend_title: "Demo 模式",
    usage_try_title: "快速體驗",
    usage_try_1: "在瀏覽器開啟 ReactFlow 編輯器。",
    usage_try_2: "上傳或錄製短音訊。",
    usage_try_3: "執行流程、預覽結果並下載輸出。",
    footer_brand: "DeepNoise Flow",
    footer_tagline: "個人實驗型音訊流程展示",
    footer_back: "回到頂部",
  },
};

const elements = document.querySelectorAll("[data-i18n]");
const buttons = document.querySelectorAll(".lang-btn");

function setLanguage(lang) {
  const dict = translations[lang] || translations.en;
  document.documentElement.lang = lang;
  document.title = dict.page_title;
  elements.forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });
  buttons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
  localStorage.setItem("deepnoise_lang", lang);
}

const savedLang = localStorage.getItem("deepnoise_lang") || "zh";
setLanguage(savedLang);

buttons.forEach((btn) => {
  btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
});

const revealItems = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  },
  { threshold: 0.12 }
);

revealItems.forEach((item) => observer.observe(item));
