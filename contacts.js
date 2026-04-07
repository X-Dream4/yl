window.useContactsLogic = function(state) {
    const { ref, reactive, computed, watch, nextTick } = Vue;

    const contactsTab = ref('chars');
    const modals = reactive({
        char: false,
        world: false,
        wb: false,
        wbCat: false,
        relSelect: false,
        relEdit: false
    });

    const charForm = reactive({
        isMe: false,
        worldId: '',
        name: '',
        avatar: '',
        persona: ''
    });

    const wbForm = reactive({
        categoryId: '',
        keywords: '',
        content: ''
    });

    const activeChar = ref(null);

    const pwdVisibility = reactive({
        chat: false,
        lockNum: false,
        lockPat: false,
        lockQAQ: false,
        lockQAA: false
    });

    const canvasRef = ref(null);
    const selectedNodeId = ref(null);
    const relEditForm = reactive({
        relId: '',
        sourceView: '',
        targetView: '',
        otherName: ''
    });

    const contactsDb = computed(() => state.contactsData);

    const worlds = computed(() => contactsDb.value.worlds || []);
    const wbCategories = computed(() => contactsDb.value.wbCategories || []);

    const refreshIcons = () => {
        nextTick(() => {
            if (window.lucide) window.lucide.createIcons();
        });
    };

    watch(
        [contactsTab, activeChar, () => modals.char, () => modals.wb, () => modals.relEdit],
        refreshIcons
    );

    const groupedChars = computed(() => {
        if (!worlds.value.length) return [];
        const allChars = [
            ...(contactsDb.value.myPersonas || []),
            ...(contactsDb.value.characters || [])
        ];
        return worlds.value.map(w => ({
            world: w,
            chars: allChars.filter(c => c.worldId === w.id)
        }));
    });

    const groupedWbs = computed(() => {
        if (!wbCategories.value.length) return [];
        return wbCategories.value.map(c => ({
            category: c,
            wbs: (contactsDb.value.worldbooks || []).filter(w => w.categoryId === c.id)
        }));
    });

    const openAddWorld = () => {
        const name = prompt('请输入世界分类名称：');
        if (name && name.trim()) {
            if (!contactsDb.value.worlds) contactsDb.value.worlds = [];
            contactsDb.value.worlds.push({
                id: 'w_' + Date.now(),
                name: name.trim()
            });
        }
    };

    const openAddWbCat = () => {
        const name = prompt('请输入世界书分类名称：');
        if (name && name.trim()) {
            if (!contactsDb.value.wbCategories) contactsDb.value.wbCategories = [];
            contactsDb.value.wbCategories.push({
                id: 'c_' + Date.now(),
                name: name.trim()
            });
        }
    };

    const openAddChar = (isMe = false) => {
        if (!worlds.value.length) {
            alert('请先新建一个世界分类！');
            return;
        }

        charForm.isMe = isMe;
        charForm.worldId = worlds.value[0]?.id || '';
        charForm.name = '';
        charForm.avatar = '';
        charForm.persona = '';
        modals.char = true;
    };

    const triggerAvatarUpload = (targetObj) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                targetObj.avatar = ev.target.result;
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    const saveChar = () => {
        if (!charForm.worldId) return alert('请选择所属的世界分类');
        if (!charForm.name.trim()) return alert('请输入姓名');

        const newChar = {
            id: 'char_' + Date.now(),
            isMe: charForm.isMe,
            worldId: charForm.worldId,
            name: charForm.name.trim(),
            avatar: charForm.avatar,
            persona: charForm.persona.trim(),
            phone: '',
            email: '',
            chatAcc: '',
            chatPwd: '',
            lockPwdNum: '',
            lockPwdPat: '',
            lockPwdQA_Q: '',
            lockPwdQA_A: ''
        };

        if (charForm.isMe) {
            if (!contactsDb.value.myPersonas) contactsDb.value.myPersonas = [];
            contactsDb.value.myPersonas.unshift(newChar);
        } else {
            if (!contactsDb.value.characters) contactsDb.value.characters = [];
            contactsDb.value.characters.unshift(newChar);
        }

        modals.char = false;
    };

    const openAddWb = () => {
        if (!wbCategories.value.length) {
            alert('请先新建世界书分类！');
            return;
        }

        wbForm.categoryId = wbCategories.value[0]?.id || '';
        wbForm.keywords = '';
        wbForm.content = '';
        modals.wb = true;
    };

    const saveWb = () => {
        if (!wbForm.categoryId) return alert('请选择分类');
        if (!wbForm.content.trim()) return alert('内容不能为空');

        if (!contactsDb.value.worldbooks) contactsDb.value.worldbooks = [];
        contactsDb.value.worldbooks.unshift({
            id: 'wb_' + Date.now(),
            categoryId: wbForm.categoryId,
            keywords: wbForm.keywords.trim(),
            content: wbForm.content.trim()
        });

        modals.wb = false;
    };

    const ensureCharFields = (char) => {
        if (char.phone === undefined) char.phone = '';
        if (char.email === undefined) char.email = '';
        if (char.chatAcc === undefined) char.chatAcc = '';
        if (char.chatPwd === undefined) char.chatPwd = '';
        if (char.lockPwdNum === undefined) char.lockPwdNum = '';
        if (char.lockPwdPat === undefined) char.lockPwdPat = '';
        if (char.lockPwdQA_Q === undefined) char.lockPwdQA_Q = '';
        if (char.lockPwdQA_A === undefined) char.lockPwdQA_A = '';
    };

    const openCharDetail = (char) => {
        ensureCharFields(char);

        activeChar.value = char;

        pwdVisibility.chat = false;
        pwdVisibility.lockNum = false;
        pwdVisibility.lockPat = false;
        pwdVisibility.lockQAQ = false;
        pwdVisibility.lockQAA = false;

        if (!contactsDb.value.layouts) contactsDb.value.layouts = {};
        if (!contactsDb.value.layouts[char.id]) contactsDb.value.layouts[char.id] = {};
        if (!contactsDb.value.layouts[char.id][char.id]) {
            contactsDb.value.layouts[char.id][char.id] = { x: 150, y: 130 };
        }

        refreshIcons();
    };

    const hashString = (str) => {
        let hash = 0;
        const s = String(str || '');
        for (let i = 0; i < s.length; i++) {
            hash = ((hash << 5) - hash) + s.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    };

    const getAsciiRoleKey = (char) => {
        const raw = `${char?.name || ''}${char?.persona || ''}`;
        const ascii = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (ascii) return ascii.slice(0, 12);
        return 'role' + String(hashString(raw)).slice(0, 6);
    };

    const buildAlphaNum = (seed, len = 8) => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let out = '';
        let n = hashString(seed);

        for (let i = 0; i < len; i++) {
            n = (n * 1664525 + 1013904223) >>> 0;
            out += chars[n % chars.length];
        }

        return out;
    };

    const buildDigits = (seed, len = 6) => {
        let out = '';
        let n = hashString(seed);

        for (let i = 0; i < len; i++) {
            n = (n * 1103515245 + 12345) >>> 0;
            out += String(n % 10);
        }

        return out;
    };

    const getRoleThemeWord = (char) => {
        const text = `${char?.name || ''} ${char?.persona || ''}`.toLowerCase();

        const themeMap = [
            { keys: ['hack', '黑客', '程序', 'code', 'cyber', 'network'], word: 'cipher' },
            { keys: ['doctor', '医生', 'medical', 'nurse', '治愈'], word: 'vital' },
            { keys: ['police', '警察', 'law', 'justice', '侦探'], word: 'guard' },
            { keys: ['killer', 'assassin', '杀手', 'blade', 'blood'], word: 'shade' },
            { keys: ['idol', 'singer', '明星', 'music', 'song'], word: 'stage' },
            { keys: ['student', '学院', 'school', 'study', '学园'], word: 'lesson' },
            { keys: ['mage', 'magic', 'wizard', '法师', '魔法'], word: 'arcane' },
            { keys: ['king', 'queen', 'royal', '王', '皇'], word: 'crown' },
            { keys: ['cat', '猫', 'soft', 'cute', '甜', '可爱'], word: 'mimi' },
            { keys: ['cold', '冰', 'silent', '冷', 'moon'], word: 'frost' },
            { keys: ['fire', '炎', '热', 'sun', 'flare'], word: 'blaze' },
            { keys: ['sea', 'ocean', '水', '鱼', 'wave'], word: 'tidal' }
        ];

        for (const item of themeMap) {
            if (item.keys.some(k => text.includes(String(k).toLowerCase()))) {
                return item.word;
            }
        }

        return 'core';
    };

    const buildDrawablePattern = (seed, len = 5) => {
        const neighbors = {
            0: [1, 3, 4],
            1: [0, 2, 3, 4, 5],
            2: [1, 4, 5],
            3: [0, 1, 4, 6, 7],
            4: [0, 1, 2, 3, 5, 6, 7, 8],
            5: [1, 2, 4, 7, 8],
            6: [3, 4, 7],
            7: [3, 4, 5, 6, 8],
            8: [4, 5, 7]
        };

        const targetLen = Math.max(4, Math.min(len, 8));
        let n = hashString(seed);
        const used = new Set();

        let current = n % 9;
        const path = [current];
        used.add(current);

        while (path.length < targetLen) {
            const options = neighbors[current].filter(x => !used.has(x));
            let next;

            if (options.length > 0) {
                n = (n * 214013 + 2531011) >>> 0;
                next = options[n % options.length];
            } else {
                const remain = [0,1,2,3,4,5,6,7,8].filter(x => !used.has(x));
                if (!remain.length) break;
                n = (n * 214013 + 2531011) >>> 0;
                next = remain[n % remain.length];
            }

            path.push(next);
            used.add(next);
            current = next;
        }

        return path.join('');
    };

    const buildRoleQuestion = (char) => {
        const roleKey = getAsciiRoleKey(char);
        const theme = getRoleThemeWord(char);
        const candidates = [
            'codename',
            'origin',
            'mission',
            'memory',
            'signal',
            'secret',
            'desire',
            'shadow',
            'core',
            'mark'
        ];
        const idx = hashString(roleKey + theme) % candidates.length;
        return candidates[idx] + theme;
    };

    const buildRoleAnswer = (char) => {
        const roleKey = getAsciiRoleKey(char);
        const theme = getRoleThemeWord(char);
        const tail = buildAlphaNum(roleKey + theme + '_qa', 4);
        return (theme + roleKey.slice(0, 4) + tail).slice(0, 12);
    };
    const getOtherChars = (currentChar) => {
        return [
            ...(contactsDb.value.myPersonas || []),
            ...(contactsDb.value.characters || [])
        ].filter(item => item.id !== currentChar.id);
    };

    const isDrawablePattern = (pattern) => {
        const neighbors = {
            0: [1, 3, 4],
            1: [0, 2, 3, 4, 5],
            2: [1, 4, 5],
            3: [0, 1, 4, 6, 7],
            4: [0, 1, 2, 3, 5, 6, 7, 8],
            5: [1, 2, 4, 7, 8],
            6: [3, 4, 7],
            7: [3, 4, 5, 6, 8],
            8: [4, 5, 7]
        };

        if (!pattern || pattern.length < 4) return false;
        const arr = String(pattern).split('').map(Number);
        if (arr.some(n => Number.isNaN(n) || n < 0 || n > 8)) return false;
        if (new Set(arr).size !== arr.length) return false;

        for (let i = 1; i < arr.length; i++) {
            if (!neighbors[arr[i - 1]].includes(arr[i])) return false;
        }
        return true;
    };

    const sanitizeAlphaNum = (str) => {
        return String(str || '').replace(/[^a-zA-Z0-9]/g, '');
    };

    const sanitizeDigits = (str) => {
        return String(str || '').replace(/\D/g, '');
    };

    const sanitizeEmail = (str) => {
        let s = String(str || '').trim();
        s = s.replace(/\s+/g, '');
        if (!s) return '';
        const atIndex = s.indexOf('@');
        let local = atIndex >= 0 ? s.slice(0, atIndex) : s;
        local = local.replace(/[^a-zA-Z0-9._+-]/g, '');
        if (!local) local = 'user' + buildAlphaNum(s, 4);
        return `${local.slice(0, 20)}@youl.com`;
    };

    const ensureUniqueByField = (baseValue, field, currentChar, builder, maxTry = 50) => {
        const others = getOtherChars(currentChar);
        let value = String(baseValue || '');

        for (let i = 0; i < maxTry; i++) {
            const exists = others.some(item => String(item[field] || '') === value);
            if (!exists) return value;
            value = builder(i + 1);
        }
        return value;
    };

    const normalizeGeneratedFields = (char, rawData) => {
        const roleKey = getAsciiRoleKey(char);
        const theme = getRoleThemeWord(char);
        const salt = `${char.id}_${char.name}_${char.persona}_${theme}`;

        let phone = sanitizeDigits(rawData.phone).slice(0, 7);
        if (phone.length < 7) phone = buildDigits(salt + '_phone_fix', 7);
        phone = ensureUniqueByField(
            phone,
            'phone',
            char,
            (i) => buildDigits(salt + '_phone_' + i, 7)
        );

        let email = sanitizeEmail(rawData.email);
        if (!email) {
            email = `${(theme + roleKey + buildAlphaNum(salt + '_mail_fix', 3)).slice(0, 16)}@youl.com`;
        }
        email = ensureUniqueByField(
            email,
            'email',
            char,
            (i) => `${(theme + roleKey + buildAlphaNum(salt + '_mail_' + i, 3)).slice(0, 16)}@youl.com`
        );

        let chatAcc = sanitizeAlphaNum(rawData.chatAcc).slice(0, 18);
        if (chatAcc.length < 8) {
            chatAcc = (theme + roleKey + buildAlphaNum(salt + '_acc_fix', 4)).slice(0, 18);
        }
        chatAcc = ensureUniqueByField(
            chatAcc,
            'chatAcc',
            char,
            (i) => (theme + roleKey + buildAlphaNum(salt + '_acc_' + i, 4)).slice(0, 18)
        );

        let chatPwd = sanitizeAlphaNum(rawData.chatPwd).slice(0, 12);
        if (chatPwd.length < 8) {
            chatPwd = (theme + buildAlphaNum(salt + '_pwd_fix', 6)).slice(0, 8);
        }
        chatPwd = ensureUniqueByField(
            chatPwd,
            'chatPwd',
            char,
            (i) => (theme + buildAlphaNum(salt + '_pwd_' + i, 6)).slice(0, 8)
        );

        let lockPwdNum = sanitizeDigits(rawData.lockPwdNum);
        if (lockPwdNum.length !== 4 && lockPwdNum.length !== 6) {
            lockPwdNum = buildDigits(salt + '_lock_num_fix', 6);
        }
        lockPwdNum = ensureUniqueByField(
            lockPwdNum,
            'lockPwdNum',
            char,
            (i) => buildDigits(salt + '_lock_num_' + i, 6)
        );

        let lockPwdPat = sanitizeDigits(rawData.lockPwdPat).split('').filter((v, i, arr) => v >= '0' && v <= '8' && arr.indexOf(v) === i).join('');
        if (!isDrawablePattern(lockPwdPat)) {
            lockPwdPat = buildDrawablePattern(salt + '_lock_pat_fix', 5);
        }
        lockPwdPat = ensureUniqueByField(
            lockPwdPat,
            'lockPwdPat',
            char,
            (i) => buildDrawablePattern(salt + '_lock_pat_' + i, 5)
        );

        let lockPwdQA_Q = String(rawData.lockPwdQA_Q || '').trim();
        if (!lockPwdQA_Q) lockPwdQA_Q = buildRoleQuestion(char);

        let lockPwdQA_A = String(rawData.lockPwdQA_A || '').trim();
        if (!lockPwdQA_A) lockPwdQA_A = buildRoleAnswer(char);
        lockPwdQA_A = ensureUniqueByField(
            lockPwdQA_A,
            'lockPwdQA_A',
            char,
            (i) => buildRoleAnswer({
                ...char,
                persona: `${char.persona || ''}_${i}`
            })
        );

        return {
            phone,
            email,
            chatAcc,
            chatPwd,
            lockPwdNum,
            lockPwdPat,
            lockPwdQA_Q,
            lockPwdQA_A
        };
    };

    const fallbackLocalGenerate = (c) => {
        const roleKey = getAsciiRoleKey(c);
        const theme = getRoleThemeWord(c);
        const salt = `${c.id}_${c.name}_${c.persona}_${theme}`;

        const rawData = {
            phone: buildDigits(salt + '_phone', 7),
            email: `${(theme + roleKey + buildAlphaNum(salt + '_mail', 3)).slice(0, 16)}@youl.com`,
            chatAcc: (theme + roleKey + buildAlphaNum(salt + '_acc', 4)).slice(0, 18),
            chatPwd: (theme + buildAlphaNum(salt + '_pwd', 6)).slice(0, 8),
            lockPwdNum: buildDigits(salt + '_lock_num', 6),
            lockPwdPat: buildDrawablePattern(salt + '_lock_pat', 5),
            lockPwdQA_Q: buildRoleQuestion(c),
            lockPwdQA_A: buildRoleAnswer(c)
        };

        const fixed = normalizeGeneratedFields(c, rawData);

        c.phone = fixed.phone;
        c.email = fixed.email;
        c.chatAcc = fixed.chatAcc;
        c.chatPwd = fixed.chatPwd;
        c.lockPwdNum = fixed.lockPwdNum;
        c.lockPwdPat = fixed.lockPwdPat;
        c.lockPwdQA_Q = fixed.lockPwdQA_Q;
        c.lockPwdQA_A = fixed.lockPwdQA_A;
    };

    const callApiToGenerate = async () => {
        if (!activeChar.value || activeChar.value.isMe) return;

        const c = activeChar.value;
        const apiConf = state.apiConfig || {};

        if (!apiConf.baseUrl || !apiConf.apiKey || !apiConf.activeModel) {
            alert('系统提示：你还没有在设置里填写完整 API 信息，已自动改用本地生成。');
            fallbackLocalGenerate(c);
            return;
        }

        const systemPrompt = [
            `你是角色 ${c.name || '未知角色'} 你要设置自己的账号密码。`,
            '你需要根据你自己的名字和你自己的人物设定，生成与角色(你自己）强关联的账号、密码和锁屏信息。',
            '除 email、lockPwdQA_Q、lockPwdQA_A 外，其余账号密码字段只能使用英文字母和数字，绝对不能出现中文、空格。',
            'email 可以使用英文、数字、符号，并且必须以 @youl.com 结尾。',
            'lockPwdQA_Q、lockPwdQA_A 可以按照人设使用中文或其他语言，并且必须符合人设。',
            'chatAcc、chatPwd、lockPwdNum、lockPwdQA_Q、lockPwdQA_A 必须明显和角色设定有关。',
            'lockPwdPat 必须是能实际画出的图案密码，输出为 4 到 9 个由 0 到 8 组成且不重复的数字串，并尽量保证路径连续可画。',
            'lockPwdQA_Q 是问题，lockPwdQA_A 是答案，它们都要和角色有关，是只有角色自己知道的文字答案。',
            '必须严格返回 JSON，不要返回解释，不要返回 markdown。',
            '返回格式如下：',
            '{',
            '  "phone": "7位纯数字",',
            '  "email": "或英文或数字或符号@youl.com",',
            '  "chatAcc": "8到18位英文数字，和角色有关",',
            '  "chatPwd": "8位英文数字，和角色有关",',
            '  "lockPwdNum": "4或6位纯数字，可以和角色有关",',
            '  "lockPwdPat": "4到9个由0到8组成且不重复、尽量连续可画的数字串",',
            '  "lockPwdQA_Q": "问题，和角色有关，按照人设使用中文或其他语言",',
            '  "lockPwdQA_A": "答案，和角色有关，按照人设使用中文或其他语言"',
            '}'
        ].join('\n');

        const userPrompt = [
            `角色名：${c.name || ''}`,
            `角色设定：${c.persona || ''}`,
            '请让生成结果明显和角色特征有关。'
        ].join('\n');

        alert(`正在调用模型 [${apiConf.activeModel}] 为【${c.name || '该人物'}】生成账号密码...`);

        try {
            let url = String(apiConf.baseUrl || '').trim();
            if (url.endsWith('/')) url = url.slice(0, -1);
            if (!url.endsWith('/v1') && !url.includes('/v1/')) url += '/v1';

            const response = await fetch(url + '/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiConf.apiKey}`
                },
                body: JSON.stringify({
                    model: apiConf.activeModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`API 请求失败，状态码: ${response.status}`);
            }

            const resData = await response.json();
            let content = resData?.choices?.[0]?.message?.content || '';

            content = String(content)
                .replace(/^```json/i, '')
                .replace(/^```/i, '')
                .replace(/```$/i, '')
                .trim();

            const aiData = JSON.parse(content);

            const fixed = normalizeGeneratedFields(c, aiData);

            c.phone = fixed.phone;
            c.email = fixed.email;
            c.chatAcc = fixed.chatAcc;
            c.chatPwd = fixed.chatPwd;
            c.lockPwdNum = fixed.lockPwdNum;
            c.lockPwdPat = fixed.lockPwdPat;
            c.lockPwdQA_Q = fixed.lockPwdQA_Q;
            c.lockPwdQA_A = fixed.lockPwdQA_A;

            alert('✅ API 生成成功，已自动填入。');
        } catch (error) {
            console.error('API 生成失败：', error);
            alert(`API 调用失败，已自动改用本地生成。\n${error.message}`);
            fallbackLocalGenerate(c);
        }
    };

    const deleteActiveChar = () => {
        if (!activeChar.value) return;

        if (!confirm(`确定要彻底删除 [${activeChar.value.name}] 吗？\n所有相关关系网也会被清除。`)) return;

        const id = activeChar.value.id;

        if (activeChar.value.isMe) {
            contactsDb.value.myPersonas = (contactsDb.value.myPersonas || []).filter(c => c.id !== id);
        } else {
            contactsDb.value.characters = (contactsDb.value.characters || []).filter(c => c.id !== id);
        }

        if (contactsDb.value.relationships) {
            contactsDb.value.relationships = contactsDb.value.relationships.filter(
                r => r.sourceId !== id && r.targetId !== id
            );
        }

        activeChar.value = null;
    };

    const canvasNodes = computed(() => {
        if (!activeChar.value) return [];

        const layout = contactsDb.value.layouts?.[activeChar.value.id] || {};
        const nodes = [{
            id: activeChar.value.id,
            name: activeChar.value.name,
            avatar: activeChar.value.avatar,
            x: layout[activeChar.value.id]?.x || 150,
            y: layout[activeChar.value.id]?.y || 130
        }];

        (contactsDb.value.relationships || []).forEach(r => {
            if (r.sourceId === activeChar.value.id || r.targetId === activeChar.value.id) {
                const otherId = r.sourceId === activeChar.value.id ? r.targetId : r.sourceId;

                if (!nodes.find(n => n.id === otherId)) {
                    const c = [
                        ...(contactsDb.value.characters || []),
                        ...(contactsDb.value.myPersonas || [])
                    ].find(item => item.id === otherId);

                    if (c) {
                        nodes.push({
                            id: c.id,
                            name: c.name,
                            avatar: c.avatar,
                            x: layout[c.id]?.x || 50 + Math.random() * 200,
                            y: layout[c.id]?.y || 50 + Math.random() * 150
                        });
                    }
                }
            }
        });

        return nodes;
    });

    const canvasEdges = computed(() => {
        if (!activeChar.value) return [];

        const nodes = canvasNodes.value;
        const edges = [];

        (contactsDb.value.relationships || []).forEach(r => {
            const n1 = nodes.find(n => n.id === r.sourceId);
            const n2 = nodes.find(n => n.id === r.targetId);

            if (n1 && n2) {
                edges.push({
                    ...r,
                    x1: n1.x,
                    y1: n1.y - 10,
                    x2: n2.x,
                    y2: n2.y - 10
                });
            }
        });

        return edges;
    });

    const availableRelChars = computed(() => {
        if (!activeChar.value) return [];

        const connectedIds = canvasEdges.value.map(e =>
            e.sourceId === activeChar.value.id ? e.targetId : e.sourceId
        );
        connectedIds.push(activeChar.value.id);

        const pool = [
            ...(contactsDb.value.myPersonas || []),
            ...((contactsDb.value.characters || []).filter(c => c.worldId === activeChar.value.worldId))
        ];

        return pool.filter(c => !connectedIds.includes(c.id));
    });

    const confirmAddRel = (targetId) => {
        if (!contactsDb.value.relationships) contactsDb.value.relationships = [];

        contactsDb.value.relationships.push({
            id: 'rel_' + Date.now(),
            sourceId: activeChar.value.id,
            targetId,
            sourceView: '认识',
            targetView: '认识'
        });

        modals.relSelect = false;
    };

    const handleNodeClick = (nodeId) => {
        if (selectedNodeId.value === null) {
            selectedNodeId.value = nodeId;
            return;
        }

        if (selectedNodeId.value !== nodeId) {
            if (!contactsDb.value.relationships) contactsDb.value.relationships = [];

            const exists = contactsDb.value.relationships.find(r =>
                (r.sourceId === selectedNodeId.value && r.targetId === nodeId) ||
                (r.sourceId === nodeId && r.targetId === selectedNodeId.value)
            );

            if (!exists) {
                contactsDb.value.relationships.push({
                    id: 'rel_' + Date.now(),
                    sourceId: selectedNodeId.value,
                    targetId: nodeId,
                    sourceView: '认识',
                    targetView: '认识'
                });
            }
        }

        selectedNodeId.value = null;
    };

    const openRelEdit = (edge) => {
        relEditForm.relId = edge.id;

        const isSourceMe = edge.sourceId === activeChar.value.id;
        relEditForm.sourceView = isSourceMe ? edge.sourceView : edge.targetView;
        relEditForm.targetView = isSourceMe ? edge.targetView : edge.sourceView;

        const otherId = isSourceMe ? edge.targetId : edge.sourceId;
        const otherChar = [
            ...(contactsDb.value.characters || []),
            ...(contactsDb.value.myPersonas || [])
        ].find(c => c.id === otherId);

        relEditForm.otherName = otherChar?.name || '对方';
        modals.relEdit = true;
    };

    const saveRelEdit = () => {
        const edge = (contactsDb.value.relationships || []).find(r => r.id === relEditForm.relId);

        if (edge) {
            const isSourceMe = edge.sourceId === activeChar.value.id;

            if (isSourceMe) {
                edge.sourceView = relEditForm.sourceView;
                edge.targetView = relEditForm.targetView;
            } else {
                edge.targetView = relEditForm.sourceView;
                edge.sourceView = relEditForm.targetView;
            }
        }

        modals.relEdit = false;
    };

    let draggingNodeId = null;

    const startDrag = (e, nodeId) => {
        draggingNodeId = nodeId;
    };

    const onCanvasMove = (e) => {
        if (!draggingNodeId || !activeChar.value || !canvasRef.value) return;

        const rect = canvasRef.value.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        let x = clientX - rect.left;
        let y = clientY - rect.top;

        x = Math.max(30, Math.min(x, rect.width - 30));
        y = Math.max(30, Math.min(y, rect.height - 30));

        if (!contactsDb.value.layouts) contactsDb.value.layouts = {};
        if (!contactsDb.value.layouts[activeChar.value.id]) {
            contactsDb.value.layouts[activeChar.value.id] = {};
        }

        contactsDb.value.layouts[activeChar.value.id][draggingNodeId] = { x, y };
    };

    const endDrag = () => {
        draggingNodeId = null;
    };

    return {
        contactsTab,
        modals,
        charForm,
        wbForm,
        worlds,
        wbCategories,
        groupedChars,
        groupedWbs,
        contactsDb,
        openAddWorld,
        openAddWbCat,
        openAddChar,
        triggerAvatarUpload,
        saveChar,
        openAddWb,
        saveWb,
        activeChar,
        pwdVisibility,
        openCharDetail,
        callApiToGenerate,
        deleteActiveChar,
        canvasRef,
        canvasNodes,
        canvasEdges,
        availableRelChars,
        confirmAddRel,
        handleNodeClick,
        selectedNodeId,
        openRelEdit,
        relEditForm,
        saveRelEdit,
        startDrag,
        onCanvasMove,
        endDrag
    };
};
