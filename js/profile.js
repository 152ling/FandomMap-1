  import { state } from './state.js';
  export function openProfileModal() {
      // const state.currentUser = state.currentUser;
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
      const username = document.getElementById("profile-input-username").value.trim() || state.currentUser.username;
      const contact = document.getElementById("profile-input-contact").value.trim();

      showToast("保存中...");
      try {
        const profileDocRef = doc(db, 'artifacts', appId, 'users', state.currentUser.id, 'profile', 'data');
        const updateData = { username, contact, avatar: state.currentUser.avatar };
        await updateDoc(profileDocRef, updateData);

        state.currentUser.username = username;
        state.currentUser.contact = contact;

        document.getElementById("user-avatar-snapshot").src = state.currentUser.avatar;
        showToast("個人資料已儲存！");
        renderAll();
      } catch (error) {
        console.error("Save profile error:", error);
        showToast("保存失敗，請稍後再試");
      }
    }

window.openProfileModal=openProfileModal;
window.closeProfileModal=closeProfileModal;
window.copyUID=copyUID;
window.saveUserProfile = saveUserProfile;