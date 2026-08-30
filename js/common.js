export let hasAdminClaim = false;
export let isAdminClaimResolved = false;
import { db,auth,storage,appId} from "./firebase-config.js";
    export async function isUserAdmin() {
      const currentUser = auth.currentUser;
      if (!currentUser) return false;
      // 執行管理操作前強制刷新 Token，避免只信任畫面上的快取狀態。
      const idTokenResult = await currentUser.getIdTokenResult(true);
      hasAdminClaim = !!idTokenResult.claims.admin;
      isAdminClaimResolved = true;
      return hasAdminClaim;
    }

    async function adminApproveConcert() {
      if (!state.selectedConcert) return;

      if (!(await isUserAdmin())) {
        showToast("您沒有管理員權限^^");
        return;
      }

      const approveBtn = document.getElementById('admin-approve-btn');
      approveBtn.disabled = true;
      approveBtn.innerText = "處理中...";

      try {
        const concertDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'concerts', state.selectedConcert.id);
        // 將 isPending 設為 false，正式上架
        await updateDoc(concertDocRef, {
          isPending: false,
          approvedBy: state.currentUser.id,
          approvedAt: new Date().toISOString()
        });

        // 隱藏審核區塊
        document.getElementById('detail-concert-pending-box').classList.add('hidden');
        showToast("已成功以管理員權限將此場次審核通過並正式上架！");

        // 重新載入或更新畫面
        if (typeof fetchConcerts === 'function') fetchConcerts();
      } catch (error) {
        console.error("Admin approve error:", error);
        showToast("審核失敗，請稍後再試");
      } finally {
        approveBtn.disabled = false;
        approveBtn.innerText = "直接通過";
      }
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
window.switchTab =switchTab;
window.navigateBack =navigateBack;
window.showToast=showToast;
window.getDaysRemaining=getDaysRemaining;
window.isUserAdmin =isUserAdmin;
window.adminApproveConcert = adminApproveConcert;
