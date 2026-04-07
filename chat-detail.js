window.useChatDetailLogic = function(state, chatMethods) {
    const { reactive, computed, nextTick } = Vue;
    const { chatState, currentAccountData, myConversations } = chatMethods;

    chatState.isDetailOpen = false;
    chatState.activeConvId = null;
    chatState.detailInput = '';
    chatState.isTyping = false;
    chatState.typingText = '';

    let typingInterval = null;
    chatState.showBottomMenu = false;

    const toggleBottomMenu = () => {
        chatState.showBottomMenu = !chatState.showBottomMenu;
        if(chatState.showBottomMenu) {
            setTimeout(scrollToBottom, 300);
        }
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

    const openConversation = (conv) => {
        chatState.activeConvId = conv.id;
        chatState.isDetailOpen = true;
        chatState.detailInput = '';
        
        const rawConv = currentAccountData.value.conversations.find(c => c.id === conv.id);
        if (rawConv && !rawConv.messages) rawConv.messages = [];
        
        nextTick(() => {
            if (window.lucide) window.lucide.createIcons();
            scrollToBottom();
        });
    };

    const closeConversation = () => {
        chatState.isDetailOpen = false;
        chatState.activeConvId = null;
        chatState.showBottomMenu = false; // 退出时重置状态
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
            id: 'm_' + Date.now(), senderId: chatState.currentUser.id,
            text: text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
        const targetUser = state.contactsData.characters.find(c => c.id === targetId) || state.contactsData.myPersonas.find(c => c.id === targetId);
        if (!targetUser) return alert('该角色不存在');

        chatState.isTyping = true;
        let dotCount = 1;
        chatState.typingText = '对方正在输入中.';
        typingInterval = setInterval(() => {
            dotCount = (dotCount % 3) + 1;
            chatState.typingText = '对方正在输入中' + '.'.repeat(dotCount);
        }, 500);

        const apiConf = state.apiConfig || {};
        const systemPrompt = `你是 ${targetUser.name || '未知'}。设定: ${targetUser.persona || ''}。请根据上下文简短自然地回复。`;
        const history = rawConv.messages.slice(-10).map(m => ({
            role: m.senderId === targetId ? 'assistant' : 'user',
            content: m.text
        }));

        let replyText = '';
        try {
            if (!apiConf.baseUrl || !apiConf.apiKey || !apiConf.activeModel) throw new Error("API未配置");
            let url = String(apiConf.baseUrl || '').trim();
            if (url.endsWith('/')) url = url.slice(0, -1);
            if (!url.endsWith('/v1') && !url.includes('/v1/')) url += '/v1';

            const response = await fetch(url + '/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConf.apiKey}` },
                body: JSON.stringify({ model: apiConf.activeModel, messages: [{ role: 'system', content: systemPrompt }, ...history], temperature: 0.7 })
            });
            if (!response.ok) throw new Error("API 返回错误");
            const resData = await response.json();
            replyText = resData?.choices?.[0]?.message?.content || '...';
        } catch (err) {
            replyText = '无法连接到API，此为自动回复。';
        } finally {
            clearInterval(typingInterval);
            chatState.isTyping = false;
            rawConv.messages.push({
                id: 'm_' + Date.now(), senderId: targetId,
                text: replyText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            rawConv.lastMsg = replyText;
            rawConv.time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            scrollToBottom();
        }
    };

    return { activeConv, activeMessages, openConversation, closeConversation, sendMessage, triggerApiReply, toggleBottomMenu };
};
