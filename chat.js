window.useChatLogic = function(state) {
    const { reactive, computed, watch, nextTick } = Vue;
    
    if(!state.chatData) state.chatData = { accounts: {}, groups: {} };
    const db = computed(() => state.chatData);
    const allPersonas = computed(() => [...(state.contactsData?.myPersonas || []), ...(state.contactsData?.characters || [])]);

    const chatState = reactive({
        isLoggedIn: false, currentUser: null, activeTab: 'msg', showAddMenu: false, searchQuery: '',
        modals: { addFriend: false, createGroup: false }, loginForm: { acc: '', pwd: '' }, addFriendAcc: ''
    });

    const refreshIcons = () => { nextTick(() => { if (window.lucide) window.lucide.createIcons(); }); };
    watch([() => chatState.activeTab, () => chatState.isLoggedIn, () => chatState.modals.addFriend, () => chatState.showAddMenu], refreshIcons);

    const handleLogin = () => {
        if(!chatState.loginForm.acc) return alert('请输入账号');
        const user = allPersonas.value.find(c => c.chatAcc === chatState.loginForm.acc && c.chatPwd === chatState.loginForm.pwd);
        if(user) {
            chatState.currentUser = user;
            if(!db.value.accounts[user.id]) db.value.accounts[user.id] = { friends: [], conversations: [], status: '在线' };
            chatState.isLoggedIn = true; chatState.loginForm = { acc: '', pwd: '' };
        } else { alert('账号或密码错误！\n(请在人脉库中查看角色设置的 Chat ID 和 Pwd)'); }
    };

    const handleLogout = () => {
        if(confirm('确定退出当前账号吗？')) { chatState.isLoggedIn = false; chatState.currentUser = null; chatState.activeTab = 'msg'; }
    };

    const toggleStatus = () => {
        if(!chatState.currentUser) return;
        const statuses = ['在线', '隐身', '忙碌', '离开', '勿扰'];
        const accData = db.value.accounts[chatState.currentUser.id];
        accData.status = statuses[(statuses.indexOf(accData.status) + 1) % statuses.length];
    };

    const confirmAddFriend = () => {
        const acc = chatState.addFriendAcc.trim();
        if(!acc) return alert('请输入对方账号');
        const targetUser = allPersonas.value.find(c => c.chatAcc === acc);
        if(!targetUser) return alert('未找到该账号，请检查');
        if(targetUser.id === chatState.currentUser.id) return alert('不能添加自己');

        const myAccData = db.value.accounts[chatState.currentUser.id];
        if((myAccData.friends || []).includes(targetUser.id)) return alert('对方已是您的好友');

        if(!db.value.accounts[targetUser.id]) db.value.accounts[targetUser.id] = { friends: [], conversations: [], status: '在线' };
        const targetAccData = db.value.accounts[targetUser.id];

        myAccData.friends.unshift(targetUser.id); targetAccData.friends.unshift(chatState.currentUser.id);
        const timeStr = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        myAccData.conversations.unshift({ id: 'c_'+Date.now(), type: 'private', targetId: targetUser.id, lastMsg: '你们已成为好友，开始聊天吧！', time: timeStr });
        targetAccData.conversations.unshift({ id: 'c_'+(Date.now()+1), type: 'private', targetId: chatState.currentUser.id, lastMsg: '你们已成为好友，开始聊天吧！', time: timeStr });

        chatState.addFriendAcc = ''; chatState.modals.addFriend = false; alert('添加成功！');
    };

    const myConversations = computed(() => {
        if(!chatState.currentUser || !db.value.accounts[chatState.currentUser.id]) return [];
        return (db.value.accounts[chatState.currentUser.id].conversations || []).map(conv => {
            const target = allPersonas.value.find(c => c.id === conv.targetId);
            return { ...conv, name: target ? target.name : '未知用户', avatar: target ? target.avatar : '' };
        }).filter(c => c.name.includes(chatState.searchQuery));
    });

    const myFriends = computed(() => {
        if(!chatState.currentUser || !db.value.accounts[chatState.currentUser.id]) return [];
        return (db.value.accounts[chatState.currentUser.id].friends || []).map(fid => allPersonas.value.find(c => c.id === fid)).filter(Boolean);
    });

    return { chatState, db, handleLogin, handleLogout, toggleStatus, confirmAddFriend, myConversations, myFriends };
};
