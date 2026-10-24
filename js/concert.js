import { state } from './state.js';
import './common.js';
import './color.js';
import './profile.js';
import './bookmark.js'
import { db,auth,storage,appId} from "./firebase-config.js";
import { getAuth, onAuthStateChanged} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection,increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { query,where,getCountFromServer,getDocs} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject,listAll } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

let isAdminClaimResolved = false;
let hasAdminClaim = false;
    // ==================== STREAMING_CHUNK: 演唱會詳細看板 RWD 渲染 ====================
async function navigateToConcert(concertId) {
    const concertRef = doc(db, 'artifacts', appId, 'public', 'data', 'concerts', concertId);
    const concertSnap = await getDoc(concertRef);
    if (concertSnap.exists()) {
        state.selectedConcert = concertSnap.data();
        localStorage.setItem("fe_v1_selectedConcert", JSON.stringify(state.selectedConcert));
    } else {
        console.log("沒有找到演唱會");
        window.location.href = "index.html";
    }
      if (!state.selectedConcert) return;

      state.selectedDate = state.selectedConcert.dates[0];
      state.selectedSubCategory = "support";

      document.getElementById("header-back-btn").classList.remove("hidden");
      document.getElementById("header-logo").classList.add("hidden");
    //   document.getElementById("add-concert-btn").classList.add("hidden");
    //   document.getElementById("floating-publish-btn").classList.remove("hidden");
      if(state.selectedConcert.isPending) { //審核中
        document.getElementById("floating-publish-btn").classList.add("bg-gray-200", "text-gray-400");
        document.getElementById("floating-publish-btn").classList.remove("hidden","bg-brand", "text-white");
      }else{
        document.getElementById("floating-publish-btn").classList.remove("bg-gray-200", "text-gray-400");
        document.getElementById("floating-publish-btn").classList.add("bg-brand", "text-white");
      }
      renderConcertDetail();
    }

    function renderConcertDetail() {
      if (!state.selectedConcert) return;

      document.getElementById("detail-concert-image").src = state.selectedConcert.image;
      document.getElementById("detail-concert-artist").innerText = state.selectedConcert.artist;
      document.getElementById("detail-concert-venue").innerText = state.selectedConcert.venue;
      document.getElementById("detail-concert-tour").innerText = state.selectedConcert.tourName;
      document.getElementById("detail-attend-count").innerText = state.selectedConcert.attendCount;
      document.getElementById("detail-concert-countdown").innerText = getDaysRemaining(state.selectedConcert.dates);
      const attendContainer = document.getElementById("detail-concert-attend-container");

      const pendingBox = document.getElementById("detail-concert-pending-box");
      const adminActions = document.getElementById('admin-concert-actions');
      const adminBtn = document.getElementById('admin-approve-btn');
      // 按鈕只會在 Custom Claim 識別完成、且確定為管理員後出現。
      adminActions.classList.toggle('hidden', !isAdminClaimResolved || !hasAdminClaim);
      if (state.selectedConcert.isPending) {
        pendingBox.classList.remove("hidden");
        attendContainer.classList.add("hidden");
        document.getElementById("detail-concert-pending-stats").innerText = ` ${state.selectedConcert.verifiedCount || 0}/20 位粉絲已確認`;
        adminBtn.classList.toggle('hidden', !hasAdminClaim);
      } else {
        pendingBox.classList.add("hidden");
        attendContainer.classList.remove("hidden");
        adminBtn.classList.add('hidden');
      }

      // 日期 Tabs 繪製
      const dateTabsContainer = document.getElementById("detail-date-tabs-container");
      dateTabsContainer.innerHTML = "";
      state.selectedConcert.dates.forEach((dateStr, idx) => {
        const formattedDate = dateStr.substring(5).replace("-", "/");
        const isSelected = state.selectedDate === dateStr;

        const btn = document.createElement("button");
        btn.className = `flex-1 lg:flex-none min-w-[85px] lg:w-full py-2.5 px-3 rounded-xl flex flex-row lg:justify-between items-center justify-center border transition-all active:scale-95 ${
          isSelected 
            ? "bg-brand border-brand text-white shadow-sm" 
            : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100"
        }`;
        btn.onclick = () => {
          state.selectedDate = dateStr;
          renderConcertDetail();
        };
        btn.innerHTML = `
          <span class="text-xs font-bold">Day ${idx + 1}</span>
          <span class="text-[10px] opacity-80 font-medium ml-1 lg:ml-0">${formattedDate}</span>
        `;
        dateTabsContainer.appendChild(btn);
      });

      // 分類統計
      const currentSupportCount = state.supportEvents.filter(e => e.concertId === state.selectedConcert.id && e.dates.includes(state.selectedDate)).length;
      const currentExchangeCount = state.exchangePosts.filter(p => p.concertId === state.selectedConcert.id && p.dates.includes(state.selectedDate)).length;
      const supportBtn = document.getElementById("label-toggle-support");
      const exchangeBtn = document.getElementById("label-toggle-exchange");

      const listContainer = document.getElementById("detail-event-list-container");
      listContainer.innerHTML = "";

      if (state.selectedSubCategory === "support") {
          supportBtn.innerHTML = `
          <span>免費應援</span>
          <span class="ml-0.5 px-1.5 py-0.5 bg-brand text-white rounded-full text-[10px]">
          ${currentSupportCount}</span>`;
    
          exchangeBtn.innerHTML = `
            <span>交換應援</span>
            <span class="ml-0.5 px-1.5 py-0.5 bg-zinc-200 text-zinc-600 rounded-full text-[10px]">
              ${currentExchangeCount}
            </span>
          `;
          

          const matched = state.supportEvents.filter(
            e => e.concertId === state.selectedConcert.id && e.dates.includes(state.selectedDate)
          );

          renderSupportList(
            matched,
            "此場次當天目前暫無免費應援",
            "點擊右下角「+」即可發布第一個現場應援！",
            "free-support"
          );
      } else {
          supportBtn.innerHTML = `
          <span>免費應援</span>
          <span class="ml-0.5 px-1.5 py-0.5 bg-zinc-200 text-zinc-600  rounded-full text-[10px]">
          ${currentSupportCount}</span>`;
    
          exchangeBtn.innerHTML = `
            <span>交換應援</span>
            <span class="ml-0.5 px-1.5 py-0.5 bg-brand text-white rounded-full text-[10px]">
              ${currentExchangeCount}
            </span>
          `;
          const matched = state.exchangePosts.filter(
            p => p.concertId === state.selectedConcert.id && p.dates.includes(state.selectedDate)
          );

          renderSupportList(
            matched,
            "此場次當天目前暫無交換需求",
            "點擊右下角「+」發布卡片與現場交換需求！",
            "support-exchange"
          );
      }
      updateConcertActionButtons();
    }
    // 渲染應援列表
    function renderSupportList(matched, emptyText, emptySubText, modalType){
      const listContainer = document.getElementById("detail-event-list-container");
      listContainer.innerHTML = "";
      if (matched.length === 0) {
        listContainer.className = "block";
        listContainer.innerHTML = `
          <div class="text-center py-16 text-zinc-400 bg-zinc-50 rounded-2xl border border-zinc-100">
            <p class="text-xs mt-2 font-bold">${emptyText}</p>
            <p class="text-[10px] text-zinc-400 mt-1">${emptySubText}</p>
          </div>
        `;
        return;
      }

      listContainer.className = "grid grid-cols-1 md:grid-cols-2 gap-4";

      matched.forEach(item => {

        const card = document.createElement("div");
        card.className = `
          bg-white hover:bg-zinc-50 
          border border-zinc-200 rounded-2xl p-4 
          flex gap-3.5 cursor-pointer 
          transition-all hover:-translate-y-0.5 shadow-sm

        `;

        card.onclick =() =>window.location.href =`SupportDetail.html?id=${item.id}&type=${modalType}`;

        const specificDateQty =
          (item.datesQuantities && item.datesQuantities[state.selectedDate]) !== undefined
            ? item.datesQuantities[state.selectedDate]
            : item.quantity;


        const categoryHtml = item.category.map(category => `
          <span class="px-1.5 py-1 text-[9px] font-semibold text-zinc-600 rounded-full flex items-center gap-1 border border-zinc-200">
            ${category}
          </span>
        `).join("");


        card.innerHTML = `
          <div class="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden shrink-0 border border-zinc-100 bg-zinc-100">
            <img src="${item.image}" alt="${item.title}" class="w-full h-full object-cover">
          </div>

          <div class="flex-1 min-w-0 flex flex-col justify-between text-left">
            <div>
              <div class="flex items-center mb-1 gap-1">
                ${categoryHtml}
                ${item.isAI
                    ? '<span class="px-1.5 py-1 text-[9px] font-semibold text-blue-600 rounded-full flex items-center gap-1 border border-blue-200">AI 生成</span>'
                    : ''}
              </div>

              <h4 class="text-xs md:text-sm font-bold text-zinc-900 text-wrap">
                ${item.title}
              </h4>
            </div>

            <div class="flex items-center justify-between mt-2.5 text-[10px] md:text-xs">
              <span class="text-zinc-500 font-medium truncate max-w-[140px] md:max-w-[180px]">
                位置：${item.approxLocation || "現場尋找"}
              </span>

              <div class="flex items-center gap-2">
                <span class="text-zinc-400">
                  發放 ${specificDateQty} 份
                </span>

              </div>
            </div>
          </div>
        `;

        listContainer.appendChild(card);
      });
    }
    export function setSubCategory(cat) {
      state.selectedSubCategory = cat;
      const btnSupport = document.getElementById("btn-toggle-support");
      const btnExchange = document.getElementById("btn-toggle-exchange");

      if (cat === "support") {
        btnSupport.className = "flex-1 py-2.5 rounded-lg text-xs md:text-sm font-bold flex items-center justify-center lg:justify-start lg:px-4 gap-2 transition-all bg-white text-zinc-900 shadow-sm lg:border lg:border-zinc-200";
        btnExchange.className = "flex-1 py-2.5 rounded-lg text-xs md:text-sm font-bold flex items-center justify-center lg:justify-start lg:px-4 gap-2 transition-all text-zinc-500 lg:border lg:border-transparent";
      } else {
        btnExchange.className = "flex-1 py-2.5 rounded-lg text-xs md:text-sm font-bold flex items-center justify-center lg:justify-start lg:px-4 gap-2 transition-all bg-white text-zinc-900 shadow-sm lg:border lg:border-zinc-200";
        btnSupport.className = "flex-1 py-2.5 rounded-lg text-xs md:text-sm font-bold flex items-center justify-center lg:justify-start lg:px-4 gap-2 transition-all text-zinc-500 lg:border lg:border-transparent";
      }

      renderConcertDetail();
    }
    async function toggleConcertAttend() {
      // const concert = state.bookmarkedConcerts.find(c => c.id === state.selectedConcert.id);
      const concert = state.selectedConcert;
      if (!concert) return;
      if (state.currentUser.isAnonymous){
        showToast("請先前往登入才能執行這項操作");
        return;
      }
      const uid = state.currentUser.id;
      const AttendedConcertsRef = doc(db,"artifacts",appId,"users",uid,"attendedConcerts",state.selectedConcert.id);
      const isAttended = state.userAttendedConcerts.includes(state.selectedConcert.id);
      const idx = state.userAttendedConcerts.indexOf(state.selectedConcert.id);
      const concertDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'concerts', state.selectedConcert.id);

      if (idx > -1) {
        showToast("已取消參加", "fa-circle-info");
        const nextCount = state.selectedConcert.attendedCount - 1;
        state.userAttendedConcerts = state.userAttendedConcerts.filter(id => id !== state.selectedConcert.id);
        await deleteDoc(AttendedConcertsRef);
        await updateDoc(concertDocRef, {
          attendedCount: increment(-1),
        });

      } else {
        showToast("已確認參加！當天現場見 🎉", "fa-circle-check");
        const nextCount = state.selectedConcert.attendedCount + 1;
        state.userAttendedConcerts.push(state.selectedConcert.id);
        await setDoc(AttendedConcertsRef, {
            concertId: state.selectedConcert.id,
        });
        await updateDoc(concertDocRef, {
          attendedCount: increment(1),
        });

      }
      updateConcertActionButtons();
      renderConcertDetail();
    }
    
    // 更新確定參戰 / 關注場次按鈕樣式
    export function updateConcertActionButtons() {
      const concert = state.selectedConcert;
      if (!concert) return;
      const isAttended = state.userAttendedConcerts.includes(state.selectedConcert.id);
      // 收藏
      const attendBtn = document.getElementById('btn-detail-attend');
      const attendText = document.getElementById('detail-attend-text');
      const attendIcon = document.getElementById('detail-attend-icon');
      document.getElementById('detail-attend-count').innerText = concert.attendedCount || 0;

      if (isAttended) {
        attendText.innerText = "已參加";
        attendBtn.className = "bg-amber-400 text-zinc-950 text-[11px] px-3.5 py-1.5 rounded-xl font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95";
        attendIcon.className = "fa-solid fa-ticket text-zinc-950";
      } else {
        attendText.innerText = "我會去";
        attendBtn.className = "bg-brand hover:bg-zinc-800 text-white text-[11px] px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm";
        attendIcon.className = "fa-solid fa-ticket text-amber-400";
      }
    }
    // 演唱會確認票數 +1
    async function voteForConcert() {
      if (!state.selectedConcert) return;
      if (!state.currentUser){
        showToast("請先前往登入才能執行這項操作");
        return;
      }
      try {
        const concertDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'concerts', state.selectedConcert.id);
        const nextCount = state.selectedConcert.verifiedCount + 1;
        const isVerified = nextCount >= 20 ? false : state.selectedConcert.isPending; // 達 20 人即結束審核中狀態
        const verifiedConcertsDocRef = doc(db, 'artifacts', appId, 'users', state.currentUser.id, 'verifiedConcerts',state.selectedConcert.id);
        
        const verifiedConcertSnap = await getDoc(verifiedConcertsDocRef);
        if (verifiedConcertSnap.exists()) {
          showToast("你已經確認過這場演唱會了！");
          return;
        }
        await updateDoc(concertDocRef, {
          verifiedCount: increment(1),
          isPending: isVerified
        });
        await setDoc(verifiedConcertsDocRef, {
          concertId: state.selectedConcert.id,
          verifiedAt: serverTimestamp()
        });

        if (nextCount >= 20 && state.selectedConcert.isPending) {
          showToast("此演唱會確認票數足夠，正式完成上架！");
        } else {
          showToast("感謝確認！");
        }
      } catch (error) {
        console.error("Vote concert error:", error);
      }
    }
    window.navigateToConcert=navigateToConcert;
    window.renderConcertDetail =renderConcertDetail;
    window.updateConcertActionButtons = updateConcertActionButtons;
    window.renderSupportList = renderSupportList;
    window.toggleConcertAttend = toggleConcertAttend;
    window.voteForConcert = voteForConcert;
    window.setSubCategory = setSubCategory;