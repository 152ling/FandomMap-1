  import { state } from './state.js';
  import { openPostDetailModal } from "./common.js";
  import { db,auth,storage,appId} from "./firebase-config.js";
  import { getAuth, onAuthStateChanged} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
  import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection,increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
  import { query,where,getCountFromServer,getDocs} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
  import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject,listAll } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";


      // ==================== STREAMING_CHUNK: 提案建立新場次與公用工具 ====================
    function openAddConcertModal() {
      if (state.currentUser.isAnonymous){
        showToast("請先前往登入才能提案");
        return;
      }
      const contactHandle = state.currentUser.contact.trim();
      if (!contactHandle){
        showToast("請先前往個人中心填寫社群連結後才能提案");
        return;
      }

      document.getElementById("add-concert-artist").value = "";
      document.getElementById("add-concert-tour").value = "";
      document.getElementById("add-concert-venue").value = "";
      document.getElementById("modal-add-concert").classList.remove("hidden");
      resetConcertDateFields();
      clearConcertUploadedImage();
    }
    function resetConcertDateFields() {  //重置演唱會日期欄位
      const container = document.getElementById('add-concert-dates-container');
      if (!container) return;
      container.innerHTML = '';
      // 預設建立兩天日期欄位
      addConcertDateField(true);  // 第一天 (必須填寫)
      addConcertDateField(false); // 第二天 (選填)
    }

    function addConcertDateField(isRequired = false) { //新增演唱會日期欄位
      const container = document.getElementById('add-concert-dates-container');
      if (!container) return;

      const rowCount = container.querySelectorAll('.concert-date-row').length + 1;
      const row = document.createElement('div');
      row.className = 'flex items-center space-x-2 concert-date-row';

      row.innerHTML = `
        <div class="relative flex-1">
          <input id="add-concert-date-${rowCount}" type="date" aria-label="第 ${rowCount} 天場次日期" class="concert-date-input w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-zinc-800 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900" ${isRequired ? 'required' : ''}>
        </div>
        <button type="button" onclick="removeConcertDateField(this)" class="remove-date-btn shrink-0 w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition" title="移除此場次">
          <i class="fa-solid fa-minus text-xs"></i>
        </button>
      `;

      container.appendChild(row);
      updateDateRowLabels();
    }

    function removeConcertDateField(btn) { //移除演唱會日期欄位
      const container = document.getElementById('add-concert-dates-container');
      const rows = container.querySelectorAll('.concert-date-row');

      // 至少保留 1 個欄位
      if (rows.length <= 1) {
        showToast('演唱會至少需包含 1 個場次日期');
        return;
      }

      const row = btn.closest('.concert-date-row');
      if (row) {
        row.remove();
        updateDateRowLabels();
      }
    }

    function updateDateRowLabels() { //更新日期欄位的 aria-label 與 required 屬性
      const container = document.getElementById('add-concert-dates-container');
      if (!container) return;

      const rows = container.querySelectorAll('.concert-date-row');
      rows.forEach((row, index) => {
        const input = row.querySelector('.concert-date-input');
        const removeBtn = row.querySelector('.remove-date-btn');
        if (input) {
          input.setAttribute('aria-label', `第 ${index + 1} 天場次日期`);
          if (index === 0) {
            input.setAttribute('required', 'true');
          }
        }
        // 當只剩 1 個日期欄位時隱藏移除按鈕，多於 1 個時自動顯示
        if (removeBtn) {
          if (rows.length === 1) {
            removeBtn.classList.add('hidden');
          } else {
            removeBtn.classList.remove('hidden');
          }
        }
      });
    }

    function addEditConcertDateField(value = "") { //新增編輯演唱會日期欄位
      const container = document.getElementById('edit-concert-dates-container');
      const row = document.createElement('div');
      row.className = 'flex items-center gap-2 edit-concert-date-row';
      const input = document.createElement('input');
      input.type = 'date';
      input.value = value;
      input.required = true;
      input.className = 'w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-zinc-800 text-xs';
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'shrink-0 w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100';
      removeButton.textContent = '✕';
      removeButton.setAttribute('aria-label', '移除此場次日期');
      removeButton.onclick = () => {
        if (container.querySelectorAll('.edit-concert-date-row').length <= 1) {
          showToast('演唱會至少需包含 1 個場次日期');
          return;
        }
        row.remove();
      };
      row.append(input, removeButton);
      container.appendChild(row);
    }

    async function openEditConcertModal() { //開啟編輯演唱會資訊彈窗
      if (!state.selectedConcert || !(await isUserAdmin())) {
        showToast('您沒有管理員權限');
        renderConcertDetail();
        return;
      }
      state.currentEditConcertImageBase64 = '';
      document.getElementById('edit-concert-image-file').value = '';
      document.getElementById('edit-concert-image-preview').src = state.selectedConcert.image || '';
      document.getElementById('edit-concert-artist').value = state.selectedConcert.artist || '';
      document.getElementById('edit-concert-tour').value = state.selectedConcert.tourName || '';
      document.getElementById('edit-concert-venue').value = state.selectedConcert.venue || '';
      const dateContainer = document.getElementById('edit-concert-dates-container');
      dateContainer.innerHTML = '';
      (state.selectedConcert.dates || []).forEach(date => addEditConcertDateField(date));
      if (!dateContainer.children.length) addEditConcertDateField();
      document.getElementById('modal-edit-concert').classList.remove('hidden');
    }

    function closeEditConcertModal() {
      document.getElementById('modal-edit-concert').classList.add('hidden');
      state.currentEditConcertImageBase64 = '';
    }

    function openDeleteConcertConfirmModal() {
      const modal = document.getElementById('modal-delete-concert-confirm');
      if (!modal) return;
      modal.classList.remove('hidden');
    }

    function closeDeleteConcertConfirmModal() {
      const modal = document.getElementById('modal-delete-concert-confirm');
      if (!modal) return;
      modal.classList.add('hidden');
    }

    async function confirmDeleteConcert() {
      if (!state.selectedConcert) return;
      if (!(await isUserAdmin())) {
        showToast('您沒有管理員權限');
        return;
      }
      openDeleteConcertConfirmModal();
    }

    async function confirmDeleteConcertFromModal() {
      closeDeleteConcertConfirmModal();
      await executeDeleteConcert();
    }

    async function executeDeleteConcert() {
      if (!state.selectedConcert) return;
      if (!(await isUserAdmin())) {
        showToast('您沒有管理員權限');
        return;
      }

      try {
        const concertId = state.selectedConcert.id;
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'concerts', concertId));

        closeEditConcertModal();
        showToast('演唱會已刪除');

        setTimeout(() => {
          window.location.href = 'index.html';
        }, 500);

        if (typeof renderAll === 'function') {
          renderAll();
        }
      } catch (error) {
        console.error('Delete concert error:', error);
        showToast('刪除失敗，請稍後再試');
      }
    }

    async function handleEditConcertSubmit(event) { //更新演唱會資訊
      event.preventDefault();
      if (!state.selectedConcert || !(await isUserAdmin())) {
        showToast('您沒有管理員權限');
        closeEditConcertModal();
        renderConcertDetail();
        return;
      }
      const artist = document.getElementById('edit-concert-artist').value.trim();
      const tourName = document.getElementById('edit-concert-tour').value.trim();
      const venue = document.getElementById('edit-concert-venue').value.trim();
      const dates = Array.from(document.querySelectorAll('#edit-concert-dates-container input[type="date"]')).map(input => input.value).filter(Boolean);
      if (!artist || !tourName || !venue || !dates.length) {
        showToast('請完整填寫演唱會資訊與至少一個日期');
        return;
      }
      const endDate = dates[dates.length - 1]; //存最後一天
      const submitButton = document.getElementById('edit-concert-submit-btn');
      submitButton.disabled = true;
      submitButton.textContent = '儲存中…';
      try {
        let image = state.selectedConcert.image;
        if (state.currentEditConcertImageBase64) {
          const blob = await (await fetch(state.currentEditConcertImageBase64)).blob();
          const imageRef = ref(storage, `concert-covers/${state.selectedConcert.id}/${Date.now()}-cover.jpg`);
          await uploadBytes(imageRef, blob, { contentType: blob.type || 'image/jpeg', cacheControl: "public, max-age=31536000" });
          image = await getDownloadURL(imageRef);
        }

        const concertRef = doc(db, 'artifacts', appId, 'public', 'data', 'concerts', state.selectedConcert.id);
        await updateDoc(concertRef, {
          artist, tourName, venue, dates,endDate, image,
          updatedAt: serverTimestamp(),
          updatedBy: state.currentUser.id
        });

        const refreshedSnap = await getDoc(concertRef);
        if (refreshedSnap.exists()) {
          state.selectedConcert = refreshedSnap.data();
          localStorage.setItem('fe_v1_selectedConcert', JSON.stringify(state.selectedConcert));
        }

        closeEditConcertModal();
        if (typeof renderConcertDetail === 'function') {
          renderConcertDetail();
        }
        showToast('演出資訊已更新');
      } catch (error) {
        console.error('Edit concert error:', error);
        showToast('更新失敗，請稍後再試');
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = '儲存變更';
      }
    }

    // 演唱會圖片上傳與壓縮處理
    function handleImageCompression(event, { previewId, stateKey, successText }) {
      const file = event.target.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        showToast("請選擇有效的圖片格式！");
        event.target.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxSize = 1200;
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.85);
          state[stateKey] = compressedBase64;
          document.getElementById(previewId).src = compressedBase64;

          showToast(successText);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }

    function processConcertImageUpload(event) {
      handleImageCompression(event, {
        previewId: "add-concert-image-preview",
        stateKey: "currentAddConcertImageBase64",
        successText: "演唱會圖片選擇成功！"
      });
        document.getElementById("add-concert-image-preview-box").classList.remove("hidden");
    }

    function processEditConcertImageUpload(event) {
      handleImageCompression(event, {
        previewId: "edit-concert-image-preview",
        stateKey: "currentEditConcertImageBase64",
        successText: "新圖片已準備好，儲存後才會更新"
      });
}

    // 清除已上傳的圖片
    function clearConcertUploadedImage() {
      state.currentAddConcertImageBase64 = "";
      document.getElementById("add-concert-image-file").value = "";
      document.getElementById("add-concert-image-preview-box").classList.add("hidden");
      document.getElementById("add-concert-upload-btn-text").innerText = "上傳圖片";
    }

    function closeAddConcertModal() {
      document.getElementById("modal-add-concert").classList.add("hidden");
      clearConcertUploadedImage();
    }

    async function handleAddConcertSubmit(e) {
      e.preventDefault();
      let finalImageUrl = "";
      const artist = document.getElementById("add-concert-artist").value.trim();
      const tourName = document.getElementById("add-concert-tour").value.trim();
      const venue = document.getElementById("add-concert-venue").value.trim();
      if(artist === "" || tourName === "" || venue === ""){
        showToast("請完整填寫演唱會資訊");
        return;
      }
      const container = document.getElementById('add-concert-dates-container');
      const dateCount = container.querySelectorAll('.concert-date-row').length;
      const dates = [];
      for (let i = 1; i <= dateCount; i++) {
        const dateInput = document.getElementById(`add-concert-date-${i}`);
        if (dateInput) {
          const dateValue = dateInput.value.trim();
          if (dateValue) {
            dates.push(dateValue);
          }
        }
      }
      const endDate = dates[dates.length - 1]; //存最後一天
      const newId = `concert_${Date.now()}`;


      try {
        // 若使用者有上傳照片，將圖片上傳至 Firebase Storage
        if (state.currentAddConcertImageBase64) {
          if (state.currentUser) {
            const blob = await (await fetch(state.currentAddConcertImageBase64)).blob();
            const fileName = `${Date.now()}-cover.jpg`;
            const imageRef = ref(storage, `concert-covers/${newId}/${fileName}`);
            await uploadBytes(imageRef, blob, { contentType: blob.type || "image/jpeg", cacheControl: "public, max-age=31536000" });
            finalImageUrl = await getDownloadURL(imageRef);
          } else {
            // 未登入情境下
            return showToast("請先登入後再上傳演唱會圖片");
          }
        }else{
          showToast("請上傳演唱會圖片");
          return;
        }
        const newConcert = {
          id: newId,
          artist, tourName, venue, dates,endDate,
          image: finalImageUrl,
          isPending: true,
          verifiedCount: 1,
          attendedCount: 0,
          createdAt: serverTimestamp(),
        };
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'concerts', newId), newConcert);
        closeAddConcertModal();
        showToast("提案建立成功！獲得 20 位現場粉絲確認後即正式上架");
      } catch (error) {
        console.error("Add concert error:", error);
        showToast("傳輸失敗，請稍後再試");
      }
    }

    window.processConcertImageUpload = processConcertImageUpload;
    window.addConcertDateField = addConcertDateField;
    window.removeConcertDateField = removeConcertDateField;
    window.clearConcertUploadedImage = clearConcertUploadedImage;
    
    window.openAddConcertModal = openAddConcertModal;
    window.closeAddConcertModal = closeAddConcertModal;
    window.handleAddConcertSubmit = handleAddConcertSubmit;
    window.openEditConcertModal = openEditConcertModal;
    window.closeEditConcertModal = closeEditConcertModal;
    window.confirmDeleteConcert = confirmDeleteConcert;
    window.confirmDeleteConcertFromModal = confirmDeleteConcertFromModal;
    window.closeDeleteConcertConfirmModal = closeDeleteConcertConfirmModal;
    window.executeDeleteConcert = executeDeleteConcert;
    window.handleEditConcertSubmit = handleEditConcertSubmit;
    window.processEditConcertImageUpload = processEditConcertImageUpload;
    window.addEditConcertDateField = addEditConcertDateField;
