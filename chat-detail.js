window.useChatDetailLogic = function(state, chatMethods) {
    const { reactive, computed, nextTick } = Vue;
    const { chatState, currentAccountData, myConversations } = chatMethods;

    chatState.isDetailOpen = false;
    chatState.activeConvId = null;
    chatState.detailInput = '';
    chatState.isTyping = false;
    chatState.typingText = '';
    chatState.showBottomMenu = false;
    
    chatState.isDetailSettingsOpen = false;
    chatState.detailSettingsTab = 'chat';

    let typingInterval = null;

    const toggleBottomMenu = () => {
        chatState.showBottomMenu = !chatState.showBottomMenu;
        if(chatState.showBottomMenu) setTimeout(scrollToBottom, 300);
    };

    const activeConv = computed(() => {
        if (!chatState.activeConvId) return null;
        return myConversations.value.find(c => c.id === chatState.activeConvId);
    });

    const activeMessages = computed(() => {
        if (!chatState.activeConvId || !currentAccountData.value) return [];
        const conv = currentAccountData.value.conversations.find(c => c.id === chatState.activeConvId);
        return conv ? (conv.messages || []) : [];
    });

    const activeTargetPersona = computed(() => {
        if(!chatState.activeConvId) return {};
        const rawConv = currentAccountData.value.conversations.find(c => c.id === chatState.activeConvId);
        if(!rawConv) return {};
        return state.contactsData.characters.find(c => c.id === rawConv.targetId) || state.contactsData.myPersonas.find(c => c.id === rawConv.targetId) || {};
    });

    const activeConvSettings = computed(() => {
        if (!chatState.activeConvId || !currentAccountData.value) return {};
        const conv = currentAccountData.value.conversations.find(c => c.id === chatState.activeConvId);
        if (!conv) return {};
        if (!conv.settings) {
            conv.settings = {
                coupleAvatar: false, coupleAvatarDesc: '',
                worldbooks: [], timeMode: 'auto', virtualTime: '', foreignMode: false, foreignLang: 'English',
                beautify: {
                    bg: '', showAvatar: true, showName: false, showTime: false, timePos: 'bottom',
                    meBg: '#333333', meText: '#ffffff', meRadius: 18, meOpacity: 1,
                    opBg: '#ffffff', opText: '#333333', opRadius: 18, opOpacity: 1, customCss: ''
                }
            };
        }
        return conv.settings;
    });

    const openConversation = (conv) => {
        chatState.activeConvId = conv.id;
        chatState.isDetailOpen = true;
        chatState.detailInput = '';
        const rawConv = currentAccountData.value.conversations.find(c => c.id === conv.id);
        if (rawConv && !rawConv.messages) rawConv.messages = [];
        nextTick(() => { if (window.lucide) window.lucide.createIcons(); scrollToBottom(); });
    };

    const closeConversation = () => {
        chatState.isDetailOpen = false;
        chatState.activeConvId = null;
        chatState.showBottomMenu = false;
    };

    const scrollToBottom = () => {
        const el = document.querySelector('.ca-detail-messages');
        if (el) setTimeout(() => { el.scrollTop = el.scrollHeight; }, 50);
    };

    const sendMessage = () => {
        if (!chatState.detailInput.trim() || !chatState.activeConvId) return;
        const text = chatState.detailInput.trim();
        const rawConv = currentAccountData.value.conversations.find(c => c.id === chatState.activeConvId);
        if (!rawConv) return;
        rawConv.messages.push({
            id: 'm_' + Date.now(), senderId: chatState.currentUser.id, text: text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        rawConv.lastMsg = text;
        rawConv.time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        chatState.detailInput = '';
        scrollToBottom();
    };

    const triggerApiReply = async () => {
        if (chatState.isTyping) return;
        const rawConv = currentAccountData.value.conversations.find(c => c.id === chatState.activeConvId);
        if (!rawConv) return;
        const targetId = rawConv.targetId;
        const targetUser = activeTargetPersona.value;
        const settings = activeConvSettings.value;
        if (!targetUser.id) return alert('该角色不存在');

        chatState.isTyping = true;
        chatState.typingText = '对方正在输入中...';
        clearInterval(typingInterval);

        const apiConf = state.apiConfig || {};
        let sysPrompt = `你现在正在一款名为 Chat 的线上聊天APP中与我聊天。必须严格符合你在APP中的角色设定进行线上交流。不要描述动作，只发送你在线上聊天会发送的文字内容。\n`;
        sysPrompt += `你的设定: 真名/备注[${targetUser.name||''}] 账号[${targetUser.chatAcc||''}] 设定[${targetUser.persona || ''}]\n`;
        if (chatState.currentUser.persona) sysPrompt += `我的已知设定: 昵称[${chatState.currentUser.name||''}] 设定[${chatState.currentUser.persona}]\n`;
        if (settings.coupleAvatar) sysPrompt += `补充信息：我们正在使用情侣头像，情侣头像的内容是：${settings.coupleAvatarDesc}\n`;
        if (settings.worldbooks && settings.worldbooks.length > 0) {
            const wbs = state.contactsData.worldbooks.filter(w => settings.worldbooks.includes(w.id)).map(w => w.content).join('\n');
            sysPrompt += `世界观/背景信息补充: ${wbs}\n`;
        }
        if (settings.timeMode === 'virtual') sysPrompt += `当前虚拟时间是: ${settings.virtualTime}\n`;
        else if (settings.timeMode === 'real') sysPrompt += `当前真实时间是: ${new Date().toLocaleString()}\n`;

        if (settings.foreignMode) {
            sysPrompt += `\n【重要指令】你必须完全使用 ${settings.foreignLang} 发送消息！如果你要分多条消息发送，必须用换行符 \\n 分隔。每条消息必须在末尾附加 '||' 和中文翻译。例如：\nHello!||你好！\nHow are you?||最近怎么样？`;
        } else {
            sysPrompt += `\n【重要指令】为了模拟真实的聊天软件体验，如果你想连发多条消息，请务必使用换行符 \\n 分隔每一条消息，切勿把多句话连在同一行。`;
        }

        const history = rawConv.messages.slice(-15).map(m => {
            let text = m.text;
            if (settings.foreignMode && m.translation) text = m.text + '||' + m.translation;
            return { role: m.senderId === targetId ? 'assistant' : 'user', content: text };
        });

        try {
            if (!apiConf.baseUrl || !apiConf.apiKey || !apiConf.activeModel) throw new Error("API未配置");
            let url = String(apiConf.baseUrl || '').trim();
            if (url.endsWith('/')) url = url.slice(0, -1);
            if (!url.endsWith('/v1') && !url.includes('/v1/')) url += '/v1';

            const response = await fetch(url + '/chat/completions', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConf.apiKey}` },
                body: JSON.stringify({ 
                    model: apiConf.activeModel, 
                    messages: [{ role: 'system', content: sysPrompt }, ...history], 
                    temperature: 0.75,
                    stream: true // 开启流式传输
                })
            });
            
            if (!response.ok) throw new Error("API 返回错误");
            chatState.isTyping = false;

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            
            let currentMsgId = 'm_' + Date.now();
            let currentText = "";
            let sseBuffer = "";

            // 预先插入第一个空气泡
            rawConv.messages.push({
                id: currentMsgId, senderId: targetId, text: '', translation: '', showTrans: false,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });

            // 读取流
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                sseBuffer += decoder.decode(value, { stream: true });
                const lines = sseBuffer.split('\n');
                sseBuffer = lines.pop(); // 最后一行可能不完整，保留在buffer

                for (const line of lines) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                        try {
                            const data = JSON.parse(line.substring(6));
                            const delta = data.choices[0].delta.content || "";
                            
                            if (delta) {
                                currentText += delta;
                                
                                // 遇到换行，截断创建新消息
                                if (currentText.includes('\n')) {
                                    const parts = currentText.split('\n');
                                    for (let i = 0; i < parts.length - 1; i++) {
                                        const completeText = parts[i].trim();
                                        if (completeText) {
                                            const msgObj = rawConv.messages.find(m => m.id === currentMsgId);
                                            if (msgObj) {
                                                if (settings.foreignMode && completeText.includes('||')) {
                                                    const sp = completeText.split('||');
                                                    msgObj.text = sp[0].trim();
                                                    msgObj.translation = sp[1] ? sp[1].trim() : '';
                                                } else {
                                                    msgObj.text = completeText;
                                                }
                                                rawConv.lastMsg = msgObj.text;
                                            }
                                            
                                            // 新建下一个气泡
                                            currentMsgId = 'm_' + Date.now() + '_' + Math.random();
                                            rawConv.messages.push({
                                                id: currentMsgId, senderId: targetId, text: '', translation: '', showTrans: false,
                                                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                            });
                                        }
                                    }
                                    currentText = parts[parts.length - 1]; // 留存剩余部分
                                }
                                
                                // 渲染最新的字符到当前气泡
                                const msgObj = rawConv.messages.find(m => m.id === currentMsgId);
                                if (msgObj) {
                                    if (settings.foreignMode && currentText.includes('||')) {
                                        const sp = currentText.split('||');
                                        msgObj.text = sp[0].trim();
                                        msgObj.translation = sp[1] ? sp[1].trim() : '';
                                    } else {
                                        msgObj.text = currentText;
                                    }
                                    rawConv.lastMsg = msgObj.text;
                                }
                                scrollToBottom();
                            }
                        } catch (e) { /* ignore JSON parse error for incomplete chunks */ }
                    }
                }
            }
            
            // 结束后清理可能的空消息
            rawConv.messages = rawConv.messages.filter(m => m.text.trim() !== '');

        } catch (err) {
            console.error(err);
            rawConv.messages.push({
                id: 'm_' + Date.now(), senderId: targetId, text: '无法连接到API或模型不支持流式传输。', 
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            chatState.isTyping = false;
        } finally {
            chatState.isTyping = false;
            scrollToBottom();
        }
    };

    const handleBgUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => { activeConvSettings.value.beautify.bg = ev.target.result; };
        reader.readAsDataURL(file);
        e.target.value = '';
    };
    const triggerBgUpload = () => { document.getElementById('ca-bg-upload-input').click(); };

    return { activeConv, activeMessages, openConversation, closeConversation, sendMessage, triggerApiReply, toggleBottomMenu, activeConvSettings, activeTargetPersona, handleBgUpload, triggerBgUpload };
};
