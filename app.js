const { createApp, reactive, ref, onMounted, watch, computed } = Vue;
const defaultImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23dcdcdc'/%3E%3C/svg%3E";
const defaultAvatar1 = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23cccccc'/%3E%3C/svg%3E";
const defaultAvatar2 = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23bbbbbb'/%3E%3C/svg%3E";
const createDefaultNumberIcon = (num) => `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Ctext x='50' y='55' font-family='sans-serif' font-size='48' font-weight='bold' fill='%23808080' text-anchor='middle' dominant-baseline='middle'%3E${num}%3C/text%3E%3C/svg%3E`;
const defaultClockIcons = Array.from({length: 12}, (_, i) => createDefaultNumberIcon(i === 0 ? 12 : i));

createApp({
    setup() {
        const state = reactive({
            activeApp: null, beautifyTab: 'widget', theme: 'light', desktopWallpaper: '', capsuleBg: '', capsuleOpacity: 1,
            capsuleType: 'chat', chatTime: '10:00', chatLeftAvatar: defaultAvatar1, chatLeftText: '你好呀', chatRightAvatar: defaultAvatar2, chatRightText: '今天天气不错', chatInputText: '输入...', widgetImage1: "https://images.unsplash.com/photo-1600693437635-ceb8f04df160?w=400&q=80", 
            emojiWallItems: [], idCard: { photo: defaultImg, name: '张三', gender: '男', age: '24', address: '首尔市江南区星空路' },
            widgetSlot1: 'badge', widgetSlot2: 'clock', badgeImage: defaultImg, customImg1: defaultImg, customImg2: defaultImg,
            avatarCard1: { imgLeft: defaultAvatar1, textLeft: 'User A', imgRight: defaultAvatar2, textRight: 'User B', titleTop: 'Sweet Memory', titleBottom: 'Forever' },
            avatarCard2: { imgLeft: defaultAvatar1, textLeft: 'User C', imgRight: defaultAvatar2, textRight: 'User D', titleTop: 'Our Story', titleBottom: 'Together' },
            clockIcons: [...defaultClockIcons], clockBg: '', clockHandHr: '', clockHandMin: '', clockHandSec: '', clockCenterDot: '',
            topShowName: true, topHasShadow: false, appsTop: [{ id: 't1', name: 'Camera', icon: defaultImg }, { id: 't2', name: 'Photos', icon: defaultImg }, { id: 't3', name: 'Notes', icon: defaultImg }, { id: 't4', name: 'Music', icon: defaultImg }],
            bottomShowName: true, bottomHasShadow: false, appsBottom: [{ id: 'b1', name: 'Weather', icon: defaultImg }, { id: 'b2', name: 'App Store', icon: defaultImg }, { id: 'b3', name: 'Maps', icon: defaultImg }, { id: 'b4', name: 'Wallet', icon: defaultImg }],
            dockShowName: false, dockHasShadow: false, dockHidden: false, dockColor: '', dockOpacity: 0.5, dockBlur: 15,
            appsDock: [{ id: 'd1', name: '设置', icon: defaultImg }, { id: 'd2', name: '人脉', icon: defaultImg }, { id: 'd3', name: '美化', icon: defaultImg }],
            wallpapers: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80"],
            settingsTab: 'api', apiConfig: { baseUrl: '', apiKey: '', models: [], activeModel: '' }, storageUsed: 0, storageDetails: [], storageDonutStyle: { background: 'conic-gradient(#eee 0% 100%)' },
            contactsData: { worlds: [], characters: [], myPersonas: [], wbCategories: [], worldbooks: [], relationships: [], layouts: {} },
            
            // 全局锁屏配置
            lockConfig: { enableLockScreen: false, wallpaper: '', enablePassword: false, pwdType: 'num', pwdNum: '', pwdQA_Q: '', pwdQA_A: '', pwdPattern: '' },
            isLocked: false, showPwdInput: false, enteredPwd: ''
        });

        const isThemeModalOpen = ref(false); const isClockModalOpen = ref(false); const hrDeg = ref(0), minDeg = ref(0), secDeg = ref(0); const currentWpIndex = ref(0); const fileInput = ref(null); let currentUploadTarget = null, currentUploadData = null; const currentDate = ref(new Date());

        const loadData = async () => {
            const savedState = await localforage.getItem('ins_desktop_v8_state');
            if (savedState) Object.assign(state, savedState);
            
            // 【极其严密的数据防御机制，防止旧设备旧语法白屏】
            if(state.capsuleOpacity === undefined) state.capsuleOpacity = 1;
            if(state.apiConfig === undefined) state.apiConfig = { baseUrl: '', apiKey: '', models: [], activeModel: '' };
            if(state.contactsData === undefined) state.contactsData = {};
            if(state.contactsData.worlds === undefined) state.contactsData.worlds = [{ id: 'w_default', name: '主宇宙' }];
            if(state.contactsData.characters === undefined) state.contactsData.characters = [];
            if(state.contactsData.myPersonas === undefined) state.contactsData.myPersonas = [];
            if(state.contactsData.wbCategories === undefined) state.contactsData.wbCategories = [{ id: 'c_default', name: '通用设定' }];
            if(state.contactsData.worldbooks === undefined) state.contactsData.worldbooks = [];
            if(state.contactsData.relationships === undefined) state.contactsData.relationships = [];
            if(state.contactsData.layouts === undefined) state.contactsData.layouts = {};

            if(state.lockConfig === undefined) state.lockConfig = { enableLockScreen: false, wallpaper: '', enablePassword: false, pwdType: 'num', pwdNum: '', pwdQA_Q: '', pwdQA_A: '', pwdPattern: '' };
            if(state.lockConfig.pwdType === undefined) state.lockConfig.pwdType = 'num';

            if(state.lockConfig.enableLockScreen) { state.isLocked = true; state.showPwdInput = false; state.enteredPwd = ''; }

            setTimeout(() => { if(window.lucide) lucide.createIcons(); }, 100);
        };
        watch(state, (newState) => { localforage.setItem('ins_desktop_v8_state', JSON.parse(JSON.stringify(newState))); }, { deep: true });

        const updateClock = () => { const now = new Date(); currentDate.value = now; secDeg.value = now.getSeconds() * 6; minDeg.value = now.getMinutes() * 6 + now.getSeconds() * 0.1; hrDeg.value = (now.getHours() % 12) * 30 + now.getMinutes() * 0.5; requestAnimationFrame(updateClock); };
        const getClockNumberStyle = (index) => ({ left: `${50 + 38 * Math.cos((index * 30 - 90) * (Math.PI / 180))}%`, top: `${50 + 38 * Math.sin((index * 30 - 90) * (Math.PI / 180))}%` });
        const calendarGrid = computed(() => { const d = currentDate.value; const year = d.getFullYear(); const month = d.getMonth(); const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const grid = []; let week = []; for(let i=0; i<firstDay; i++) week.push(''); for(let i=1; i<=daysInMonth; i++) { week.push(i); if(week.length === 7) { grid.push(week); week = []; } } if(week.length > 0) { while(week.length < 7) week.push(''); grid.push(week); } return grid; });

        // 时间格式化用于锁屏
        const formatTime = (date) => { const h = String(date.getHours()).padStart(2, '0'); const m = String(date.getMinutes()).padStart(2, '0'); return `${h}:${m}`; };
        const formatDate = (date) => { const m = date.getMonth()+1; const d = date.getDate(); const days = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六']; return `${m}月${d}日 ${days[date.getDay()]}`; };

        // 锁屏上滑解锁逻辑
        const unlockState = reactive({ startY: 0, currentY: 0, isSwiping: false });
        const onLockTouchStart = (e) => { unlockState.startY = e.touches[0].clientY; unlockState.isSwiping = true; };
        const onLockTouchMove = (e) => { if(unlockState.isSwiping) unlockState.currentY = e.touches[0].clientY; };
        const onLockTouchEnd = (e) => { 
            unlockState.isSwiping = false; 
            if (unlockState.startY - e.changedTouches[0].clientY > 100) {
                if (state.lockConfig.enablePassword) { state.showPwdInput = true; state.enteredPwd = ''; } else { state.isLocked = false; }
            }
            unlockState.startY = 0; unlockState.currentY = 0;
        };

        const verifyLockPwd = () => {
            let correct = false;
            if (state.lockConfig.pwdType === 'num') correct = (state.enteredPwd === state.lockConfig.pwdNum);
            else if (state.lockConfig.pwdType === 'pattern') correct = (state.enteredPwd === state.lockConfig.pwdPattern);
            else if (state.lockConfig.pwdType === 'qa') correct = (state.enteredPwd === state.lockConfig.pwdQA_A);

            if (correct) { state.isLocked = false; state.showPwdInput = false; state.enteredPwd = ''; setTimeout(() => { if(window.lucide) lucide.createIcons(); }, 100); } 
            else { alert('密码错误！'); state.enteredPwd = ''; }
        };

        const addEmoji = () => { const txt = prompt('请输入表情或文字：'); if(txt) state.emojiWallItems.push({ id: Date.now(), text: txt, top: Math.random() * 65 + 10, left: Math.random() * 80 + 5, rot: (Math.random() - 0.5) * 60, size: Math.random() * 12 + 16 }); };
        const clearEmojis = () => { if(confirm('清空散落表情？')) state.emojiWallItems = []; };

        const triggerUpload = (target, data = null) => { currentUploadTarget = target; currentUploadData = data; fileInput.value.click(); };
        const handleFileChange = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => { const b64 = event.target.result; if (currentUploadTarget === 'appIcon') state[currentUploadData.group][currentUploadData.index].icon = b64; else if (currentUploadTarget === 'clockIcon') state.clockIcons[currentUploadData] = b64; else if (currentUploadTarget === 'wallpaper') { state.wallpapers.push(b64); currentWpIndex.value = state.wallpapers.length - 1; } else if (currentUploadTarget === 'lockConfig_wallpaper') { state.lockConfig.wallpaper = b64; } else if (currentUploadTarget.includes('_')) { const [obj, key] = currentUploadTarget.split('_'); state[obj][key] = b64; } else state[currentUploadTarget] = b64; e.target.value = ''; }; reader.readAsDataURL(file); };

        const setTheme = (theme) => { state.theme = theme; isThemeModalOpen.value = false; };
        const editCapsuleBgUrl = () => { const url = prompt('URL (留空清除)：', state.capsuleBg); if (url !== null) state.capsuleBg = url; };
        const editClockUrl = (index) => { const url = prompt('URL：', state.clockIcons[index]); if (url) state.clockIcons[index] = url; };
        const resetClock = () => { if(confirm('重置时钟？')) { state.clockBg=''; state.clockHandHr=''; state.clockHandMin=''; state.clockHandSec=''; state.clockCenterDot=''; state.clockIcons=[...defaultClockIcons]; } };

        const contactsMethods = window.useContactsLogic(state);
        const openApp = (app) => { 
            if (app.id === 'd3') { state.activeApp = 'beautify'; setTimeout(() => { if(window.lucide) lucide.createIcons(); }, 50); } 
            else if (app.id === 'd1') { state.activeApp = 'settings'; setTimeout(() => { if(window.lucide) lucide.createIcons(); settingsMethods.updateStorageInfo(); }, 50); }
            else if (app.id === 'd2') { state.activeApp = 'contacts'; contactsMethods.contactsTab.value = 'chars'; contactsMethods.activeChar.value = null; setTimeout(() => { if(window.lucide) lucide.createIcons(); }, 50); }
            else alert(`打开 [ ${app.name || '应用'} ] ...`); 
        };
        const closeApp = () => { state.activeApp = null; setTimeout(() => { if(window.lucide) lucide.createIcons(); }, 50); };
        const editApp = (app, hasName = true) => { if(state.activeApp) return; const url = prompt('URL：', app.icon); if (url) app.icon = url; if (hasName) { const name = prompt('名称：', app.name); if (name !== null) app.name = name; } };

        const beautifyMethods = window.useBeautifyLogic(state, { currentWpIndex, triggerUpload });
        const settingsMethods = window.useSettingsLogic(state);

        onMounted(() => { loadData(); requestAnimationFrame(updateClock); });

        return { state, isThemeModalOpen, isClockModalOpen, hrDeg, minDeg, secDeg, fileInput, currentWpIndex, currentDate, calendarGrid, getClockNumberStyle, setTheme, triggerUpload, handleFileChange, openApp, closeApp, editApp, editClockUrl, resetClock, editCapsuleBgUrl, addEmoji, clearEmojis, formatTime, formatDate, unlockState, onLockTouchStart, onLockTouchMove, onLockTouchEnd, verifyLockPwd, ...beautifyMethods, ...settingsMethods, ...contactsMethods };
    }
}).mount('#app');
