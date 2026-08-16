export async function handleMultiImage(input) {
            if (!state.user) {
                showToast(t('toast_login_required')); //請先登入以開啟圖片上傳功能☁️
                input.value = "";
                return;
            }

            const files = Array.from(input.files);
            if (files.length === 0) return;

            const currentCount = state.tempImages.length + state.tempImageBase64.length;
            const remain = 3 - currentCount;
            if (remain <= 0) {
                showToast("已達上傳上限 (最多 3 張)");
                input.value = "";
                return;
            }

            const toProcess = files.slice(0, remain);
            showToast(t('toast_uploading')); //正在上傳圖片...

            for (const file of toProcess) {
                // 1. 類型檢查 (每一張圖片都會個別執行此檢查)
                let isImage = false;
                if (file.type) {
                    isImage = file.type.startsWith('image/');
                } else {
                    const ext = file.name.split('.').pop().toLowerCase();
                    isImage = ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext);
                }

                if (!isImage) {
                    showToast(t('toast_format_error')); //檔案格式錯誤
                    continue;
                }

                // 2. 大小檢查 (上限 15MB)
                if (file.size > 15 * 1024 * 1024) {
                    showToast(t('toast_img_too_large')); //圖片太大囉！請選擇較小的照片
                    continue;
                }

                try {
                    const b64 = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onerror = () => {
                            showToast(t('toast_img_error')); //圖片處理失敗，請換一張試試
                            reject(new Error("Read failed"));
                        };
                        reader.onload = async (e) => {
                            try {
                                // 3. 壓縮邏輯 (與單圖上傳一致)
                                const compressionWidth = file.size > 2 * 1024 * 1024 ? 500 : 800;
                                const compressedBase64 = await compressImage(e.target.result, compressionWidth);
                                resolve(compressedBase64);
                            } catch (err) {
                                reject(err);
                            }
                        };
                        reader.readAsDataURL(file);
                    });

                    if (b64) {
                        state.tempImageBase64.push(b64);
                        // 每處理完一張就更新一次預覽，增加反應速度
                        updateImagePreviewUI();
                    }
                } catch (error) {
                    console.error("Image processing error:", error);
                    showToast(t('toast_img_error')); //圖片處理失敗，請換一張試試
                }
            }
            
            showToast(t('toast_img_success')); //圖片上傳成功
            input.value = ""; // 清空 input 以便下次選擇
        }