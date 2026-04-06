window.useSettingsLogic = function(state) {
    // ==== 1. API 设置逻辑 ====
    const fetchApiModels = async () => {
        let baseUrl = state.apiConfig.baseUrl.trim();
        const apiKey = state.apiConfig.apiKey.trim();

        if (!baseUrl || !apiKey) {
            alert('请先填写完整的 API URL 和 秘钥');
            return;
        }

        // 自动格式化 URL（支持 OpenAI 标准的 /v1/models）
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        if (!baseUrl.endsWith('/v1') && !baseUrl.includes('/v1/')) {
            baseUrl += '/v1';
        }
        
        const endpoint = baseUrl + '/models';

        try {
            // 发起真实的 API 请求
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP 错误！状态码: ${response.status}`);
            }

            const data = await response.json();
            
            // 解析兼容 OpenAI 格式的模型数组
            if (data && data.data && Array.isArray(data.data)) {
                // 提取所有模型的 id，并过滤一下可能存在的空值
                state.apiConfig.models = data.data.map(m => m.id).filter(Boolean);
                
                if (state.apiConfig.models.length > 0) {
                    // 如果当前没选模型，或者选的模型不在新列表里，默认选第一个
                    if (!state.apiConfig.activeModel || !state.apiConfig.models.includes(state.apiConfig.activeModel)) {
                        state.apiConfig.activeModel = state.apiConfig.models[0];
                    }
                    alert(`成功获取到 ${state.apiConfig.models.length} 个模型！请在下方下拉框中选择。`);
                } else {
                    alert('接口请求成功，但该渠道的模型列表为空。');
                }
            } else {
                alert('获取失败：接口返回的 JSON 格式不符合标准 (未找到 data 数组)。');
            }

        } catch (error) {
            console.error('API 测试请求报错:', error);
            alert(`获取模型失败！\n\n可能的原因：\n1. API 链接或秘钥填写错误\n2. 您的 API 渠道不支持浏览器跨域 (CORS) 请求\n\n系统报错：${error.message}`);
        }
    };

    // ==== 2. 存储设置逻辑 ====
    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const updateStorageInfo = () => {
        // 利用 Blob 计算真实数据所占字节大小
        const getSize = (obj) => new Blob([JSON.stringify(obj || {})]).size;
        
        // 分类计算各模块真实的本地占用
        const wpSize = getSize(state.wallpapers) + getSize(state.desktopWallpaper) + getSize(state.capsuleBg);
        const iconSize = getSize(state.appsTop) + getSize(state.appsBottom) + getSize(state.appsDock) + getSize(state.clockIcons);
        const widgetSize = getSize(state.widgetImage1) + getSize(state.badgeImage) + getSize(state.customImg1) + getSize(state.customImg2) + getSize(state.avatarCard1) + getSize(state.avatarCard2) + getSize(state.idCard);
        const otherSize = getSize(state) - wpSize - iconSize - widgetSize;

        const total = wpSize + iconSize + widgetSize + otherSize;
        state.storageUsed = total;

        state.storageDetails = [
            { name: '壁纸与背景层', size: wpSize, color: '#2b2b2b' },
            { name: '应用图标与系统', size: iconSize, color: '#737373' },
            { name: '小组件相片库', size: widgetSize, color: '#b3b3b3' },
            { name: '文本与基础配置', size: Math.max(0, otherSize), color: '#e6e6e6' }
        ];

        // 渲染 CSS 甜甜圈图
        let currentAngle = 0;
        const gradientParts = state.storageDetails.map(item => {
            const percentage = (item.size / total) * 100;
            if(percentage === 0) return '';
            const start = currentAngle;
            currentAngle += percentage;
            return `${item.color} ${start}% ${currentAngle}%`;
        }).filter(Boolean).join(', ');

        state.storageDonutStyle = { background: `conic-gradient(${gradientParts || '#eee 0% 100%'})` };
    };

    // ==== 3. 数据管理 (完整导入/导出 IndexedDB) ====
    const exportAllData = async () => {
        try {
            // 直接抓取底层所有保存的状态，无需关心后续新增了什么字段，真正的“打包一切”
            const rawData = await localforage.getItem('ins_desktop_v8_state');
            const blob = new Blob([JSON.stringify(rawData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Desktop_Backup_${new Date().getTime()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch(e) {
            alert('导出失败！');
        }
    };

    const handleImportData = (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                if(parsed && typeof parsed === 'object') {
                    // 全量覆盖并重载
                    await localforage.setItem('ins_desktop_v8_state', parsed);
                    alert('导入数据成功！即将刷新桌面。');
                    location.reload();
                } else {
                    alert('备份文件格式不正确！');
                }
            } catch(err) {
                alert('解析文件失败！');
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // 重置 file input
    };
    
    const triggerImport = () => { document.querySelector('.data-file-input').click(); };

    return {
        fetchApiModels, formatSize, updateStorageInfo, exportAllData, handleImportData, triggerImport
    };
};
