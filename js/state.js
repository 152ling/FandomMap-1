export const state = {
  // 資料狀態
  concerts: [],
  supportEvents: [],
  exchangePosts: [],
  bookmarkedPostIds:JSON.parse(localStorage.getItem('fe_v1_bookmarkedPostIds'))|| [],
  bookmarkData: {},
  bookmarkExpandedConcerts: {},
  userAttendedConcerts: [],
  pendingRemoveBookmarkId: null,

  // 頁面 / 篩選狀態
  activeTab: "explore",
  selectedConcert: null,
  selectedDate: "",
  selectedSubCategory: "support",
  searchQuery: "",
  profileActiveTab : "all",
  themeColor: localStorage.getItem('fe_v11_theme') || '#18181b',

  // 模態框與照片上傳狀態
  activeDetailItem: null,
  isPublishPreview: false,
  isConfirmingPublish: false,
  publishSucceeded: false,
  isRestoringPublishDraft: false,
  publishPostType: "free-support",

  // 編輯 / 刪除狀態
  isEditingMode: false,
  editingItemId: null,
  deleteTarget: null,
  isDeletingPost: false,

  // 演唱會圖片
  currentAddConcertImageBase64: "",
  currentEditConcertImageBase64: "",

  // 應援物圖片
  // 保留第一張，供既有卡片與詳情畫面使用
  currentUploadedImageBase64: "",
  // 最多五張 Canvas 壓縮後的圖片
  currentUploadedImagesBase64: [],

  // 當前使用者狀態與自訂頭像設定
  currentUser:JSON.parse(localStorage.getItem("fe_v1_user")) || {
    id: "user_me",
    username: "匿名用戶",
    avatar: "https://api.dicebear.com/10.x/glyphs/svg",
    contact: "",
    isAnonymous: true,
    email:""
  }
};
window.state=state;