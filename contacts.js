window.useContactsLogic = function(state) {
    const { ref, reactive, computed, watch, nextTick } = Vue;
    const contactsTab = ref('chars');
    const modals = reactive({ char: false, world: false, wb: false, wbCat: false, relSelect: false, relEdit: false });
    const charForm = reactive({ isMe: false, worldId: '', name: '', avatar: '', persona: '' });
    const wbForm = reactive({ categoryId: '', keywords: '', content: '' });

    const activeChar = ref(null);
    const pwdVisibility = reactive({ chat: false });

    const canvasRef = ref(null);
    const selectedNodeId = ref(null);
    const relEditForm = reactive({ relId: '', sourceView: '', targetView: '' });

    const db = computed(() => state.contactsData);

    const refreshIcons = () => { nextTick(() => { if (window.lucide) window.lucide.createIcons(); }); };
    watch([contactsTab, activeChar, () => modals.char, () => modals.wb], refreshIcons);

    const groupedChars = computed(() => {
        if (!db.value.worlds) return [];
        const allChars = [...(db.value.myPersonas || []), ...(db.value.characters || [])];
        return db.value.worlds.map(w => ({ world: w, chars: allChars.filter(c => c.worldId === w.id) }));
    });

    const groupedWbs = computed(() => {
        if (!db.value.wbCategories) return [];
        return db.value.wbCategories.map(c => ({ category: c, wbs: (db.value.worldbooks || []).filter(w => w.categoryId === c.id) }));
    });

    const openAddWorld = () => { const name = prompt('请输入世界分类名称：'); if (name && name.trim()) db.value.worlds.push({ id: 'w_' + Date.now(), name: name.trim() }); };
    const openAddWbCat = () => { const name = prompt('请输入世界书分类名称：'); if (name && name.trim()) db.value.wbCategories.push({ id: 'c_' + Date.now(), name: name.trim() }); };
    const openAddChar = (isMe = false) => { charForm.isMe = isMe; charForm.worldId = db.value.worlds[0]?.id || ''; charForm.name = ''; charForm.avatar = ''; charForm.persona = ''; modals.char = true; };
    const triggerAvatarUpload = (targetObj) => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = (e) => { const file = e.target.files[0]; if(!file) return; const reader = new FileReader(); reader.onload = (ev) => { targetObj.avatar = ev.target.result; }; reader.readAsDataURL(file); }; input.click(); };

    const saveChar = () => {
        if(!charForm.worldId && !charForm.isMe) return alert('请选择所属的世界分类'); 
        if(!charForm.name.trim()) return alert('请输入姓名'); 
        const newChar = { id: 'char_' + Date.now(), isMe: charForm.isMe, worldId: charForm.worldId, name: charForm.name.trim(), avatar: charForm.avatar, persona: charForm.persona.trim(), phone: '', email: '', chatAcc: '', chatPwd: '' };
        if(charForm.isMe) db.value.myPersonas.unshift(newChar); else db.value.characters.unshift(newChar);
        modals.char = false;
    };

    const openAddWb = () => { wbForm.categoryId = db.value.wbCategories[0]?.id || ''; wbForm.keywords = ''; wbForm.content = ''; modals.wb = true; };
    const saveWb = () => { if(!wbForm.categoryId) return alert('请选择分类'); if(!wbForm.content.trim()) return alert('内容不能为空'); db.value.worldbooks.unshift({ id: 'wb_' + Date.now(), categoryId: wbForm.categoryId, keywords: wbForm.keywords.trim(), content: wbForm.content.trim() }); modals.wb = false; };

    const openCharDetail = (char) => { 
        if(char.phone === undefined) char.phone=''; if(char.email === undefined) char.email='';
        if(char.chatAcc === undefined) char.chatAcc=''; if(char.chatPwd === undefined) char.chatPwd='';
        activeChar.value = char; pwdVisibility.chat = false;
        if(!db.value.layouts[char.id]) db.value.layouts[char.id] = {};
        if(!db.value.layouts[char.id][char.id]) db.value.layouts[char.id][char.id] = {x: 150, y: 130};
        refreshIcons();
    };

    const callApiToGenerate = () => {
        if(activeChar.value.isMe) return;
        alert('正在调用 API 分析角色人设生成专属账号信息...');
        setTimeout(() => {
            const c = activeChar.value;
            c.phone = '1' + Math.floor(100000 + Math.random() * 900000);
            c.email = Math.random().toString(36).substring(2, 8) + '@youl.com';
            c.chatAcc = c.name.substring(0,3).toLowerCase() + Math.floor(Math.random() * 10000);
            c.chatPwd = Math.random().toString(36).substring(2, 8);
        }, 800);
    };

    const deleteActiveChar = () => {
        if(!confirm(`确定要彻底删除 [${activeChar.value.name}] 吗？\n所有相关关系网也会被清除。`)) return;
        const id = activeChar.value.id;
        if(activeChar.value.isMe) db.value.myPersonas = db.value.myPersonas.filter(c => c.id !== id);
        else db.value.characters = db.value.characters.filter(c => c.id !== id);
        db.value.relationships = db.value.relationships.filter(r => r.sourceId !== id && r.targetId !== id);
        activeChar.value = null;
    };

    const canvasNodes = computed(() => {
        if(!activeChar.value) return [];
        const layout = db.value.layouts[activeChar.value.id] || {};
        const nodes = [{ id: activeChar.value.id, name: activeChar.value.name, avatar: activeChar.value.avatar, x: layout[activeChar.value.id]?.x || 150, y: layout[activeChar.value.id]?.y || 130 }];
        (db.value.relationships || []).forEach(r => {
            if(r.sourceId === activeChar.value.id || r.targetId === activeChar.value.id) {
                const otherId = r.sourceId === activeChar.value.id ? r.targetId : r.sourceId;
                if(!nodes.find(n => n.id === otherId)) {
                    const c = [...(db.value.characters||[]), ...(db.value.myPersonas||[])].find(c => c.id === otherId);
                    if(c) nodes.push({ id: c.id, name: c.name, avatar: c.avatar, x: layout[c.id]?.x || 50 + Math.random()*200, y: layout[c.id]?.y || 50 + Math.random()*150 });
                }
            }
        });
        return nodes;
    });

    const canvasEdges = computed(() => {
        if(!activeChar.value) return [];
        const nodes = canvasNodes.value;
        const edges = [];
        (db.value.relationships || []).forEach(r => {
            const n1 = nodes.find(n => n.id === r.sourceId);
            const n2 = nodes.find(n => n.id === r.targetId);
            if(n1 && n2) edges.push({ ...r, x1: n1.x, y1: n1.y - 10, x2: n2.x, y2: n2.y - 10 });
        });
        return edges;
    });

    const availableRelChars = computed(() => {
        if(!activeChar.value) return [];
        const connectedIds = canvasEdges.value.map(e => e.sourceId === activeChar.value.id ? e.targetId : e.sourceId);
        connectedIds.push(activeChar.value.id);
        const pool = [...(db.value.myPersonas||[]), ...(db.value.characters||[]).filter(c => c.worldId === activeChar.value.worldId)];
        return pool.filter(c => !connectedIds.includes(c.id));
    });

    const confirmAddRel = (targetId) => { db.value.relationships.push({ id: 'rel_'+Date.now(), sourceId: activeChar.value.id, targetId: targetId, sourceView: '认识', targetView: '认识' }); modals.relSelect = false; };
    const handleNodeClick = (nodeId) => {
        if(selectedNodeId.value === null) { selectedNodeId.value = nodeId; } 
        else {
            if(selectedNodeId.value !== nodeId) {
                const exists = db.value.relationships.find(r => (r.sourceId===selectedNodeId.value && r.targetId===nodeId) || (r.sourceId===nodeId && r.targetId===selectedNodeId.value));
                if(!exists) db.value.relationships.push({ id: 'rel_'+Date.now(), sourceId: selectedNodeId.value, targetId: nodeId, sourceView: '认识', targetView: '认识' });
            }
            selectedNodeId.value = null; 
        }
    };

    const openRelEdit = (edge) => {
        relEditForm.relId = edge.id;
        const isSourceMe = edge.sourceId === activeChar.value.id;
        relEditForm.sourceView = isSourceMe ? edge.sourceView : edge.targetView; 
        relEditForm.targetView = isSourceMe ? edge.targetView : edge.sourceView; 
        modals.relEdit = true;
    };
    const saveRelEdit = () => {
        const edge = db.value.relationships.find(r => r.id === relEditForm.relId);
        if(edge) {
            const isSourceMe = edge.sourceId === activeChar.value.id;
            if(isSourceMe) { edge.sourceView = relEditForm.sourceView; edge.targetView = relEditForm.targetView; }
            else { edge.targetView = relEditForm.sourceView; edge.sourceView = relEditForm.targetView; }
        }
        modals.relEdit = false;
    };

    let draggingNodeId = null;
    const startDrag = (e, nodeId) => { draggingNodeId = nodeId; };
    const onCanvasMove = (e) => {
        if(draggingNodeId && activeChar.value) {
            const rect = canvasRef.value.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            let x = clientX - rect.left; let y = clientY - rect.top;
            x = Math.max(30, Math.min(x, rect.width - 30)); y = Math.max(30, Math.min(y, rect.height - 30));
            if(!db.value.layouts[activeChar.value.id]) db.value.layouts[activeChar.value.id] = {};
            db.value.layouts[activeChar.value.id][draggingNodeId] = {x, y};
        }
    };
    const endDrag = () => { draggingNodeId = null; };

    return { contactsTab, modals, charForm, wbForm, groupedChars, groupedWbs, db, openAddWorld, openAddWbCat, openAddChar, triggerAvatarUpload, saveChar, openAddWb, saveWb, activeChar, pwdVisibility, openCharDetail, callApiToGenerate, deleteActiveChar, canvasRef, canvasNodes, canvasEdges, availableRelChars, confirmAddRel, handleNodeClick, selectedNodeId, openRelEdit, relEditForm, saveRelEdit, startDrag, onCanvasMove, endDrag };
};
