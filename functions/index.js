const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase-admin/app");

initializeApp();
const db = getFirestore();

exports.autoApproveConcert = onDocumentUpdated(
  "artifacts/{appId}/public/data/concerts/{concertId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    // 只在「還在審核中」且「票數剛好跨過門檻」時觸發，避免重複執行
    if (
      before.isPending === true &&
      after.isPending === true &&
      after.verifiedCount >= 20
    ) {
      await event.data.after.ref.update({
        isPending: false,
        approvedAt: new Date().toISOString(),
        approvedBy: "system-auto-approve" // 標記為自動審核，跟人工審核區分
      });
      console.log(`Concert ${event.params.concertId} 自動上架成功`);
    }
  }
);