// YYOU - 灵感伙伴

// Coze API 配置
const COZE_CONFIG = {
    BOT_ID: '7613973790711693352',
    API_URL: 'https://api.coze.cn/v3/chat',
    RETRIEVE_URL: 'https://api.coze.cn/v3/chat/retrieve',
    MESSAGE_LIST_URL: 'https://api.coze.cn/v3/chat/message/list'
};

// Token 存储键名
const TOKEN_KEY = 'COZE_TOKEN';

// 当前内存中的 Token
let ACCESS_TOKEN = '';

// Debug 模式开关
const DEBUG = true;

function log(...args) {
    if (DEBUG) {
        console.log('[YYOU Debug]', ...args);
    }
}

// Token 掩码工具函数 - 防止在控制台泄露完整 Token
function maskToken(token) {
    if (!token || token.length < 10) return '***';
    return token.substring(0, 6) + '****' + token.substring(token.length - 4);
}

// 从 localStorage 获取 Token
function getStoredToken() {
    try {
        const token = localStorage.getItem(TOKEN_KEY);
        return token ? 'Bearer ' + token : '';
    } catch (e) {
        log('读取 Token 失败:', e);
        return '';
    }
}

// 保存 Token 到 localStorage
function saveToken(token) {
    try {
        // 移除 Bearer 前缀再存储
        const pureToken = token.replace(/^Bearer\s+/i, '');
        localStorage.setItem(TOKEN_KEY, pureToken);
        ACCESS_TOKEN = token;
        log('Token 已保存:', maskToken(token));
        return true;
    } catch (e) {
        log('保存 Token 失败:', e);
        return false;
    }
}

// 检查是否是首次访问
function isFirstVisit() {
    try {
        return !localStorage.getItem('yyou_visited');
    } catch (e) {
        return true;
    }
}

// 标记已访问
function markVisited() {
    try {
        localStorage.setItem('yyou_visited', 'true');
    } catch (e) {
        log('标记访问失败:', e);
    }
}

// 检查是否已查看过手册
function hasViewedManual() {
    try {
        return localStorage.getItem('yyou_manual_viewed') === 'true';
    } catch (e) {
        return false;
    }
}

// 标记已查看手册
function markManualViewed() {
    try {
        localStorage.setItem('yyou_manual_viewed', 'true');
    } catch (e) {
        log('标记手册已读失败:', e);
    }
}

// 欢迎语数组 - 页面加载时随机显示一次
const WELCOME_MESSAGES = [
    '正在捕捉灵感电波...',
    'YYOU 在聆听宇宙的声音 ✨',
    '今天想和 YYOU 交换什么秘密？',
    '灵感如星云般流转 🌌',
    '按下麦克风，和 YYOU 共振吧 ⚡️',
    'YYOU 已上线，等待你的信号...',
    '宇宙的灵感正在汇聚 💫',
    '想聊聊吗？YYOU 随时在听 👂'
];

document.addEventListener('DOMContentLoaded', () => {
    const micBtn = document.getElementById('micBtn');
    const textInput = document.getElementById('userInput');
    const chatBubble = document.getElementById('chatBubble');
    const yyouContainer = document.getElementById('yyouContainer');
    const yyouImage = document.getElementById('yyouImage');
    const bgGradient = document.getElementById('bgGradient');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettings = document.getElementById('closeSettings');
    const tokenInput = document.getElementById('tokenInput');
    const saveTokenBtn = document.getElementById('saveTokenBtn');
    const viewManualBtn = document.getElementById('viewManualBtn');
    const manualModal = document.getElementById('manualModal');
    const closeManual = document.getElementById('closeManual');

    let isRecording = false;
    let recognition = null;
    let recognitionResult = '';
    let isTyping = false;
    let isTokenReady = false;

    // 长按延迟时间（毫秒）
    const LONG_PRESS_DELAY = 200;
    let pressTimer = null;
    let isLongPress = false;

    // ========== Token 初始化 ==========
    function initToken() {
        ACCESS_TOKEN = getStoredToken();
        if (ACCESS_TOKEN) {
            isTokenReady = true;
            log('Token 已加载:', maskToken(ACCESS_TOKEN));
            return true;
        } else {
            isTokenReady = false;
            log('Token 未设置，等待用户配置');
            return false;
        }
    }

    // ========== 设置模态框 ==========
    function openSettings() {
        // 预填充现有 Token（去掉 Bearer 前缀）
        if (ACCESS_TOKEN) {
            tokenInput.value = ACCESS_TOKEN.replace(/^Bearer\s+/i, '');
        } else {
            tokenInput.value = '';
        }
        settingsModal.classList.add('show');
        // 移动端聚焦时延迟滚动
        setTimeout(() => {
            tokenInput.focus();
        }, 100);
    }

    function closeSettingsModal() {
        settingsModal.classList.remove('show');
    }

    function handleSaveToken() {
        const tokenValue = tokenInput.value.trim();
        if (!tokenValue) {
            showBubble('Token 不能为空哦~');
            return;
        }

        // 自动添加 Bearer 前缀
        const fullToken = tokenValue.startsWith('Bearer ') ? tokenValue : 'Bearer ' + tokenValue;

        if (saveToken(fullToken)) {
            isTokenReady = true;
            closeSettingsModal();
            showBubble('✅ Token 已连接！YYOU 现在可以和你聊天啦~');
            markVisited();
        } else {
            showBubble('❌ 保存失败，请重试');
        }
    }

    // ========== 领养手册模态框 ==========
    function openManual() {
        manualModal.classList.add('show');
        markManualViewed();
    }

    function closeManualModal() {
        manualModal.classList.remove('show');
    }

    // ========== 新手引导 ==========
    function showNewbieGuide() {
        // 如果没有查看过手册，自动弹出
        if (!hasViewedManual()) {
            setTimeout(() => {
                openManual();
            }, 500);
        } else {
            // 已查看过手册但未设置Token
            const guideText = '📡 信号未连接！点击右上角设置，把你的 Coze Token 借给 YYOU，我们就能开启星际对话啦！';
            chatBubble.innerHTML = guideText;
            chatBubble.classList.add('show');
        }
    }

    // 绑定设置相关事件
    if (settingsBtn) {
        settingsBtn.addEventListener('click', openSettings);
    }
    if (closeSettings) {
        closeSettings.addEventListener('click', closeSettingsModal);
    }
    if (saveTokenBtn) {
        saveTokenBtn.addEventListener('click', handleSaveToken);
    }
    if (viewManualBtn) {
        viewManualBtn.addEventListener('click', () => {
            closeSettingsModal();
            setTimeout(() => {
                openManual();
            }, 300);
        });
    }

    // 绑定手册相关事件
    if (closeManual) {
        closeManual.addEventListener('click', closeManualModal);
    }

    // 点击模态框外部关闭
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeSettingsModal();
        }
    });

    manualModal.addEventListener('click', (e) => {
        if (e.target === manualModal) {
            closeManualModal();
        }
    });

    // 初始化语音识别（兼容性处理）
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
            const result = event.results[event.results.length - 1];
            const transcript = result[0].transcript;
            textInput.value = transcript;
            log('语音识别中:', transcript, '是否最终:', result.isFinal);
        };

        recognition.onerror = async (event) => {
            log('语音识别错误:', event.error);
            textInput.style.opacity = '1';
            textInput.placeholder = 'YYOU 没听清，再大声点？';
            isRecording = false;
            micBtn.classList.remove('recording');
            clearTimeout(pressTimer);

            setTimeout(() => {
                textInput.placeholder = '和YYOU说点什么...';
            }, 3000);
        };

        recognition.onend = () => {
            log('语音识别结束');
            textInput.style.opacity = '1';

            if (isRecording) {
                isRecording = false;
                micBtn.classList.remove('recording');
                clearTimeout(pressTimer);

                const finalText = textInput.value.trim();
                if (finalText) {
                    handleSendMessage(finalText);
                    textInput.value = '';
                } else {
                    textInput.placeholder = 'YYOU 没听到声音哦~';
                    setTimeout(() => {
                        textInput.placeholder = '和YYOU说点什么...';
                    }, 2000);
                }
            }
        };
    } else {
        log('浏览器不支持语音识别 API');
        (async () => {
            await showBubble('当前浏览器不支持语音功能');
        })();
    }

    // ========== 初始化流程 ==========
    const hasToken = initToken();
    const firstVisit = isFirstVisit();

    if (!hasToken) {
        // Token 未设置，显示新手引导（自动弹出手册）
        showNewbieGuide();
    } else if (firstVisit) {
        // 有 Token 但是首次访问，显示欢迎语
        const randomWelcome = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];
        (async () => {
            await showBubble(randomWelcome);
        })();
        markVisited();
        log('显示欢迎语:', randomWelcome);
    } else {
        // 老用户，随机显示欢迎语
        const randomWelcome = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];
        (async () => {
            await showBubble(randomWelcome);
        })();
        log('显示欢迎语:', randomWelcome);
    }

    // ========== 录音按钮事件处理 ==========
    micBtn.addEventListener('mousedown', handlePressStart);
    micBtn.addEventListener('mouseup', handlePressEnd);
    micBtn.addEventListener('mouseleave', handlePressEnd);
    micBtn.addEventListener('touchstart', handleTouchStart, { passive: false });
    micBtn.addEventListener('touchend', handleTouchEnd, { passive: false });
    micBtn.addEventListener('touchmove', handleTouchMove, { passive: false });

    function handlePressStart(e) {
        e.preventDefault();
        isLongPress = false;

        pressTimer = setTimeout(() => {
            isLongPress = true;
            startRecording();
        }, LONG_PRESS_DELAY);
    }

    function handlePressEnd(e) {
        e.preventDefault();
        clearTimeout(pressTimer);

        if (isLongPress && isRecording) {
            stopRecording();
        }
    }

    function handleTouchStart(e) {
        e.preventDefault();
        isLongPress = false;

        pressTimer = setTimeout(() => {
            isLongPress = true;
            startRecording();
        }, LONG_PRESS_DELAY);
    }

    function handleTouchEnd(e) {
        e.preventDefault();
        clearTimeout(pressTimer);

        if (isLongPress && isRecording) {
            stopRecording();
        }
    }

    function handleTouchMove(e) {
        const touch = e.touches[0];
        const rect = micBtn.getBoundingClientRect();
        const isInside = touch.clientX >= rect.left &&
                        touch.clientX <= rect.right &&
                        touch.clientY >= rect.top &&
                        touch.clientY <= rect.bottom;

        if (!isInside && isRecording) {
            log('手指移出按钮范围，结束录音');
            stopRecording();
        }
    }

    async function startRecording() {
        if (isRecording) return;

        // 检查 Token 是否已设置
        if (!isTokenReady) {
            await showBubble('📡 请先点击右上角设置按钮，配置 Coze Token 后再开始对话~');
            return;
        }

        if (!recognition) {
            await showBubble('当前浏览器不支持语音功能');
            return;
        }

        isRecording = true;
        textInput.value = '';
        textInput.placeholder = '正在聆听中...';
        textInput.style.opacity = '0.7';
        micBtn.classList.add('recording');
        log('开始录音...');

        try {
            recognition.start();
        } catch (err) {
            log('启动语音识别失败:', err);
            textInput.style.opacity = '1';
            textInput.placeholder = '和YYOU说点什么...';
            isRecording = false;
            micBtn.classList.remove('recording');
            clearTimeout(pressTimer);
        }
    }

    function stopRecording() {
        if (!isRecording) return;
        log('停止录音');

        try {
            recognition.stop();
        } catch (err) {
            log('停止语音识别失败:', err);
            textInput.style.opacity = '1';
            textInput.placeholder = '和YYOU说点什么...';
            isRecording = false;
            micBtn.classList.remove('recording');
            clearTimeout(pressTimer);
        }
    }

    // 输入框回车发送
    textInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && textInput.value.trim()) {
            handleSendMessage(textInput.value.trim());
            textInput.value = '';
        }
    });

    // ========== 主发送函数 ==========
    async function handleSendMessage(message) {
        // 检查 Token 是否已设置
        if (!isTokenReady) {
            await showBubble('📡 请先点击右上角设置按钮，配置 Coze Token 后再开始对话~');
            return;
        }

        log('========== 开始对话任务 ==========');
        log('用户消息:', message);
        await showBubble('...');

        try {
            const chatResponse = await fetch(COZE_CONFIG.API_URL, {
                method: 'POST',
                headers: getPostHeaders(),
                body: JSON.stringify({
                    bot_id: COZE_CONFIG.BOT_ID,
                    user_id: 'user_' + Date.now(),
                    additional_messages: [{
                        role: 'user',
                        content: message,
                        content_type: 'text'
                    }],
                    stream: false
                })
            });

            log('创建对话响应状态:', chatResponse.status);
            const initialData = await chatResponse.json();
            log('创建对话响应:', initialData);

            if (initialData.code !== 0) {
                throw new Error(initialData.msg || '创建对话失败');
            }

            const chatId = initialData.data.id;
            const conversationId = initialData.data.conversation_id;
            log('对话已创建 - ChatID:', chatId, 'ConvID:', conversationId);

            const finalStatus = await pollStatus(chatId, conversationId);
            log('最终状态:', finalStatus);

            if (finalStatus === 'completed') {
                const reply = await fetchFinalReply(chatId, conversationId);
                if (reply) {
                    await showBubble(reply);
                    checkEmotion(reply);
                } else {
                    await showBubble('YYOU 收到了，但不知道怎么回答...');
                }
            } else if (finalStatus === 'failed') {
                await showBubble('YYOU 的思考被打断了...');
            } else if (finalStatus === 'canceled') {
                await showBubble('YYOU 取消了这次对话...');
            }

        } catch (error) {
            log('发生错误:', error);
            await showBubble('YYOU 的电波卡住了...');
        }

        log('========== 对话任务结束 ==========');
    }

    // ========== 轮询状态函数 ==========
    async function pollStatus(chatId, conversationId) {
        const getHeaders = { 'Authorization': ACCESS_TOKEN };
        const url = `${COZE_CONFIG.RETRIEVE_URL}?chat_id=${String(chatId)}&conversation_id=${String(conversationId)}`;

        await new Promise(r => setTimeout(r, 1500));

        const maxAttempts = 60;
        let attempts = 0;

        while (attempts < maxAttempts) {
            try {
                const res = await fetch(url, {
                    method: 'GET',
                    headers: getHeaders
                });

                const data = await res.json();
                log(`轮询 ${attempts + 1}/${maxAttempts}:`, data);

                if (data.code === 0 && data.data && data.data.status === 'completed') {
                    return 'completed';
                }
                if (data.code === 0 && data.data && data.data.status === 'failed') {
                    return 'failed';
                }
                if (data.code === 0 && data.data && data.data.status === 'canceled') {
                    return 'canceled';
                }
                if (data.code !== 0) {
                    log('警告：服务器返回异常码', data.code, data.msg);
                }
            } catch (err) {
                log('轮询出错', err);
            }

            await new Promise(r => setTimeout(r, 1500));
            attempts++;
        }

        log('轮询超时');
        return 'timeout';
    }

    // ========== 获取最终回复函数 ==========
    async function fetchFinalReply(chatId, conversationId) {
        try {
            const url = `${COZE_CONFIG.MESSAGE_LIST_URL}?chat_id=${String(chatId)}&conversation_id=${String(conversationId)}`;
            const getHeaders = { 'Authorization': ACCESS_TOKEN };

            const res = await fetch(url, {
                method: 'GET',
                headers: getHeaders
            });

            const msgListData = await res.json();
            log('消息列表:', msgListData);

            if (!msgListData.data || !Array.isArray(msgListData.data) || msgListData.data.length === 0) {
                log('消息列表为空');
                return null;
            }

            const answerMsg = msgListData.data.find(m => m.role === 'assistant' && m.type === 'answer');
            if (answerMsg && answerMsg.content) {
                log('找到 assistant + answer 消息:', answerMsg.content);
                return answerMsg.content;
            }

            const assistantMsgs = msgListData.data.filter(m => m.role === 'assistant' && m.content);
            if (assistantMsgs.length > 0) {
                const lastAssistantMsg = assistantMsgs[assistantMsgs.length - 1];
                log('找到最后一个 assistant 消息:', lastAssistantMsg.content);
                return lastAssistantMsg.content;
            }

            log('未找到有效的回复');
            return null;

        } catch (err) {
            log('获取消息列表出错:', err);
            return null;
        }
    }

    // ========== UI 函数 ==========
    async function typeWriter(text, element) {
        isTyping = true;
        element.innerHTML = '';
        element.classList.add('show');

        const textNode = document.createTextNode('');
        element.appendChild(textNode);

        const cursor = document.createElement('span');
        cursor.className = 'typing-cursor';
        cursor.innerHTML = '▎';
        element.appendChild(cursor);

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            textNode.textContent += char;
            element.scrollTop = element.scrollHeight;

            let delay = 25;
            if ([',', '.', '!', '?', '，', '。', '！', '？', '\n', '、', ';', '；', ':', '：'].includes(char)) {
                delay = 200;
            }
            await new Promise(res => setTimeout(res, delay));
        }

        cursor.remove();
        isTyping = false;
        log('打字机效果完成');
    }

    async function showBubble(text) {
        if (isTyping) {
            log('正在打字中，新消息将覆盖');
            isTyping = false;
            await new Promise(res => setTimeout(res, 50));
        }

        chatBubble.classList.add('show');
        log('气泡显示，开始打字机效果:', text);

        await typeWriter(text, chatBubble);
    }

    // ========== 情绪检测与背景联动 ==========
    function checkEmotion(text) {
        yyouContainer.classList.remove('lightning-mode', 'cloud-mode', 'broken-mode');
        bgGradient.classList.remove('lightning', 'cloud');
        yyouImage.style.filter = '';

        if (text.includes('⚡️')) {
            yyouContainer.classList.add('lightning-mode');
            bgGradient.classList.add('lightning');
            log('情绪状态: 闪电态 ⚡️');
        } else if (text.includes('☁️')) {
            yyouContainer.classList.add('cloud-mode');
            bgGradient.classList.add('cloud');
            log('情绪状态: 棉花糖态 ☁️');
        } else if (text.includes('⚠️')) {
            yyouContainer.classList.add('broken-mode');
            yyouImage.style.filter = 'grayscale(100%) brightness(0.7)';
            log('情绪状态: 碎裂态 ⚠️');
        } else {
            log('情绪状态: 默认');
        }
    }

    // ========== 请求头工具函数 ==========
    function getPostHeaders() {
        return {
            'Authorization': ACCESS_TOKEN,
            'Content-Type': 'application/json'
        };
    }

    // 暴露到全局，方便测试
    window.handleSendMessage = handleSendMessage;
    window.openManual = openManual;
});
