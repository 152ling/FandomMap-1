    import { state } from './state.js';
    import {db,auth,storage,appId} from "./firebase-config.js";
    import { getConcertSupportDoc } from "./support-data.js";
    import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection,increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
    import { query,where,getCountFromServer} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
    import { openPostDetailModal } from "./common.js";
    import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject,listAll } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

  // ==================== STREAMING_CHUNK: 發布與編輯貼文表單維護 ====================
    function getPublishDraftStorageKey() { //草稿
      return state.selectedConcert ? `fanmap-publish-draft:${state.selectedConcert.id}` : null;
    }

    function savePublishDraft() {
      if (state.isEditingMode || state.isRestoringPublishDraft || !state.selectedConcert) return;

      const datesQuantities = {};
      document.querySelectorAll('#post-date-options input[name="pub-dates"]:checked').forEach(checkbox => {
        const qtyInput = document.querySelector(`input[name="pub-qty-${checkbox.value}"]`);
        datesQuantities[checkbox.value] = qtyInput ? qtyInput.value : "";
      });

      const draft = {
        type: state.publishPostType,
        title: document.getElementById("post-title").value,
        category: getSelectedCategories(),
        isAI: document.getElementById("ai-checkbox").checked,
        requirement: document.getElementById("post-requirement").value,
        notice: document.getElementById("post-notice").value,
        approxLocation: document.getElementById("post-approx-location").value,
        originalLink: document.getElementById("post-original-link").value,
        liveUpdateLink: document.getElementById("post-live-update-link").value,
        datesQuantities
      };

      try {
        localStorage.setItem(getPublishDraftStorageKey(), JSON.stringify(draft));
      } catch (error) {
        console.warn("Unable to save publish draft:", error);
      }
    }

    function loadPublishDraft() {
      const key = getPublishDraftStorageKey();
      if (!key) return null;
      try {
        return JSON.parse(localStorage.getItem(key) || "null");
      } catch (error) {
        console.warn("Unable to load publish draft:", error);
        return null;
      }
    }

    function clearPublishDraft() {
      const key = getPublishDraftStorageKey();
      if (key) localStorage.removeItem(key);
    }

    function restorePublishDraft(draft) {
      document.getElementById("post-title").value = draft.title || "";
      document.getElementById("post-requirement").value = draft.requirement || "";
      document.getElementById("post-notice").value = draft.notice || "";
      document.getElementById("post-approx-location").value = draft.approxLocation || "";
      document.getElementById("post-original-link").value = draft.originalLink || "";
      document.getElementById("post-live-update-link").value = draft.liveUpdateLink || "";
      document.getElementById("ai-checkbox").checked = Boolean(draft.isAI);
      document.querySelectorAll('#support-category-options input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = (draft.category || []).includes(checkbox.value);
      });
      setPublishType(draft.type === "support-exchange" ? "support-exchange" : "free-support");
      buildPublishDateOptions(Object.keys(draft.datesQuantities || {}), draft.datesQuantities || {});
    }

    function openPublishModal() { //新增應援按鈕-發布新應援
      if (!state.selectedConcert) return;
      if(state.selectedConcert.isPending === true){
        showToast("場次尚未完成驗證，無法新增應援")
        return;}
      if (state.currentUser.isAnonymous){
        showToast("請先前往登入才能發布");
        return;
      }
      const contactHandle = state.currentUser.contact.trim();
      if (!contactHandle){
        showToast("請先前往個人中心填寫社群連結後才能發布");
        return;
      }
      state.isEditingMode = false;
      state.editingItemId = null;
      const draft = loadPublishDraft(); // 讀取草稿
      state.isRestoringPublishDraft = true;
      clearUploadedImage();

      document.getElementById("publish-modal-title").innerText = "發布新應援項目";
      document.getElementById("publish-edit-badge").classList.add("hidden");
      document.getElementById("publish-type-toggle-container").classList.remove("hidden");

      document.getElementById("post-title").value = "";
      document.getElementById("post-requirement").value = "";
      document.getElementById("post-notice").value = "";
      document.getElementById("post-approx-location").value = "";
      document.getElementById("post-original-link").value = "";
      document.getElementById("post-live-update-link").value = "";
      document.getElementById("ai-checkbox").checked = false;
      document.querySelectorAll('#support-category-options input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
      });

      if (draft) {
        restorePublishDraft(draft); // 復原草稿
      } else {
        setPublishType("free-support");
        buildPublishDateOptions();
      }
      state.isRestoringPublishDraft = false;

      document.getElementById("modal-publish-post").classList.remove("hidden");
    }

    function closePublishModal() {
      document.getElementById("modal-publish-post").classList.add("hidden");
      state.isEditingMode = false;
      state.editingItemId = null;
    }

    function setPublishType(type) {
      state.publishPostType = type;
      const btnSupport = document.getElementById("publish-type-btn-free-support");
      const btnExchange = document.getElementById("publish-type-btn-support-exchange");

      [btnSupport, btnExchange].forEach(btn => {
        btn.className = "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-zinc-400";
      });

      const activeBtn = type === "free-support" ? btnSupport : btnExchange ;
      activeBtn.className = "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-zinc-850 shadow-xs";

      const supOnly = document.getElementById("support-only-fields");
      const labelTitle = document.getElementById("label-post-title");
      const labelRequire = document.getElementById("label-post-requirement");

      if (type === "free-support") {
        supOnly.classList.remove("hidden");
        labelRequire.innerText="領取條件限制";
      } else if(type === "support-exchange"){
        supOnly.classList.remove("hidden");
        labelRequire.innerText="交換對象限制";
      }

      //buildPublishDateOptions();
      savePublishDraft();
    }

    export function buildPublishDateOptions(selectedDatesArray = [], quantitiesMap = {}) {
      const container = document.getElementById("post-date-options");
      container.innerHTML = "";
      if (!state.selectedConcert || !state.selectedConcert.dates) return;

      // 改用垂直排列的容器，方便每一行展開數量輸入框
      container.className = "space-y-3";

      state.selectedConcert.dates.forEach(dateStr => {
        const dateSub = dateStr.substring(5);
        const isChecked = selectedDatesArray.includes(dateStr);
        // 取得該日期對應的數量（如果有的話）
        const qtyValue = quantitiesMap[dateStr] || "";

        // 建立外層區塊包住「勾選按鈕」與「展開的數量輸入框」
        const wrapper = document.createElement("div");
        wrapper.className = "flex justify-between p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl ";
        if (state.publishPostType === "free-support" || state.publishPostType === "support-exchange") {
          wrapper.innerHTML = `
            <label class="flex items-center space-x-3 cursor-pointer">
              <input type="checkbox" name="pub-dates" value="${dateStr}" class="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" ${isChecked ? "checked" : ""} onchange="togglePublishDateBox(this, '${dateStr}')">
              <span class="text-xs font-bold text-zinc-900">${dateSub}</span>
            </label>
            <div id="qty-box-${dateStr}" class="${isChecked ? 'flex' : 'hidden'} items-center space-x-2">
              <input type="number" inputmode="numeric" name="pub-qty-${dateStr}" placeholder="請輸入發放份數" value="${qtyValue}" class="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-indigo-500">
              <span class="text-xs text-zinc-500 flex-shrink-0">份</span>
            </div>
          `;
        } else {
          // 如果是其他類型（例如交換應援，若也需要單選或對應數量可在此調整）
          const isSelected = singleDateStr === dateStr || (singleDateStr === "" && state.selectedDate === dateStr);
          wrapper.innerHTML = `
            <label class="flex items-center space-x-3 cursor-pointer">
              <input type="radio" name="pub-date" value="${dateStr}" class="text-indigo-600 focus:ring-indigo-500 w-4 h-4" ${isSelected ? "checked" : ""}>
              <span class="text-xs font-bold text-zinc-900">${dateSub}</span>
            </label>
          `;
        }

        container.appendChild(wrapper);
      });
    }

    // 勾選時動態展開/隱藏對應數量的函式
    async function togglePublishDateBox(checkbox, dateStr) {
      const qtyBox = document.getElementById(`qty-box-${dateStr}`);
      if (checkbox.checked) {
        qtyBox.classList.remove('hidden');
        qtyBox.classList.add('flex');
      } else {
        qtyBox.classList.remove('flex');
        qtyBox.classList.add('hidden');
        // 如果取消勾選，也可以順便清空裡面的輸入框數值
        const input = qtyBox.querySelector('input');
        if (input) input.value = '';
      }
      savePublishDraft();
    }

    // ==================== STREAMING_CHUNK: 發布與編輯存檔（寫入 Cloud Firestore） ====================
    async function uploadPostImages(postId) {
      const uid = state.currentUser.id;
      return Promise.all(state.currentUploadedImagesBase64.map(async (image, index) => {
        // 編輯既有貼文時，已存在的 Storage URL 不需重複上傳。
        if (!image.startsWith("data:image/")) return image;

        const blob = await (await fetch(image)).blob();
        const filename = `${Date.now()}-${index}-${crypto.randomUUID()}.jpg`;
        const imageRef = ref(storage, `post-images/${uid}/${postId}/${filename}`);
        await uploadBytes(imageRef, blob, {
          contentType: blob.type || "image/jpeg",
          cacheControl: "public, max-age=31536000"
        });
        return getDownloadURL(imageRef);
      }));
    }
    function getSelectedCategories() {
      // 選出 #support-category-options 裡面所有被勾選的 checkbox
      const checkedBoxes = document.querySelectorAll('#support-category-options input[type="checkbox"]:checked');
      // 使用 map 將每一個 checkbox 的 value 轉成陣列
      const selectedValues = Array.from(checkedBoxes).map(checkbox => checkbox.value);
      return selectedValues;
    }
    function openPublishPreview(item) {
      state.isPublishPreview = true;
      document.getElementById("modal-publish-post").classList.add("hidden");
      openPostDetailModal(item.type, item.id, item);
    }

    function returnToPublishEditor() { //預覽時返回編輯
      closePostDetailModal();
    }

    async function confirmPublishFromPreview() {
      state.isConfirmingPublish = true;
      state.publishSucceeded = false;
      const confirmButton = document.getElementById("confirm-publish-btn");
      const returnButton = document.getElementById("return-to-publish-editor-btn");
      confirmButton.disabled = true;
      returnButton.disabled = true;
      confirmButton.classList.add("opacity-70", "cursor-wait");
      returnButton.classList.add("opacity-50", "cursor-not-allowed");
      confirmButton.innerHTML = `
        <span>發布中…</span>`;
      await handlePublishPostSubmit({ preventDefault() {} });
      if (state.publishSucceeded) {
        closePostDetailModal();
        state.isPublishPreview = false;
      } else {
        confirmButton.disabled = false;
        returnButton.disabled = false;
        confirmButton.classList.remove("opacity-70", "cursor-wait");
        returnButton.classList.remove("opacity-50", "cursor-not-allowed");
        confirmButton.innerText = "確認發布";
      }
      state.isConfirmingPublish = false;
    }

    async function handlePublishPostSubmit(event) {
      event.preventDefault();

      if (state.currentUser.isAnonymous) {
        showToast("請先登入");
        return;
      }  
      const contactHandle = state.currentUser.contact.trim();
      if (!contactHandle){
        showToast("請先前往個人中心填寫社群連結後才能發布");
        return;
      }

      const title = document.getElementById("post-title").value.trim();
      const category = getSelectedCategories();
      const approxLocation = document.getElementById("post-approx-location").value.trim(); //即時位置更新說明
      const originalLink = document.getElementById("post-original-link").value.trim();//原始貼文連結
      const liveUpdateLink = document.getElementById("post-live-update-link").value.trim(); //即時位置更新處
      const requirement = document.getElementById("post-requirement").value.trim();//領取條件／交換對象限制
      const notice = document.getElementById("post-notice").value.trim();//注意事項
      const isAI =document.getElementById("ai-checkbox").checked; //是否 AI 生成
      
      const authorData = {
        userId: state.currentUser.id,
        authorName: state.currentUser.username,
        userAvatar: state.currentUser.avatar,
        contactInfo: contactHandle 
      };

      if (!title) {
        showToast("請填寫應援物標題");
        return;
      }else if (category.length === 0) {
        showToast("請至少選擇一個應援物類別");
        return;
      } else if (!approxLocation) {
        showToast("請填寫即時位置更新說明");
        return;
      }

      // 新增貼文時，先以表單中的本機圖片與欄位資料預覽，不進行上傳或寫入。
      if (!state.isEditingMode && !state.isConfirmingPublish) {
        const datesQuantities = {};
        document.querySelectorAll('#post-date-options input[name="pub-dates"]:checked').forEach(checkbox => {
          const qtyInput = document.querySelector(`input[name="pub-qty-${checkbox.value}"]`);
          datesQuantities[checkbox.value] = qtyInput ? parseInt(qtyInput.value) || 0 : 0;
        });
        const selectedDates = Object.keys(datesQuantities);
        const totalQuantity = Object.values(datesQuantities).reduce((sum, qty) => sum + qty, 0);

        if (selectedDates.length === 0) {
          showToast("請至少選取一個發放日期");
          return;
        }
        if (totalQuantity <= 0) {
          showToast("請至少輸入一個發放份數");
          return;
        }
        if (state.currentUploadedImagesBase64.length === 0) {
          showToast("請至少上傳一張應援物照片");
          return;
        }

        openPublishPreview({
          type: state.publishPostType,
          id: `preview_${Date.now()}`,
          concertId: state.selectedConcert.id,
          title, category, totalquantity: totalQuantity, datesQuantities, dates: selectedDates,
          requirement, notice, approxLocation, originalLink, liveUpdateLink,
          image: state.currentUploadedImagesBase64[0], images: [...state.currentUploadedImagesBase64], isAI,
          ...authorData
        });
        return;
      }

      // 如果有上傳 Canvas 壓縮照片就使用它，否則套用 Unsplash 的動態配圖
      const postId = state.isEditingMode && state.editingItemId
        ? state.editingItemId
        : (state.publishPostType === "free-support" ? `sup_${Date.now()}` : `exch_${Date.now()}`);
      let finalImage = "";
      let finalImages = [];

      const submitBtn = document.getElementById("publish-submit-btn");
      submitBtn.disabled = true;
      submitBtn.innerText = "資料同步中...";

      try {
        // 1. 抓取所有被勾選的日期與對應數量
        const datesQuantities = {};
        const datecheckedBoxes = document.querySelectorAll('#post-date-options input[name="pub-dates"]:checked');

        datecheckedBoxes.forEach(checkbox => {
          const dateStr = checkbox.value;
          // 找到該日期對應的數量輸入框
          const qtyInput = document.querySelector(`input[name="pub-qty-${dateStr}"]`);
          const qty = qtyInput ? parseInt(qtyInput.value) || 0 : 0;
          datesQuantities[dateStr] = qty;
        });

        // 2. 提取出所有有被勾選的日期陣列 (給 dates 欄位用)
        const selectedDates = Object.keys(datesQuantities);
        const totalQuantity = Object.values(datesQuantities).reduce((a, b) => a + b, 0); //總發放數量

        finalImages = await uploadPostImages(postId);
        finalImage = finalImages[0] || finalImage;
        if (state.isEditingMode && state.editingItemId) {
          if (selectedDates.length === 0) {
              showToast("請至少選取一個發放日期");
              submitBtn.disabled = false;
              submitBtn.innerText = "發布應援";
              return;
            }else if (totalQuantity <= 0) {
              showToast("請至少輸入一個發放份數");
              submitBtn.disabled = false;
              submitBtn.innerText = "發布應援";
              return;
            }
            else if (finalImages.length === 0) {
              showToast("請至少上傳一張應援物照片");
              submitBtn.disabled = false;
              submitBtn.innerText = "發布應援";
              return;
            }
          // A. 編輯存檔
          if (state.publishPostType === "free-support") {
            const docRef = getConcertSupportDoc(db, appId, state.selectedConcert.id, "supportEvents", state.editingItemId);
            await updateDoc(docRef, {
              concertEndDate:state.selectedConcert.endDate,
              type: state.publishPostType,
              title, category, 
              totalquantity: totalQuantity, // 總數量
              datesQuantities,       // 存入詳細對應 {"2026-01-10": 50, "2026-01-11": 30}
              dates: selectedDates,  // 存入有參與的日期陣列：["2026-01-10", "2026-01-11"]
              requirement, notice, approxLocation,
              originalLink, liveUpdateLink, dates: selectedDates,
              image: finalImage,
              images: finalImages,
              isAI, // 是否 AI 生成
              ...authorData
            });
          } else { //交換應援
            const docRef = getConcertSupportDoc(db, appId, state.selectedConcert.id, "exchangePosts", state.editingItemId);
            await updateDoc(docRef, {
              concertEndDate:state.selectedConcert.endDate,
              type: state.publishPostType,
              title, category, 
              totalquantity: totalQuantity, // 總數量
              datesQuantities,       // 存入詳細對應 {"2026-01-10": 50, "2026-01-11": 30}
              dates: selectedDates,  // 存入有參與的日期陣列：["2026-01-10", "2026-01-11"]
              requirement, notice, approxLocation,
              originalLink, liveUpdateLink, dates: selectedDates,
              image: finalImage,
              images: finalImages,
              isAI, // 是否 AI 生成
              ...authorData
            });
          }
          showToast("應援資料修改成功！");
          if (typeof refreshConcertPageData === 'function') {
            setTimeout(() => refreshConcertPageData(), 300);
          } else {
            setTimeout(() => window.location.reload(), 300);
          }
          renderPostDetail(state.publishPostType,postId); //重整頁面

        } else {
          // B. 發布全新項目
          if (selectedDates.length === 0) {
              showToast("請至少選取一個發放日期");
              submitBtn.disabled = false;
              submitBtn.innerText = "發布看板項目";
              return;
            }else if (totalQuantity <= 0) {
              showToast("請至少輸入一個發放份數");
              submitBtn.disabled = false;
              submitBtn.innerText = "發布看板項目";
              return;
            }else if (finalImages.length === 0) {
              showToast("請至少上傳一張應援物照片");
              submitBtn.disabled = false;
              submitBtn.innerText = "發布看板項目";
              return;
          }
          if (state.publishPostType === "free-support") {
            const checkboxes = document.getElementsByName("pub-dates");
            const selectedDates = [];
            checkboxes.forEach(c => { if (c.checked) selectedDates.push(c.value); });
            const newSupportId = postId;
            const newSupport = {
              type: state.publishPostType,
              id: newSupportId,
              concertId:state.selectedConcert.id,
              concertEndDate:state.selectedConcert.endDate,
              title, category, 
              totalquantity: totalQuantity, // 總數量
              datesQuantities,       // 存入詳細對應 {"2026-01-10": 50, "2026-01-11": 30}
              dates: selectedDates, // 存入有參與的日期陣列
              requirement, notice, approxLocation,
              originalLink, liveUpdateLink,
              image: finalImage,
              images: finalImages,
              isAI, // 是否 AI 生成
              ...authorData,
              bookmarkCount: 0,
            };
            await setDoc(getConcertSupportDoc(db, appId, state.selectedConcert.id, "supportEvents", newSupportId), newSupport);
            showToast("成功新增免費應援！");
          } else { //交換應援
            const checkboxes = document.getElementsByName("pub-dates");
            const selectedDates = [];
            checkboxes.forEach(c => { if (c.checked) selectedDates.push(c.value); });

            const newExchangeId = postId;
            const newExchange = {
              type: state.publishPostType,
              id: newExchangeId,
              concertId: state.selectedConcert.id,
              concertEndDate:state.selectedConcert.endDate,
              title, category, 
              totalquantity: totalQuantity, // 總數量
              datesQuantities,       // 存入詳細對應 {"2026-01-10": 50, "2026-01-11": 30}
              dates: selectedDates,  // 存入有參與的日期陣列：["2026-01-10", "2026-01-11"]
              requirement, notice, approxLocation,
              originalLink, liveUpdateLink,
              image: finalImage,
              images: finalImages,
              isAI, // 是否 AI 生成true or false
              ...authorData,
              bookmarkCount: 0,
            };
            await setDoc(getConcertSupportDoc(db, appId, state.selectedConcert.id, "exchangePosts", newExchangeId), newExchange);
            showToast("成功新增交換應援！");
          }
        }
        if (!state.isEditingMode) clearPublishDraft();
        state.publishSucceeded = true;
        closePublishModal();
        if (typeof refreshConcertPageData === 'function') {
          setTimeout(() => refreshConcertPageData(), 300);
        } else {
          setTimeout(() => window.location.reload(), 300);
        }
      } catch (error) {
        console.error("Publish error:", error);
        showToast("儲存失敗，請確認 Firestore 安全規則設定");
        state.publishSucceeded = false;
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "發布看板項目";
      }
    }

    // 啟動編輯
    function startEditPost() {
      if (!state.activeDetailItem) return;
      const { type, data } = state.activeDetailItem;

      state.isEditingMode = true;
      state.editingItemId = data.id;
      //closePostDetailModal();

      document.getElementById("publish-modal-title").innerText = "編輯應援項目";
      document.getElementById("publish-submit-btn").innerText = "儲存編輯";
      document.getElementById("publish-edit-badge").classList.remove("hidden");
      document.getElementById("publish-type-toggle-container").classList.add("hidden");

      document.getElementById("post-title").value = data.title;

      document.getElementById("post-requirement").value = data.requirement || "";
      document.getElementById("post-notice").value = data.notice || "";
      document.getElementById("post-approx-location").value = data.approxLocation || "";
      document.getElementById("post-original-link").value = data.originalLink || "";
      document.getElementById("post-live-update-link").value = data.liveUpdateLink || "";
      const categoryCheckboxes = document.querySelectorAll('#support-category-options input[type="checkbox"]');
      
      categoryCheckboxes.forEach(cb => {
        // 假設單一字串或陣列皆可相容判斷
        cb.checked = data.category && data.category.includes(cb.value);
      });

      // 載入原有照片預覽
      if (data.image) {
        state.currentUploadedImageBase64 = data.image;
        state.currentUploadedImagesBase64 = Array.isArray(data.images) ? data.images : [data.image];
        const previewContainer = document.getElementById("image-upload-preview-container");
        const previewImg = document.getElementById("image-upload-preview");
        if (previewImg) previewImg.src = data.image;
        previewContainer.classList.remove("hidden");
        document.getElementById("image-upload-hint").innerText = "已載入原始照片";
        renderImageUploadPreviews();
      } else {
        clearUploadedImage();
      }

      const pType = type === "free-support" ? "free-support" : "support-exchange";
      setPublishType(pType);

      buildPublishDateOptions(data.dates || [], data.datesQuantities || {});

      document.getElementById("modal-publish-post").classList.remove("hidden");
    }

    // ==================== STREAMING_CHUNK: 貼文刪除處理 ====================
    export function triggerDeletePost() {
      if (!state.activeDetailItem) return;
      const { type, data } = state.activeDetailItem;
      state.deleteTarget = { type, id: data.id, concertId: data.concertId };
      state.isDeletingPost = false;
      resetDeleteButtons();

    //   closePostDetailModal();
      document.getElementById("modal-delete-confirm").classList.remove("hidden");
    }
    export function closePostDetailModal() {
      document.getElementById("modal-post-detail").classList.add("hidden");
      state.activeDetailItem = null;
      document.getElementById("detail-bookmark-btn").classList.remove("hidden");
      if (state.isPublishPreview && !state.isConfirmingPublish) {
        state.isPublishPreview = false;
        document.getElementById("modal-publish-post").classList.remove("hidden");
      }
    }
    export function closeDeleteConfirmModal() {
      if (state.isDeletingPost) return;
      document.getElementById("modal-delete-confirm").classList.add("hidden");
      state.deleteTarget = null;
    }

    export function resetDeleteButtons() {
      const cancelButton = document.getElementById("cancel-delete-btn");
      const confirmButton = document.getElementById("confirm-delete-btn");
      cancelButton.disabled = false;
      confirmButton.disabled = false;
      cancelButton.classList.remove("opacity-50", "cursor-not-allowed");
      confirmButton.classList.remove("opacity-70", "cursor-wait");
      confirmButton.innerText = "確認刪除";
    }

    async function executeDeletePost() {
      if (!state.deleteTarget || !state.currentUser || state.isDeletingPost) return;
      const { type, id } = state.deleteTarget;
      const uid = state.currentUser.id;
      state.isDeletingPost = true;
      const cancelButton = document.getElementById("cancel-delete-btn");
      const confirmButton = document.getElementById("confirm-delete-btn");
      cancelButton.disabled = true;
      confirmButton.disabled = true;
      cancelButton.classList.add("opacity-50", "cursor-not-allowed");
      confirmButton.classList.add("opacity-70", "cursor-wait");
      confirmButton.innerHTML = `
        <span class="inline-flex items-center gap-1.5"><svg class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3"></circle><path class="opacity-90" fill="currentColor" d="M12 3a9 9 0 0 1 9 9h-3a6 6 0 0 0-6-6V3z"></path></svg>刪除中…</span>`;

      try {
        const folderRef = ref(storage, `post-images/${uid}/${id}`); //刪除storage該應援資料夾圖片
        try {
          const res = await listAll(folderRef);
          // 透過 Promise.all 平行刪除資料夾內的所有圖片
          const deletePromises = res.items.map((fileRef) => deleteObject(fileRef));
          await Promise.all(deletePromises);
        } catch (storageErr) {
          // 若該貼文本來就沒有照片或資料夾不存在，抓取錯誤並記錄日誌，不中斷貼文刪除流程
          console.warn("Storage 照片資料夾清理狀況:", storageErr);
        }

        const collectionName = type === "free-support" ? "supportEvents" : "exchangePosts";
        const concertId = state.deleteTarget.concertId || state.selectedConcert?.id;
        const docRef = getConcertSupportDoc(db, appId, concertId, collectionName, id);
        await deleteDoc(docRef);

        state.bookmarkedPostIds = state.bookmarkedPostIds.filter(postId => postId !== id);

        const redirectConcertId = state.activeDetailItem?.data?.concertId || state.deleteTarget?.concertId;
        showToast("項目成功自即時看板下架！");
        state.isDeletingPost = false;
        closeDeleteConfirmModal();

        setTimeout(() => {
          if (redirectConcertId) {
            window.location.href = `Concert.html?concertId=${redirectConcertId}`;
          } else {
            window.location.href = 'index.html';
          }
        }, 300);
      } catch (error) {
        console.error("Delete error:", error);
        showToast("下架失敗，請稍後再試");
        state.isDeletingPost = false;
        resetDeleteButtons();
      }
    }

    window.openPublishModal = openPublishModal;
    window.closePublishModal = closePublishModal;
    window.setPublishType = setPublishType;
    window.buildPublishDateOptions =buildPublishDateOptions;
    window.togglePublishDateBox=togglePublishDateBox;
    window.handlePublishPostSubmit = handlePublishPostSubmit;
    window.returnToPublishEditor = returnToPublishEditor;
    window.confirmPublishFromPreview = confirmPublishFromPreview;
    window.startEditPost = startEditPost;
    window.triggerDeletePost = triggerDeletePost;

    window.closePostDetailModal=closePostDetailModal;
    window.closeDeleteConfirmModal = closeDeleteConfirmModal;
    window.resetDeleteButtons=resetDeleteButtons;
    window.executeDeletePost = executeDeletePost;

