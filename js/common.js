export let hasAdminClaim = false;
export let isAdminClaimResolved = false;
import { db,auth,storage,appId} from "./firebase-config.js";
import {renderAppearanceView} from "./color.js";
    export async function isUserAdmin() {
      const currentUser = auth.currentUser;
      if (!currentUser) return false;
      // 執行管理操作前強制刷新 Token，避免只信任畫面上的快取狀態。
      const idTokenResult = await currentUser.getIdTokenResult(true);
      hasAdminClaim = !!idTokenResult.claims.admin;
      isAdminClaimResolved = true;
      return hasAdminClaim;
    }
    export function resetAdminState() {
      hasAdminClaim = false;
      isAdminClaimResolved = true;
    }



    export function navigateBack() {
      switchTab("explore");
    }
    
export function switchTab(tabId) {
      state.activeTab = tabId;
      state.selectedConcert = null; 

      document.getElementById("header-back-btn").classList.add("hidden");
      document.getElementById("header-logo").classList.remove("hidden");
      // document.getElementById("add-concert-btn").classList.remove("hidden");
      // document.getElementById("floating-publish-btn").classList.add("hidden");
      if(tabId == "color"){renderAppearanceView();return;}
      const tabs = ["explore", "bookmarks", "profile"];
      tabs.forEach(t => {
        const btn = document.getElementById(`nav-btn-${t}`);
        if (btn) {
          if (t === tabId) {
            btn.classList.add("tab-active");
            // btn.classList.add("text-zinc-900");
            btn.classList.remove("text-zinc-400", "hover:text-zinc-600");
          } else {
            btn.classList.remove("text-zinc-900");
            btn.classList.remove("tab-active");
            btn.classList.add("text-zinc-400", "hover:text-zinc-600");
          }
        }

        const dkBtn = document.getElementById(`dk-nav-btn-${t}`);
        if (dkBtn) {
          if (t === tabId) {
            dkBtn.className = "text-sm font-bold text-zinc-900 border-b-2 border-zinc-900 pb-1 transition-all";
          } else {
            dkBtn.className = "text-sm font-medium text-zinc-400 hover:text-zinc-600 pb-1 transition-all";
          }
        }
      });
      if(tabId == "explore") {window.location.href =`index.html`}
      else if(tabId =="bookmarks"){window.location.href =`BookMark.html`;}
      else if(tabId =="profile"){window.location.href =`Profile.html`;}
      // renderAll();
    }
    export function showToast(message) {
      const container = document.getElementById("toast-container");
      document.getElementById("toast-text").innerText = message;
      container.classList.remove("hidden");

      setTimeout(() => {
        container.classList.add("hidden");
      }, 2500);
    }
    /**
     * 計算目標日期陣列中，距離今天最近的剩餘天數 (D-Day)
     * @param {Array<string>} datesArray - 演唱會日期陣列，如 ["2026-08-05", "2026-08-06"]
     * @returns {string} 回傳倒數狀態文字，例如 "D-3"、"D-Day"、"進行中" 或 "已結束"
     */
    export function getDaysRemaining(datesArray) {
      if (!Array.isArray(datesArray) || datesArray.length === 0) return '';

      const now = new Date();
      // 取得今天 00:00:00 的時間戳
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const oneDayMs = 24 * 60 * 60 * 1000; // 一天的毫秒數

      // 過濾出未來或今天的日期，並轉成時間戳排序
      const validTimestamps = datesArray
        .map(d => {
          const dateObj = new Date(d);
          return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()).getTime();
        })
        .filter(t => !isNaN(t))
        .sort((a, b) => a - b);

      if (validTimestamps.length === 0) return '';

      // 尋找第一個尚未發生的日期 ( >= 今天)
      const upcomingTimestamp = validTimestamps.find(t => t >= todayStart);

      // 如果找不到未來的日期，代表演唱會所有場次都已結束
      if (!upcomingTimestamp) {
        return '已結束';
      }
      // 計算相差天數
      const diffDays = Math.round((upcomingTimestamp - todayStart) / oneDayMs);
      if (diffDays === 0) {
        return 'D-Day'; // 今天開唱！
      } else {
        return `倒數${diffDays}天`; // 倒數 X 天
      }
    }
    export function openPostDetailModal(type, itemId, previewItem = null) {
      const isFreeSupport = type === "free-support";
      const item = previewItem || (isFreeSupport 
        ? state.supportEvents.find(s => s.id === itemId)
        : state.exchangePosts.find(e => e.id === itemId));

      if (!item) return;
      state.activeDetailItem = { type, data: item };

      const tag = document.getElementById("detail-item-tag");
      tag.innerHTML =item.category.map(category => `
        <span class="px-1.5 py-1 text-[10px] font-semibold bg-zinc-100 text-zinc-800 rounded-full flex items-center gap-1 border border-zinc-200">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-zinc-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-tag-icon lucide-tag"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>
          ${category}
        </span>`).join("")
        +(item.isAI
          ? `
            <span class="px-1.5 py-1 text-[10px] font-semibold text-blue-600 bg-white rounded-full flex items-center gap-1 border border-blue-200">
              AI 生成
            </span>
          `
        : "");

      const heart = document.getElementById("detail-bookmark-heart");
      document.getElementById("detail-bookmark-btn").classList.toggle("hidden", state.isPublishPreview);
      if (state.bookmarkedPostIds.includes(item.id)) {
        heart.classList.add("fill-pink-500", "text-pink-500");
        heart.classList.remove("text-zinc-400");
      } else {
        heart.classList.remove("fill-pink-500", "text-pink-500");
        heart.classList.add("text-zinc-400");
      }

      const detailImage = document.getElementById("detail-item-image");
      const detailGallery = document.getElementById("detail-item-image-gallery");
      const postImages = Array.isArray(item.images) && item.images.length ? item.images : [item.image];
      detailImage.src = postImages[0];
      detailGallery.innerHTML = "";
      postImages.forEach((image, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `w-12 h-12 shrink-0 overflow-hidden rounded-lg border ${index === 0 ? "border-purple-500" : "border-zinc-200"}`;
        button.innerHTML = `<img src="${image}" alt="照片 ${index + 1}" class="w-full h-full object-cover">`;
        button.onclick = () => {
          detailImage.src = image;
          detailGallery.querySelectorAll("button").forEach(el => el.classList.replace("border-purple-500", "border-zinc-200"));
          button.classList.replace("border-zinc-200", "border-purple-500");
        };
        detailGallery.appendChild(button);
      });
      detailGallery.classList.toggle("hidden", postImages.length < 2);
      document.getElementById("detail-item-title").innerText = item.title;
      
      const qtyRow = document.getElementById("detail-item-quantity-row");
      if (item.datesQuantities && Object.keys(item.datesQuantities).length > 0) {
        const length = Object.keys(item.datesQuantities).length;
        const flexDirection = length > 2 ? 'flex-col' : 'flex';
        const dotColors = [
            "bg-brand",
            "bg-zinc-500",
            "bg-zinc-300",
        ];
        // 將物件轉為陣列並逐一產生顯示字串
        const qtyHtml = Object.entries(item.datesQuantities)
          .map(([dateStr, qty], index) => {
            const dateSub = dateStr.substring(5).replace("-", "/");
            const dotColor = dotColors[index % dotColors.length];
            return `<div class="flex ${flexDirection} flex-1 items-center justify-between p-3 bg-white rounded-xl border border-zinc-200/60 shadow-xs">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full ${dotColor}"></span>
              <span class="text-xs font-semibold text-zinc-600">${dateSub}</span>
            </div>
            <span class="text-sm font-bold text-zinc-900">${qty}<span class="text-xs font-normal text-zinc-400">份</span></span>
          </div>`;
          })
          .join('');

        // 將組合好的 HTML 放入容器中
        qtyRow.innerHTML = `
          <div class="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 shadow-sm">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-icon lucide-calendar"><path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
                各場次發放數量
              </h3>
              <span class="text-xs font-semibold text-zinc-700 bg-zinc-200 px-2 py-0.5 rounded-full">
                共${item.totalquantity}份
              </span>
            </div>
              <div class="flex gap-2.5">
              ${qtyHtml}
              </div>
          </div>
        `;
        } else {
          // 相容舊資料（如果剛好有些舊資料只有總數量 item.quantity）
          qtyRow.innerHTML = `發放數量:<strong>${item.quantity || 0} 份</strong>`;
        }
        qtyRow.classList.remove("hidden");

      document.getElementById("detail-item-requirement").innerText = item.requirement || "無特殊限制";
      if(item.notice) {
        const noticeList = item.notice
          .split("\n")
          .filter(line => line.trim() !== "")
          .map(line => `<li>${line}</li>`)
          .join("");
        document.getElementById("detail-item-notice").innerHTML = `<ul class="text-xs text-zinc-600 space-y-1.5 pl-5 list-disc leading-relaxed">${noticeList}</ul>`;
      } else {
        document.getElementById("detail-item-notice").innerText ="無特殊注意事項";
      }
      document.getElementById("detail-item-approx").innerText = item.approxLocation || "現場尋找";

      const origContainer = document.getElementById("detail-link-original-container");
      const liveContainer = document.getElementById("detail-link-live-container");
      origContainer.innerHTML = "";
      liveContainer.innerHTML = "";

      if (item.originalLink) {
        origContainer.innerHTML = `
          <a href="${item.originalLink}" target="_blank" rel="noopener noreferrer" class="rounded-xl p-2.5 flex items-center gap-1.5 text-xs font-bold transition-all w-full justify-between bg-white text-zinc-900 border border-zinc-200 rounded-xl  shadow-sm">
            <div class="flex items-center gap-2">
              <div class="p-2 bg-brand rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg"class="w-4 h-4 text-zinc-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text-icon lucide-file-text"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
              </div>
              <div class="text-left leading-tight truncate">
                  <p class="text-[9px] text-zinc-400 font-medium">原始應援宣傳</p>
                  <p class="truncate max-w-[130px] md:max-w-[180px]">點擊開啟原貼文</p>
              </div>
           </div>
          </a>
        `;
      } else {
        origContainer.innerHTML = `
          <div class="bg-zinc-50 border border-zinc-100 rounded-xl p-2.5 flex items-center gap-1.5 text-zinc-400 text-xs w-full">
            <span>宣傳</span><p class="text-[10px] leading-tight">未提供原始貼文連結</p>
          </div>
        `;
      }

      if (item.liveUpdateLink) {
        liveContainer.innerHTML = `
          <a href="${item.liveUpdateLink}" target="_blank" rel="noopener noreferrer" class="group flex items-center justify-between p-2.5 bg-white text-xs text-zinc-900 rounded-xl border border-zinc-200 shadow-2xs hover:bg-zinc-50 transition-all active:scale-[0.99]">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-zinc-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin-icon lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <div class="text-left leading-tight truncate">
                <p class="text-[9px] text-zinc-400 font-medium">當日即時位置</p>
                <p class="truncate max-w-[130px] md:max-w-[180px] font-bold text-zinc-900">點擊看即時動態</p>
              </div>
            </div>
           </a>
        `;
      } else {
        liveContainer.innerHTML = `
          <div class="bg-zinc-50 border border-zinc-100 rounded-xl p-2.5 flex items-center gap-1.5 text-zinc-400 text-xs w-full">
            <span>位置</span><p class="text-[10px] leading-tight font-medium">未提供即時連結</p>
          </div>
        `;
      }

      const actionContainer = document.getElementById("detail-action-container");
      actionContainer.innerHTML = "";

      if (state.isPublishPreview) {
        actionContainer.innerHTML = `
          <div class="bg-zinc-50 border border-zinc-200 p-3.5 rounded-xl flex items-center justify-between">
            <div class="flex items-center gap-2">
              <img src="${item.userAvatar || 'https://api.dicebear.com/10.x/glyphs/svg?seed=fan'}" alt="發文者頭像" class="w-8 h-8 rounded-full border border-zinc-200 bg-white object-cover">
              <div class="text-left">
                <p class="text-[9px] text-zinc-400">發布用戶</p>
                <p class="text-xs font-bold text-zinc-700">${item.authorName || "現場粉絲"}</p>
              </div>
            </div>
            <a href="${item.contactInfo.startsWith('http') ? item.contactInfo : 'https://' + item.contactInfo}" 
              target="_blank"
              rel="noopener noreferrer"
              class="bg-brand text-white hover:bg-zinc-800 text-xs px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-sm">
              <span>查看帳號</span>
            </a>
          </div>
          <div class="rounded-xl border border-purple-100 bg-purple-50/50 p-3.5 space-y-3 mt-2">
            <div>
              <p class="text-xs font-black text-zinc-900">發布前預覽</p>
              <p class="text-[10px] text-zinc-500 mt-1">確認內容無誤後請點擊確認發布，發布後仍可編輯內容</p>
              <p class="text-[10px] text-zinc-500 mt-1">頭貼將使用發布當下的頭貼；日後更新頭貼應援內不會同步更新</p>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <button id="return-to-publish-editor-btn" type="button" onclick="returnToPublishEditor()" class="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs py-2.5 rounded-xl font-bold transition-all">返回編輯</button>
              <button id="confirm-publish-btn" type="button" onclick="confirmPublishFromPreview()" class="bg-brand hover:bg-zinc-800 text-white text-xs py-2.5 rounded-xl font-bold transition-all shadow-sm">確認發布</button>
            </div>
          </div>
        `;
      } else if (item.userId === state.currentUser.id) {
        actionContainer.innerHTML = `
          <div class="bg-zinc-50 border border-zinc-200 p-3.5 rounded-xl flex items-center justify-between">
            <div class="flex items-center gap-2">
              <img src="${item.userAvatar || 'https://api.dicebear.com/10.x/glyphs/svg?seed=fan'}" alt="發文者頭像" class="w-8 h-8 rounded-full border border-zinc-200 bg-white object-cover">
              <div class="text-left">
                <p class="text-[9px] text-zinc-400">發布用戶</p>
                <p class="text-xs font-bold text-zinc-700">${item.authorName || "現場粉絲"}</p>
              </div>
            </div>
            <a href="${item.contactInfo.startsWith('http') ? item.contactInfo : 'https://' + item.contactInfo}" 
              target="_blank"
              rel="noopener noreferrer"
              class="bg-brand text-white hover:bg-zinc-800 text-xs px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-sm">
              <span>查看社群</span>
            </a>
          </div>
          <div class="space-y-2 mt-2">
            <p class="text-[10px] text-purple-600 font-bold">這是您發佈的看板項目：</p>
            <div class="grid grid-cols-2 gap-2">
              <button onclick="startEditPost()" class="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs py-2.5 rounded-xl font-bold flex items-center justify-center gap-1 shadow-xs transition-all">
                編輯項目
              </button>
              <button onclick="triggerDeletePost()" class="bg-red-50 hover:bg-red-100 text-red-600 text-xs py-2.5 rounded-xl font-bold flex items-center justify-center gap-1 transition-all">
                刪除項目
              </button>
            </div>
          </div>
        `;
      } else {
        actionContainer.innerHTML = `
          <div class="bg-zinc-50 border border-zinc-200 p-3.5 rounded-xl flex items-center justify-between">
            <div class="flex items-center gap-2">
              <img src="${item.userAvatar || 'https://api.dicebear.com/10.x/glyphs/svg?seed=fan'}" alt="發文者頭像" class="w-8 h-8 rounded-full border border-zinc-200 bg-white object-cover">
              <div class="text-left">
                <p class="text-[9px] text-zinc-400">發布用戶</p>
                <p class="text-xs font-bold text-zinc-700">${item.authorName || "現場粉絲"}</p>
              </div>
            </div>
            <a href="${item.contactInfo.startsWith('http') ? item.contactInfo : 'https://' + item.contactInfo}" 
              target="_blank"
              rel="noopener noreferrer"
              class="bg-brand text-white hover:bg-zinc-800 text-xs px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-sm">
              <span>查看帳號</span>
            </a>
          </div>
        `;
      }

      document.getElementById("modal-post-detail").classList.remove("hidden");
    }

window.switchTab =switchTab;
window.navigateBack =navigateBack;
window.showToast=showToast;
window.getDaysRemaining=getDaysRemaining;
window.isUserAdmin =isUserAdmin;
window.resetAdminState =resetAdminState;

window.openPostDetailModal = openPostDetailModal;
