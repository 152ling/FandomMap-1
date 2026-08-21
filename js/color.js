import { state } from './state.js';
// --- 外觀設定 ---
export function renderAppearanceView() {
    const container = document.getElementById('color-container');
    if(!container) return;
    container.innerHTML = '';
            const presets = [
                {key: 'theme_black', name:'黑色', c:'#18181b'},
                {key: 'theme_pink', name:'粉色', c:'#F7CAC9'},
                {key: 'theme_purple', name:'幻紫', c:'#BB96FF'},
                {key: 'theme_blue', name:'沁藍', c:'#69C4E0'},
                {key: 'theme_green', name:'螢綠', c:'#B6ED00'},
                {key: 'theme_aurora', name:'極光', c:'#6C3591'},
                {key: 'theme_gold', name:'熠金', c:'#E2B216'}
            ];
            const currentHex = (state.themeColor && state.themeColor.startsWith('#')) ? state.themeColor : '';
            container.innerHTML = `
                    <div>
                        
                        <div class="bg-white rounded-3xl p-1 card-shadow text-slate-800">
                            <div class="flex mb-6 justify-between">
                                <h3 data-i18n="appear_preset" class="text-sm font-bold text-slate-500 tracking-wide">選擇預設主題</h3>
                                <div class="flex justify-center border-gray-100">
                                    <label class="inline-flex items-center cursor-pointer">
                                        <input type="checkbox" id="grad-dark-toggle" class="sr-only peer" onchange="toggleDarkMode(this.checked)" ${document.body.classList.contains('dark-mode') ? 'checked' : ''}>
                                        <div class="relative w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer 
                                                    peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full 
                                                    after:content-[''] after:absolute after:top-[2px] after:start-[2px] 
                                                    after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all 
                                                    peer-checked:bg-slate-700"></div>
                                        
                                        <span class="select-none text-sm font-bold text-slate-500" data-i18n="appear_dark">深色模式</span>
                                    </label>
                                </div>
                            </div>
                            <div class="grid grid-cols-4 gap-y-8 gap-x-4 place-items-center mb-10">
                                ${presets.map(p => `
                                    <div class="flex flex-col items-center gap-2">
                                        <div onclick="applyTheme('${p.c}');;switchTab('color')" 
                                            class="color-preset ${state.themeColor===p.c?'active':''}" 
                                            style="background:${p.g || p.c}"></div>
                                        <span class="text-[10px] font-bold text-slate-400 text-center" data-i18n="${p.key}">${p.name}</span>
                                    </div>
                                `).join('')}
                                <div class="flex flex-col items-center gap-2">
                                    <input type="color" onchange="applyTheme(this.value);switchTab('color')" 
                                        value="${state.themeColor==='svt'?'#92A8D1':state.themeColor==='bp'?'#FF85D0':state.themeColor}" 
                                        class="w-10 h-10 rounded-full border-none cursor-pointer bg-slate-200 shadow-sm">
                                    <span data-i18n="appear_eyedropper" class="text-[10px] font-bold text-slate-400 text-center">滴管選色</span>
                                </div>
                            </div>

                            <div class="mt-8 pt-6 border-t border-gray-100">
                                <h3 data-i18n="appear_custom_hex" class="text-xs font-black text-slate-400 mb-4 uppercase tracking-widest">輸入自訂色碼</h3>
                                <div class="flex gap-2">
                                    <input type="text" id="custom-hex-input" placeholder="#RRGGBB" 
                                        value="${currentHex}"
                                        class="flex-grow min-w-0 w-full bg-slate-50 border-2 border-transparent focus:border-brand rounded-2xl px-4 py-3 text-sm outline-none font-mono text-slate-700">
                                    <button data-i18n="btn_apply" onclick="applyHexColor()" 
                                            class="flex-shrink-0 bg-brand text-white font-bold px-6 py-3 rounded-2xl shadow-lg active:scale-95 transition-all">
                                        套用
                                    </button>
                                </div>
                                <p data-i18n="appear_hex_hint" class="text-[10px] text-slate-300 mt-2 ml-1">請輸入包含 # 的六位數色碼，例如 #92A8D1</p>
                            </div>
                        </div>
                        

                    </div>`;
            }
        export function toggleDarkMode(isDark) {
            // 套用目前的顏色，但傳入新的深淺設定
            applyTheme(state.themeColor, isDark);
            showToast(isDark ? t('toast_dark_on') : t('toast_dark_off'));
        }
        export function applyHexColor() {
            const hexInput = document.getElementById('custom-hex-input');
            const color = hexInput.value.trim();
            
            // 驗證格式是否為有效的 Hex 色碼 (例如 #FFFFFF 或 #FFF)
            const isHex = /^#([A-Fa-f0-9]{3}){1,2}$/.test(color);
            
            if (isHex) {
                applyTheme(color);
                showToast("顏色已更新"); //更新自訂主題色
            } else {
                showToast("格式錯誤"); //格式錯誤 
            }
        }

        //應用主題顏色
    export function applyTheme(color, isDarkMode = null) {
            state.themeColor = color;
            const root = document.documentElement;
            const body = document.body;

            // --- 深色模式判斷邏輯 ---
            let targetDark;
            
            if (isDarkMode !== null) {
                // 如果有從 saveGrad 傳進來 (true 或 false)，就用傳進來的
                targetDark = isDarkMode;
            } else {
                // 如果是點擊「粉藍」或其他預設顏色（只傳一個參數時），就讀取原本存的狀態
                targetDark = localStorage.getItem('fe_v11_darkMode') === 'true';
            }

            localStorage.setItem('fe_v11_darkMode', targetDark);
            if (targetDark) {
                body.classList.add('dark-mode');
            } else {
                body.classList.remove('dark-mode');
            }

            root.style.setProperty('--brand-color', color);
            
            localStorage.setItem('fe_v11_theme', color);
        }
window.renderAppearanceView=renderAppearanceView;
window.toggleDarkMode=toggleDarkMode;
window.applyHexColor=applyHexColor;
window.applyTheme=applyTheme;