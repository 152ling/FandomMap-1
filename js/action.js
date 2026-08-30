  import { state } from './state.js';
  function renderImageUploadPreviewsLegacy() {
      const container = document.getElementById("image-upload-preview-container");
      container.innerHTML = "";
      state.currentUploadedImagesBase64.forEach((image, index) => {
        const item = document.createElement("div");
        item.className = "w-12 h-12 rounded-lg border overflow-hidden bg-zinc-100 relative";
        item.innerHTML = `<img src="${image}" alt="預覽照片 ${index + 1}" class="w-full h-full object-cover"><button type="button" onclick="removeUploadedImage(${index})" class="absolute inset-0 bg-black/60 text-white flex items-center justify-center font-bold text-[9px] opacity-0 hover:opacity-100 transition-opacity">移除</button>`;
        container.appendChild(item);
      });
      container.classList.toggle("hidden", state.currentUploadedImagesBase64.length === 0);
      state.currentUploadedImageBase64 = state.currentUploadedImagesBase64[0] || "";
      document.getElementById("image-upload-hint").innerText = state.currentUploadedImagesBase64.length
        ? `已壓縮 ${state.currentUploadedImagesBase64.length}/5 張照片`
        : "可選擇最多 5 張照片，系統會自動壓縮。";
    }

    function renderImageUploadPreviews() {
      const container = document.getElementById("image-upload-preview-container");
      const count = state.currentUploadedImagesBase64.length;
      container.innerHTML = "";

      state.currentUploadedImagesBase64.forEach((image, index) => {
        const item = document.createElement("div");
        item.className = "relative w-20 h-20 shrink-0 overflow-visible rounded-2xl border border-zinc-200 bg-zinc-100";
        item.innerHTML = `
          <img src="${image}" alt="照片 ${index + 1}" class="w-full h-full rounded-2xl object-cover">
          <button type="button" onclick="removeUploadedImage(${index})" aria-label="刪除照片 ${index + 1}" class="absolute top-1 right-1 z-10 w-4 h-4 rounded-full bg-zinc-400 hover:bg-brand text-white flex items-center justify-center shadow-md transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>`;
        container.appendChild(item);
      });

      if (count < 5) {
        const addButton = document.createElement("button");
        addButton.type = "button";
        addButton.onclick = triggerFileInput;
        addButton.setAttribute("aria-label", "新增照片");
        addButton.className = "w-20 h-20 shrink-0 rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-100 hover:bg-zinc-200 hover:border-zinc-400 text-zinc-400 hover:text-zinc-600 flex items-center justify-center transition-colors";
        addButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>`;
        container.appendChild(addButton);
      }

      state.currentUploadedImageBase64 = state.currentUploadedImagesBase64[0] || "";
      document.getElementById("image-upload-hint").innerText = count
        ? `已選擇 ${count}/5 張照片`
        : "可選擇最多 5 張照片，系統會自動壓縮。";
    }

    async function processImageUpload(event) {
      const files = Array.from(event.target.files || []);
      const remaining = 5 - state.currentUploadedImagesBase64.length;
      event.target.value = "";
      if (!files.length) return;
      if (remaining <= 0) return showToast("最多只能上傳 5 張照片。");
      const imageFiles = files.filter(file => file.type.startsWith("image/"));
      if (imageFiles.length !== files.length) showToast("已略過非圖片檔案。");
      const selected = imageFiles.slice(0, remaining);
      if (imageFiles.length > remaining) showToast(`一次最多還可加入 ${remaining} 張照片。`);
      if (!selected.length) return;
      showToast("正在壓縮照片…");
      try {
        state.currentUploadedImagesBase64.push(...await Promise.all(selected.map(compressImage)));
        renderImageUploadPreviews();
        showToast("照片已壓縮並加入預覽。");
      } catch (error) {
        console.error("Image compression error:", error);
        showToast("照片處理失敗，請改用其他圖片。");
      }
    }

    function removeUploadedImage(index) {
      state.currentUploadedImagesBase64.splice(index, 1);
      renderImageUploadPreviews();
    }

    function clearUploadedImage() {
      state.currentUploadedImageBase64 = "";
      state.currentUploadedImagesBase64 = [];
      document.getElementById("post-image-file").value = "";
      renderImageUploadPreviews();
    }
    // ==================== STREAMING_CHUNK: 圖片即時 Canvas 壓縮上傳與防溢位機制 ====================
    function triggerFileInput() {
      if (state.currentUploadedImagesBase64.length >= 5) {
        showToast("最多只能上傳 5 張照片。");
        return;
      }
      document.getElementById("post-image-file").click();
    }

    window.renderImageUploadPreviewsLegacy=renderImageUploadPreviewsLegacy;
    window.renderImageUploadPreviews=renderImageUploadPreviews;
    window.processImageUpload = processImageUpload;
    window.removeUploadedImage = removeUploadedImage;
    window.clearUploadedImage = clearUploadedImage;

    window.triggerFileInput=triggerFileInput;