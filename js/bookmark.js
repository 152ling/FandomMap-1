    import { state } from './state.js';
    import './common.js';
    import './color.js';
    import { db,auth,storage,appId} from "./firebase-config.js";
    import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection,increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
    import {query,where,getCountFromServer,getDocs} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
    import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject,listAll } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
    
// ==================== STREAMING_CHUNK: 收藏夾清單 RWD 渲染 ====================
      //收藏頁面的藝人篩選分類
    export function renderArtistTabs() {
      const container = document.getElementById('artistTabs');
       // 從現有收藏項目的 concertId 反查出所有出現過的 artist 集合
      const artistsSet = new Set();
      Object.values(state.bookmarkData).forEach(bookmark => {
        const concert = state.bookmarkedConcerts[bookmark.concertId];
          if (concert?.artist) {artistsSet.add(concert.artist);}
      });
      const artists = ['all', ...Array.from(artistsSet)];
            
      let html = '';
      artists.forEach(artist => {
      const isActive = state.currentArtist === artist;
      const displayName = artist === 'all' ? '全部藝人' : artist;
      const activeClass = isActive ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200';
                
      html += `<button onclick="setArtistFilter('${artist}')" class="px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${activeClass}">
        ${displayName}</button>`;
      });
      container.innerHTML = html;
    }
        // 切換藝人過濾
    export function setArtistFilter(artist) {
      state.currentArtist = artist;
      state.currentConcertId = 'all'; // 切換藝人時重置場次選擇
      renderArtistTabs();
      updateConcertDropdown();
      renderBookmarks();
    }

        // 根據當前選擇的藝人動態過濾第二層的演唱會場次下拉選單
    export function updateConcertDropdown() {
      const select = document.getElementById('concertSelect');
      let availableConcerts = Object.values(state.bookmarkedConcerts);
            
      if (state.currentArtist !== 'all') {
          availableConcerts =availableConcerts.filter(c => c.artist === state.currentArtist);
      }
            
      let html = '<option value="all">-- 全部場次 --</option>';
      availableConcerts.forEach(concert => {
        const selected = state.currentConcertId === concert.id ? 'selected' : '';
        html += `<option value="${concert.id}" ${selected}>${concert.tourName}</option>`;
      });
      select.innerHTML = html;
    }

    // 下拉選單變更場次
    export function handleConcertSelect(concertId) {
        state.currentConcertId = concertId;
        renderBookmarks();
    }

    export function clearKeywordSearch() { // 新增：清除搜尋內容函數
      state.searchSupportQuery = '';

      const input = document.getElementById('support-search-input');
      if (input) { input.value = '';}
      const clearBtn = document.getElementById('search-clear-btn');
      if (clearBtn) {clearBtn.classList.add('hidden');}
  
      renderBookmarks();
    }

    let showStatusFilter = false;
    export function togglefilterPanelVisibility(){
      showStatusFilter = !showStatusFilter;
      const panel = document.getElementById('filterPanel');
      const btn= document.getElementById('toggleFilterBtn');
      if (showStatusFilter) {
        panel.classList.add('show');
        panel.classList.add('p-4');panel.classList.add('mb-4');
        btn.className = "p-2.5 rounded-2xl transition-all relative flex items-center justify-center  shadow-sm border bg-brand border-brand text-white";
      } else {
        panel.classList.remove('show');
        panel.classList.remove('p-4');panel.classList.remove('mb-4');
        btn.className = "p-2.5 rounded-2xl transition-all relative flex items-center justify-center  shadow-sm border bg-white border-zinc-200 text-slate-400";
      }
    }
    export function clearAllSearch(){ //清除所有篩選
      // 清除搜尋框與關鍵字狀態
      state.searchSupportQuery = '';
      state.currentArtist = 'all';
      state.currentConcertId = 'all';
      const input = document.getElementById('support-search-input');
      if (input) { input.value = '';}
      const clearBtn = document.getElementById('search-clear-btn');
      if (clearBtn) {clearBtn.classList.add('hidden');}
      renderArtistTabs();
      updateConcertDropdown();
      renderBookmarks();
    }
    
    export function renderBookmarks() {
      const searchContainer =document.getElementById("search-container");
      searchContainer.innerHTML = `<div class="relative flex mb-4 gap-2">
            <div class="relative flex-1 flex items-center">
                <input placeholder="輸入藝人或是應援物名稱" id="support-search-input" type="text" value="${state.searchSupportQuery || ''}" oninput="state.searchSupportQuery=this.value;document.getElementById('search-clear-btn').classList.toggle('hidden', !this.value);renderBookmarksItems()" class="w-full bg-white border border-zinc-200 rounded-2xl py-3 pl-11 pr-4 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-brand text-zinc-800 transition-all">
                <svg class="text-brand w-4 h-4 absolute left-4 top-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke-width="3"/></svg>
                <button id="search-clear-btn" onclick="clearKeywordSearch()" 
                  class="${state.searchSupportQuery ? '' : 'hidden'} absolute right-4 top-3.5 text-slate-400 hover:text-brand transition-colors p-0.5 rounded-full hover:bg-slate-50 active:scale-90 transition-all" 
                  title="清空搜尋">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
            </div>
            <button id="toggleFilterBtn"  onclick="togglefilterPanelVisibility()"
                class="cursor-pointer p-2.5 rounded-2xl transition-all relative flex items-center justify-center shadow-sm border ${showStatusFilter ? 'bg-brand border-brand text-white' : 'bg-white border-zinc-200 text-slate-400'}"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sliders-horizontal-icon lucide-sliders-horizontal"><path d="M10 5H3"/><path d="M12 19H3"/><path d="M14 3v4"/><path d="M16 17v4"/><path d="M21 12h-9"/><path d="M21 19h-5"/><path d="M21 5h-7"/><path d="M8 10v4"/><path d="M8 12H3"/></svg>
            </button>
      </div>`;
      const searchtitle =document.getElementById('search-title');
      const filterStatusText = document.getElementById('filterStatusText');
      const hasActiveFilters = state.searchSupportQuery || state.currentArtist !=='all' || state.currentConcertId !== 'all';
      searchtitle.innerHTML=`<span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">依藝人/團體篩選</span>
        <button id="clearFiltersBtn" onclick="clearAllSearch()" class="${hasActiveFilters ? '':'hidden'} text-xs text-brand hover:underline font-semibold">
          清除所有篩選
        </button>`
      renderBookmarksItems();
    }
    async function renderBookmarksItems() {
      const container = document.getElementById("bookmarks-list-container");
      container.innerHTML = "";
      container.className = "space-y-4";
      const allBookmarked = [];

        state.supportEvents.forEach(item => {
          if (state.bookmarkedPostIds.includes(item.id)) {
            allBookmarked.push({
              ...item,
              bookmarkType: "free-support"
            });
          }
        });

        state.exchangePosts.forEach(item => {
          if (state.bookmarkedPostIds.includes(item.id)) {
            allBookmarked.push({
              ...item,
              bookmarkType: "support-exchange"
            });
          }
        });
      
      let filtered = allBookmarked.filter(item => {
        const concertObj = state.bookmarkedConcerts[item.concertId] || {};
        const artistName = concertObj.artist || "";
        const tourName = concertObj.tourName || "";
        const matchArtist = state.currentArtist === 'all' || artistName === state.currentArtist;
        const matchConcert = state.currentConcertId === 'all' || item.concertId === state.currentConcertId;
        const keyword = (state.searchSupportQuery || "").trim().toLowerCase();
        const matchSearch = !keyword || (
          (item.title || "").toLowerCase().includes(keyword) ||
          tourName.toLowerCase().includes(keyword) ||
          artistName.toLowerCase().includes(keyword)
        );
        return matchArtist && matchConcert && matchSearch;
      });
      if (state.currentArtist === 'all') {
        filterStatusText.textContent = '顯示全部應援物收藏';
      } else if (state.currentConcertId === 'all') {
        filterStatusText.textContent = `正在檢視【${state.currentArtist}】的所有場次`;
      } else {
          filterStatusText.textContent = `正在檢視特定場次`;
      }

      if (filtered.length === 0) {
        container.className = "block";
        container.innerHTML = `
          <div class="text-center py-24 text-zinc-400 bg-zinc-50 rounded-2xl border border-zinc-100">
            <p class="text-xs mt-2.5 font-bold">尚未收藏任何應援或卡片項目</p>
            <p class="text-[11px] text-zinc-400 mt-1">在應援詳細頁面點擊愛心即可收藏</p>
          </div>
        `;
        return;
      }
      document.getElementById("itemCount").innerText = `共${filtered.length}件`;
      const itemsContainer = document.createElement("div");
      itemsContainer.className = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2";

      filtered.forEach(item => {
        const isFreeSupport = item.bookmarkType === "free-support";
        const row = document.createElement("div");
        row.className = "bg-white border border-slate-200/80 rounded-xl overflow-hidden hover:shadow-md transition group flex flex-col";

        row.onclick = () => openPostDetailModal(item.bookmarkType, item.id);

        row.innerHTML = `
          <div class="h-40 relative aspect-square bg-slate-100 overflow-hidden cursor-pointer">
            <img src="${item.image}" alt="${item.title}" onerror="this.src='https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=400'" 
                class="w-full h-full object-cover object-center transition duration-300">
            <span class="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-md ${isFreeSupport ? "bg-violet-50 text-violet-700 border-violet-100": "bg-pink-50 text-pink-700 border-pink-100"}">
              ${isFreeSupport ? "免費應援": "交換應援"}
            </span>
          </div>
          <div>
            <div class="p-2.5 flex-1 flex justify-between">
              <div class="flex flex-col">
                <h3 class="font-bold text-slate-800 text-xs mb-1 line-clamp-1">${item.title}</h3>
                <p class="text-[10px] font-medium text-slate-400 line-clamp-1 mb-0.5">位置:${item.approxLocation}</p>
              </div>
              <div class="flex items-center justify-end">
                <button
                  type="button"
                  onclick="event.stopPropagation(); toggleBookmark(event, '${item.id}')"
                  class="w-6 h-6 rounded-full flex items-center justify-center text-pink-500 shrink-0 hover:bg-pink-50 transition-colors"
                  aria-label="取消收藏"
                >
                  <i class="fa-solid fa-heart text-xs"></i>
                </button>
              </div>
            </div>
          </div>
        `;

        itemsContainer.appendChild(row);
      });

      container.appendChild(itemsContainer);

    }
    async function toggleBookmark(event,postId) {
        event.stopPropagation();
        if (state.currentUser.isAnonymous) {
          showToast("請先前往登入才能收藏應援");
          return;
        }
        const uid = state.currentUser.id;
        
        const supportItem = state.supportEvents.find(item => item.id === postId);
        const exchangeItem = state.exchangePosts.find(item => item.id === postId);
        const item = supportItem || exchangeItem;
        if (!item) {
          showToast("找不到該應援資料");
          return;
        }
        const postType = supportItem ? "free-support" : "support-exchange";
        const collectionName = supportItem ? "supportEvents": "exchangePosts";

        const bookmarkRef = doc(db,"artifacts",appId,"users",uid,"bookmarks",postId);
        const postRef = doc(db,"artifacts",appId,"public","data",collectionName,postId);
        const isBookmarked = state.bookmarkedPostIds.includes(postId);
        if (isBookmarked) {  
            state.pendingRemoveBookmarkId = postId; // 暫存要取消收藏的 ID
            // 開啟確認視窗
            document.getElementById("modal-bookmark-confirm").classList.remove("hidden");
        } else { //如果收藏頁面沒有馬上更新頁面可以重新收藏
          try {
            await setDoc(bookmarkRef, {
              postId,
              type: postType,
              concertId: item.concertId,
              bookmarkedAt: serverTimestamp()
            });

            await updateDoc(postRef, {
              bookmarkCount: increment(1)
            });
            state.bookmarkedPostIds.push(postId);
            state.bookmarkData[postId] = {
              postId,
              type: postType,
              concertId: item.concertId,
            };
            localStorage.setItem("fe_v1_bookmarkedPostIds",JSON.stringify(state.bookmarkedPostIds));
            localStorage.setItem("fe_v1_bookmarkData",JSON.stringify(state.bookmarkData));

            showToast("已成功收藏該項目");
            renderBookmarks();

          } catch (error) {
            console.error("Add bookmark error:", error);
            state.bookmarkedPostIds = state.bookmarkedPostIds.filter(id => id !== postId);
            localStorage.setItem("fe_v1_bookmarkedPostIds",JSON.stringify(state.bookmarkedPostIds));
            delete state.bookmarkData[postId];
            localStorage.setItem("fe_v1_bookmarkData",JSON.stringify(state.bookmarkData));
            showToast("收藏失敗，請稍後再試");
          }
            
        }
    }
    function closeBookmarkConfirmModal() {
      document.getElementById("modal-bookmark-confirm").classList.add("hidden");
      state.pendingRemoveBookmarkId = null;
    }
    async function executeRemoveBookmark() { //收藏頁用 取消收藏
      if (!state.pendingRemoveBookmarkId) return;

      const postId = state.pendingRemoveBookmarkId;
      const uid = state.currentUser.id;

      const bookmarkRef = doc(db,"artifacts",appId,"users",uid,"bookmarks",postId);

      try {
        // 先取得 bookmark 裡面的 type
        const bookmarkSnap = await getDoc(bookmarkRef);

        if (!bookmarkSnap.exists()) {
          showToast("找不到收藏資料");
          return;
        }
        const bookmarkData = bookmarkSnap.data();

        const collectionName =bookmarkData.type === "free-support"? "supportEvents": "exchangePosts";

        const postRef = doc(db,"artifacts",appId,"public","data",collectionName,postId);

        await deleteDoc(bookmarkRef);

        await updateDoc(postRef, {
          bookmarkCount: increment(-1)
        });

        // 更新本地狀態
        state.bookmarkedPostIds = state.bookmarkedPostIds.filter(id => id !== postId);
        localStorage.setItem("fe_v1_bookmarkedPostIds",JSON.stringify(state.bookmarkedPostIds));
        delete state.bookmarkData[postId];
        localStorage.setItem("fe_v1_bookmarkData",JSON.stringify(state.bookmarkData));
        closeBookmarkConfirmModal();
        showToast("已將該項目移出我的收藏");
        renderBookmarks();
      } catch (error) {
        console.error("Remove bookmark error:", error);
        showToast("取消收藏失敗，請稍後再試");
      }
    }



    // function getBookmarkStatusText(status) {
    //   const statusMap = {
    //     ACTIVE: "發放中",
    //     OPEN: "開放中",
    //     ENDED: "已結束",
    //     CLOSED: "已結束"
    //   };

    //   return statusMap[status] || "";
    // }
    window.renderArtistTabs=renderArtistTabs;
    window.setArtistFilter=setArtistFilter;
    window.updateConcertDropdown=updateConcertDropdown;
    window.togglefilterPanelVisibility =togglefilterPanelVisibility ;
    window.clearKeywordSearch = clearKeywordSearch; //清input
    window.clearAllSearch=clearAllSearch; //全部清
    window.handleConcertSelect=handleConcertSelect;
    window.renderBookmarks=renderBookmarks;
    window.renderBookmarksItems=renderBookmarksItems;

    window.toggleBookmark=toggleBookmark;
    window.closeBookmarkConfirmModal=closeBookmarkConfirmModal;
    window.executeRemoveBookmark=executeRemoveBookmark;