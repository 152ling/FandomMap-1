  import { state } from './state.js';
  import { openPostDetailModal } from "./common.js";
  import { closePostDetailModal } from "./support.js";
  import { db,auth,storage,appId} from "./firebase-config.js";
  import { getAuth, onAuthStateChanged} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
  import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection,increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
  import { query,where,getCountFromServer,getDocs} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
  import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject,listAll } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

      // ==================== STREAMING_CHUNK: 個人發布管理網格渲染 ====================
    async function renderProfile() {
      const container = document.getElementById("my-posts-list-container");
      container.innerHTML = "";

      if(state.currentUser.isAnonymous){
        container.className = "block";
        container.innerHTML = `
          <p class="text-xs text-zinc-400 py-6 text-center">
            您目前在任何看板中尚未發文
          </p>
        `;
        return;
      }
      
      const uid = state.currentUser.id;
      const concertcount = document.getElementById("user-concert-count");
      const supportcount = document.getElementById("user-support-count");
      const collectcount = document.getElementById("user-bookmarked-count");
      // 1. 查詢我參加的演唱會數量
      const attendedRef = collection(db,"artifacts",appId,"users",uid,"attendedConcerts");
      // 2. 查詢我發布的免費應援
      const supportRef = collection(db,"artifacts",appId,"public","data","supportEvents");
      const supportQuery = query(
        supportRef,
        where("userId", "==", uid)
      );

      // 3. 查詢我發布的交換應援
      const exchangeRef = collection(db,"artifacts",appId,"public","data","exchangePosts");
      const exchangeQuery = query(
        exchangeRef,
        where("userId", "==", uid)
      );

      const [
        attendSnapshot,
        supportSnapshot,
        exchangeSnapshot
      ] = await Promise.all([
        getCountFromServer(attendedRef),
        getDocs(supportQuery),
        getDocs(exchangeQuery)
      ]);

      // 4. 參加演唱會數量
      const attendedConcertCount =attendSnapshot.data().count;
      concertcount.innerText = attendedConcertCount;

      // 5. 把「我的應援」資料整理出來
      const mySupports = supportSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        myType: "free-support"
      }));

      const myExchanges = exchangeSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        myType: "support-exchange"
      }));

      // 6. 發布數量
      const SupportCount = mySupports.length;
      const ExchangeCount = myExchanges.length;
      supportcount.innerText = SupportCount + ExchangeCount;

      // 7. 我的應援被收藏數
      const BookmarkCount = [
        ...mySupports,
        ...myExchanges
      ].reduce(
        (total, item) =>
          total + Number(item.bookmarkCount || 0),
        0
      );
      collectcount.innerText = BookmarkCount;

      // 8. 合併管理列表
      const allMyPosts = [
        ...mySupports,
        ...myExchanges
      ];

      // 9. 沒有發布任何文章
      if (allMyPosts.length === 0) {
        container.className = "block";
        container.innerHTML = `
          <p class="text-xs text-zinc-400 py-6 text-center">
            您目前在任何看板中尚未發文
          </p>
        `;
        return;
      }
      // 10. 渲染我的發布與管理區塊 (含融入的 Tab 列)
      const myPostsContainer = document.getElementById("my-posts-list-container");
      if (!myPostsContainer) return;
      if (!state.profileActiveTab) {state.profileActiveTab = 'all';}
      const filterTabs = [
        { id: 'all', label: 'All' },
        { id: 'free-support', label: '免費應援' },
        { id: 'exchange-support', label: '交換應援' }
      ];
      const getTabCount = (tabId) => {
        switch (tabId) {
          case 'all':
            return SupportCount + ExchangeCount;
          case 'free-support':
            return SupportCount;
          case 'exchange-support':
            return ExchangeCount;
          default:
            return 0;
        }
      };
      // 組合 Tab 按鈕 HTML (融入您提供的 UI 邏輯與樣式)
      const tabsHtml = `
        <div id="profile-tabs-wrapper" class="flex items-center space-x-1 bg-zinc-100 rounded-xl overflow-x-scroll p-1 text-xs no-scrollbar mb-4">
          ${filterTabs.map(tab => {
            const isActive = state.profileActiveTab === tab.id;
            const count = getTabCount(tab.id);
            return `
              <button 
                data-tab-id="${tab.id}"
                class="px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap flex-1 items-center space-x-1.5 ${
                  isActive 
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }"
              >
                <span>${tab.label}(${count})</span>
              </button>
            `;
          }).join('')}
        </div>
      `;
      // 根據 Tab 篩選出要顯示的發布列表
      let displayPosts = [];
      if (state.profileActiveTab === 'all') {
        displayPosts = allMyPosts;
      } else if (state.profileActiveTab === 'free-support') {
        displayPosts = mySupports;
      } else if (state.profileActiveTab === 'exchange-support') {
        displayPosts = myExchanges;
      }

      // 根據當前 Tab 選擇渲染對應內容
      let contentHtml = '';
      if (displayPosts.length === 0) {
        contentHtml = `<div class="col-span-full text-center py-8 text-zinc-400 text-xs">尚無發布項目</div>`;
      } else {
        contentHtml = displayPosts.map(post => {
          const isFreeSupport =post.type === "free-support";
          return `
            <div class="bg-white border border-zinc-200 rounded-xl p-3 flex gap-3 items-center justify-between">
              <div class="flex items-center gap-3 overflow-hidden">
                <img src="${post.images ? post.images[0] : (post.image || '')}" class="w-12 h-12 rounded-lg object-cover bg-zinc-100 shrink-0">
                <div class="truncate">
                  <span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mt-1 ${
                    isFreeSupport ? 'bg-emerald-50 text-emerald-600 border border-emerald-200':'bg-amber-50 text-amber-600 border border-amber-200'
                  }">
                    ${isFreeSupport ? "應援" : "交換"}
                  </span>
                  <h5 class="text-xs font-bold text-zinc-800 truncate">${post.title}</h5>
                  <span class="text-[10px] flex items-center text-slate-400"><i class="fa-regular fa-bookmark mr-1 text-[11px]"></i> ${post.bookmarkCount} 收藏</span>
                </div>
              </div>

                <button onclick="openPostDetailModal('${post.type || 'support'}', '${post.id}')" class="text-purple-600 font-bold shrink-0 text-[10px] ml-2 font-semibold">
                  管理
                </button>
            </div>
          `;
        }).join('');
      }
      // 更新畫面 DOM
      myPostsContainer.parentElement.innerHTML = `
        <h4 class="text-sm font-bold text-zinc-800 flex items-center gap-1.5 mb-3">
          我的發布管理
        </h4>
        ${tabsHtml}
        <div id="my-posts-list-container" class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${contentHtml}
        </div>
      `;

      // 綁定 Tab 切換點擊事件 (Event Delegation)
      const tabsWrapper = document.getElementById('profile-tabs-wrapper');
      if (tabsWrapper) {
        tabsWrapper.addEventListener('click', (e) => {
          const button = e.target.closest('button[data-tab-id]');
          if (!button) return;
          
          const tabId = button.getAttribute('data-tab-id');
          if (tabId && state.profileActiveTab !== tabId) {
            state.profileActiveTab = tabId;
            renderProfile(); // 重新渲染更新面板內容
          }
        });
      }
    }
  export function openProfileModal() {
      document.getElementById('input-avatar-preview').src = state.currentUser.avatar;
      document.getElementById('input-display-name').value = state.currentUser.username;
      document.getElementById('input-social-link').value = state.currentUser.contact;
      document.getElementById('info-account-email').textContent = state.currentUser.email;
      document.getElementById('info-account-uid').textContent = state.currentUser.id;
      document.getElementById('profile-modal').classList.remove('hidden');
  }

    export function closeProfileModal() {
      document.getElementById('profile-modal').classList.add('hidden');
    }
    export function copyUID() {
      const tempInput = document.createElement('input');
      tempInput.value = state.currentUser.id;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      showToast('已複製 UID 至剪貼簿');
   }

    async function saveUserProfile() {
      if (!state.currentUser) return;
      const username = document.getElementById("input-display-name").value.trim() || state.currentUser.username;
      const contact = document.getElementById("input-social-link").value.trim() || '';

      showToast("保存中...");
      try {
        const profileDocRef = doc(db, 'artifacts', appId, 'users', state.currentUser.id, 'profile', 'data');
        const updateData = { username, contact, avatar: state.currentUser.avatar };
        await updateDoc(profileDocRef, updateData);

        state.currentUser.username = username;
        state.currentUser.contact = contact;

        document.getElementById("profile-avatar-file").src = state.currentUser.avatar;
        showToast("個人資料已儲存！");
        closeProfileModal();
        // 同步個人中心編輯欄位
        document.getElementById("profile-input-username").textContent = state.currentUser.username;
        document.getElementById("user-social-handle").textContent = getSocialHandle(state.currentUser.contact);
        document.getElementById('user-social-link').href = state.currentUser.contact;
        document.getElementById("profile-display-avatar").src = state.currentUser.avatar;
        document.getElementById("user-avatar-snapshot").src = state.currentUser.avatar;

      } catch (error) {
        console.error("Save profile error:", error);
        showToast("保存失敗，請稍後再試");
      }
    }
    export function getSocialHandle(link) {
        if (!link || !link.includes('@')) return '未提供';
          const cleanLink = link.split('?')[0];
          const handle = '@' + cleanLink.split('@')[1];
          return handle.replace(/\/$/, '');
    }
    // ==================== STREAMING_CHUNK: 個人資料與頭像管理 ====================

    function processProfileAvatarUpload(event) {
      const file = event.target.files[0];
      if (!file || !file.type.startsWith("image/")) {
        showToast("請選擇有效的圖片格式");
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const image = new Image();
        image.onload = () => {
          const maxSize = 320;
          const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);
          canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
          state.currentUser.avatar = canvas.toDataURL("image/jpeg", 0.82);
          document.getElementById("input-avatar-preview").src = state.currentUser.avatar;
          // document.getElementById("user-avatar-snapshot").src = state.currentUser.avatar;
          showToast("頭像上傳成功");
        };
        image.src = loadEvent.target.result;
      };
      reader.readAsDataURL(file);
    }
window.renderProfile=renderProfile;
window.openProfileModal=openProfileModal;
window.closeProfileModal=closeProfileModal;
window.copyUID=copyUID;
window.saveUserProfile = saveUserProfile;
window.getSocialHandle=getSocialHandle;