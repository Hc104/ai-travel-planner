/* ========================================
   21st.dev 组件移植 - 融合交互逻辑
   旅游智能规划助手 | TRAE AI 创造力大赛
   ======================================== */

(function() {
    'use strict';

    // ========================================
    // 1. Dynamic Animated Hero - 浮动粒子
    // ========================================
    function initHeroParticles() {
        var container = document.querySelector('.hero-dynamic-particles');
        if (!container) return;
        for (var i = 0; i < 30; i++) {
            var p = document.createElement('div');
            p.className = 'hero-particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.top = Math.random() * 100 + '%';
            p.style.animationDelay = Math.random() * 8 + 's';
            p.style.animationDuration = (5 + Math.random() * 8) + 's';
            container.appendChild(p);
        }
    }

    // ========================================
    // 2. Image Auto Slider（欢迎提示区）
    // ========================================
    function initImageSliders() {
        var sliders = document.querySelectorAll('.image-slider');
        sliders.forEach(function(slider) {
            if (slider.dataset.sliderInit) return;
            slider.dataset.sliderInit = '1';

            var track = slider.querySelector('.image-slider-track');
            var slides = slider.querySelectorAll('.image-slider-slide');
            var dots = slider.querySelectorAll('.image-slider-dot');
            var prevBtn = slider.querySelector('.image-slider-arrow.prev');
            var nextBtn = slider.querySelector('.image-slider-arrow.next');
            if (!track || slides.length === 0) return;

            var current = 0, total = slides.length, autoPlayInterval;

            function goTo(index) {
                if (index < 0) index = total - 1;
                if (index >= total) index = 0;
                current = index;
                track.style.transform = 'translateX(-' + (current * 100) + '%)';
                dots.forEach(function(d, i) { d.classList.toggle('active', i === current); });
            }
            function next() { goTo(current + 1); }
            function prev() { goTo(current - 1); }
            function startAutoPlay() { stopAutoPlay(); autoPlayInterval = setInterval(next, 4000); }
            function stopAutoPlay() { if (autoPlayInterval) { clearInterval(autoPlayInterval); autoPlayInterval = null; } }

            if (prevBtn) prevBtn.addEventListener('click', function() { prev(); startAutoPlay(); });
            if (nextBtn) nextBtn.addEventListener('click', function() { next(); startAutoPlay(); });
            dots.forEach(function(dot, i) { dot.addEventListener('click', function() { goTo(i); startAutoPlay(); }); });
            slider.addEventListener('mouseenter', stopAutoPlay);
            slider.addEventListener('mouseleave', startAutoPlay);

            var touchStartX = 0;
            slider.addEventListener('touchstart', function(e) { touchStartX = e.changedTouches[0].screenX; stopAutoPlay(); }, { passive: true });
            slider.addEventListener('touchend', function(e) {
                var diff = touchStartX - e.changedTouches[0].screenX;
                if (diff > 50) next(); else if (diff < -50) prev();
                startAutoPlay();
            });
            startAutoPlay();
        });
    }

    // ========================================
    // 3. Live Recommend - 实时多人推荐旅游地点
    // BroadcastChannel 跨标签页实时同步
    // ========================================
    function initLiveRecommend() {
        var track = document.getElementById('liveRecommendTrack');
        var dotsContainer = document.getElementById('liveRecommendDots');
        var totalEl = document.getElementById('liveRecommendTotal');
        var addBtn = document.getElementById('addRecommendBtn');
        var onlineNum = document.getElementById('onlineNum');
        if (!track || !dotsContainer) return;

        // 目的地数据（imageUrl 使用本地图片，无跨域问题）
        var destinations = [
            { id: 'lijiang',    name: '丽江古城', emoji: '🏔️', desc: '世界文化遗产，纳西风情',   gradient: 'linear-gradient(135deg,#1e3a5f,#2d1b69)', count: 142, imageUrl: 'images/lijiang.jpg?v=2',
              detail: { rating: 4.8, openTime: '全天开放（古城内商铺9:00-22:00）', duration: '2-3天', bestTime: '4-10月', transport: '飞机至丽江三义机场，打车约30分钟到古城', tips: ['古城内车辆无法进入，建议穿舒适的平底鞋','四方街傍晚有纳西族篝火打跳','玉龙雪山需提前3天预约索道票'] } },
            { id: 'sanya',      name: '三亚湾',   emoji: '🏖️', desc: '碧海蓝天，热带天堂',       gradient: 'linear-gradient(135deg,#0f3d3d,#1a4a2e)', count: 98,  imageUrl: 'images/sanya.jpg?v=2',
              detail: { rating: 4.5, openTime: '全天开放', duration: '3-5天', bestTime: '11月-次年3月', transport: '飞机至三亚凤凰机场，打车约15分钟到三亚湾', tips: ['注意防晒，紫外线强烈','傍晚在椰梦长廊看日落非常美','海鲜市场选购时注意称重，建议去正规餐厅'] } },
            { id: 'gugong',     name: '故宫博物院', emoji: '🏯', desc: '六百年紫禁城，中华瑰宝',   gradient: 'linear-gradient(135deg,#4a1a2e,#6b2152)', count: 203, imageUrl: 'images/gugong.jpg?v=2',
              detail: { rating: 4.9, price: 60, openTime: '8:30-17:00（周一闭馆）', duration: '4-6小时', bestTime: '4-5月、9-10月', transport: '地铁1号线天安门东站下车步行5分钟', tips: ['需提前7天在官网预约购票','建议租语音导览器，20元/次','从神武门出来可步行至景山公园俯瞰故宫全景'] } },
            { id: 'zhangjiajie',name: '张家界',   emoji: '🏞️', desc: '奇峰三千，秀水八百',       gradient: 'linear-gradient(135deg,#1a3a2e,#2d5a1e)', count: 76,  imageUrl: 'images/zhangjiajie.jpg?v=2',
              detail: { rating: 4.7, price: 228, openTime: '7:00-18:00', duration: '2-3天', bestTime: '4-6月、9-11月', transport: '飞机至张家界荷花机场，打车约40分钟到景区', tips: ['山上天气多变，带好雨具和外套','景区内猴子较多，不要手提塑料袋','百龙天梯建议早上去，排队人少'] } },
            { id: 'xihu',       name: '西湖',     emoji: '🌊', desc: '淡妆浓抹总相宜',           gradient: 'linear-gradient(135deg,#1a3a4a,#2d5a6e)', count: 167, imageUrl: 'images/xihu.jpg?v=2',
              detail: { rating: 4.8, openTime: '全天开放', duration: '1天', bestTime: '3-5月、9-10月', transport: '地铁1号线龙翔桥站下车步行5分钟', tips: ['推荐骑行环湖，全程约15公里','断桥残雪是西湖十景之一','晚上的音乐喷泉很值得一看'] } },
            { id: 'jiuzhaigou', name: '九寨沟',   emoji: '💎', desc: '人间仙境，童话世界',       gradient: 'linear-gradient(135deg,#0d3b4e,#1a6b5a)', count: 115, imageUrl: 'images/jiuzhaigou.jpg?v=2',
              detail: { rating: 4.9, price: 169, openTime: '7:30-17:00', duration: '1-2天', bestTime: '9-10月（秋季彩林最美）', transport: '飞机至九寨黄龙机场，乘车约2小时到景区', tips: ['景区内需乘坐观光车，路线固定','海拔较高，注意预防高原反应','秋季是旺季，建议提前预订门票'] } },
            { id: 'guilin',     name: '桂林山水', emoji: '⛰️', desc: '山水甲天下',               gradient: 'linear-gradient(135deg,#1a4a2e,#2d6b3a)', count: 88,  imageUrl: 'images/guilin.jpg?v=2',
              detail: { rating: 4.6, openTime: '全天开放（漓江游船8:00-18:00）', duration: '2-3天', bestTime: '4-10月', transport: '飞机至桂林两江机场，打车约30分钟到市区', tips: ['漓江精华游从杨堤到兴坪，约4小时','阳朔西街晚上非常热闹','象鼻山是桂林的标志性景点'] } },
            { id: 'huangshan',  name: '黄山',     emoji: '🌄', desc: '五岳归来不看山',           gradient: 'linear-gradient(135deg,#3a3a2e,#5a4a1e)', count: 134, imageUrl: 'images/huangshan.jpg?v=2',
              detail: { rating: 4.8, price: 190, openTime: '6:30-16:30（索道运营时间）', duration: '1-2天', bestTime: '4-5月、9-11月', transport: '高铁至黄山北站，换乘景区大巴约1小时', tips: ['山顶住宿较贵，建议提前预订','看日出需凌晨4点出发去光明顶','山上温差大，需带保暖外套'] } }
        ];

        // 从 localStorage 恢复推荐数
        var saved = localStorage.getItem('liveRecommendData');
        if (saved) {
            try {
                var parsed = JSON.parse(saved);
                destinations.forEach(function(d) {
                    if (parsed[d.id] !== undefined) d.count = Math.max(d.count, parsed[d.id]);
                });
                // 恢复用户添加的地点
                if (parsed._custom) {
                    parsed._custom.forEach(function(c) { destinations.push(c); });
                }
            } catch(e) {}
        }

        function saveData() {
            var data = {};
            destinations.forEach(function(d) { data[d.id] = d.count; });
            // 保存自定义地点
            var custom = destinations.filter(function(d) { return d._custom; });
            if (custom.length) data._custom = custom;
            localStorage.setItem('liveRecommendData', JSON.stringify(data));
        }

        var currentSlide = 0;
        var totalSlides = destinations.length;
        var autoPlayTimer = null;
        var simulateTimer = null;
        var votedThisSession = {}; // 本会话已推荐的地点

        // 记录本地已推荐（防止重复计数）
        var localVoted = {};
        try { localVoted = JSON.parse(localStorage.getItem('liveRecommendVoted') || '{}'); } catch(e) {}

        // ========================================
        // BroadcastChannel 跨标签页实时通信
        // ========================================
        var channel = null;
        var tabId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        var onlineTabs = {};
        onlineTabs[tabId] = Date.now();

        try {
            channel = new BroadcastChannel('travel-recommend');
            channel.onmessage = function(e) {
                var msg = e.data;
                if (msg.tabId === tabId) return; // 忽略自己的消息

                switch (msg.type) {
                    case 'ping':
                        // 响应 ping
                        channel.postMessage({ type: 'pong', tabId: tabId, time: Date.now() });
                        break;
                    case 'pong':
                        onlineTabs[msg.tabId] = msg.time;
                        updateOnlineCount();
                        break;
                    case 'vote':
                        handleRemoteVote(msg.destId);
                        break;
                    case 'add':
                        handleRemoteAdd(msg.dest);
                        break;
                    case 'bye':
                        delete onlineTabs[msg.tabId];
                        updateOnlineCount();
                        break;
                }
            };

            // 宣布自己上线
            channel.postMessage({ type: 'ping', tabId: tabId, time: Date.now() });

            // 定期清理离线 tab
            setInterval(function() {
                var now = Date.now();
                var changed = false;
                Object.keys(onlineTabs).forEach(function(id) {
                    if (id !== tabId && now - onlineTabs[id] > 15000) {
                        delete onlineTabs[id];
                        changed = true;
                    }
                });
                if (changed) updateOnlineCount();
            }, 5000);

            // 定期 ping
            setInterval(function() {
                channel.postMessage({ type: 'ping', tabId: tabId, time: Date.now() });
            }, 8000);

            // 页面关闭时通知
            window.addEventListener('beforeunload', function() {
                channel.postMessage({ type: 'bye', tabId: tabId });
            });
        } catch(e) {
            // BroadcastChannel 不支持时降级
        }

        function updateOnlineCount() {
            var count = Object.keys(onlineTabs).length;
            if (onlineNum) onlineNum.textContent = count;
        }

        function handleRemoteVote(destId) {
            var dest = destinations.find(function(d) { return d.id === destId; });
            if (!dest) return;
            dest.count++;
            updateCurrentCard();
            updateDots();
            updateTotal();
            saveData();
            showToast('有人刚刚推荐了 ' + dest.name + '！');
        }

        function handleRemoteAdd(newDest) {
            // 检查是否已存在
            if (destinations.find(function(d) { return d.id === newDest.id; })) return;
            destinations.push(newDest);
            totalSlides = destinations.length;
            renderAllCards();
            saveData();
            showToast('有人推荐了新地点：' + newDest.name + '！');
        }

        function showToast(msg) {
            var toast = document.getElementById('liveRecommendToast');
            if (!toast) {
                toast = document.createElement('div');
                toast.className = 'live-recommend-toast';
                toast.id = 'liveRecommendToast';
                document.body.appendChild(toast);
            }
            toast.textContent = msg;
            toast.classList.add('show');
            clearTimeout(toast._timeout);
            toast._timeout = setTimeout(function() {
                toast.classList.remove('show');
            }, 2500);
        }

        function updateTotal() {
            var total = destinations.reduce(function(s, d) { return s + d.count; }, 0);
            if (totalEl) totalEl.textContent = '共 ' + total + ' 人参与推荐';
        }

        // ========================================
        // 渲染卡片
        // ========================================
        function renderAllCards() {
            track.innerHTML = '';
            dotsContainer.innerHTML = '';

            destinations.forEach(function(dest, i) {
                // 卡片
                var card = document.createElement('div');
                card.className = 'live-recommend-card';
                card.setAttribute('data-dest-id', dest.id);
                // 渐变作为兜底，直接设置背景图
                card.style.background = dest.gradient;
                if (dest.imageUrl) {
                    card.style.backgroundImage = 'url(' + dest.imageUrl + ')';
                    card.style.backgroundSize = 'cover';
                    card.style.backgroundPosition = 'center';
                    card.classList.add('has-image');
                }

                card.innerHTML =
                    (dest._hot ? '<div class="live-recommend-badge">🔥 热门</div>' : '') +
                    '<div class="live-recommend-card-info">' +
                        '<div class="live-recommend-card-name">' + dest.emoji + ' ' + dest.name + '</div>' +
                        '<div class="live-recommend-card-desc">' + dest.desc + '</div>' +
                        '<div class="live-recommend-card-meta">' +
                            '<div class="live-recommend-count">' +
                                '<span class="live-recommend-count-num" data-dest-id="' + dest.id + '">' + dest.count + '</span> 人推荐' +
                            '</div>' +
                            '<button class="live-recommend-vote-btn" data-dest-id="' + dest.id + '">👍 我也推荐</button>' +
                        '</div>' +
                    '</div>';
                track.appendChild(card);

                // 指示点
                var dot = document.createElement('button');
                dot.className = 'live-recommend-dot' + (i === 0 ? ' active' : '');
                dot.addEventListener('click', (function(idx) {
                    return function() { goToSlide(idx); };
                })(i));
                dotsContainer.appendChild(dot);
            });

            totalSlides = destinations.length;
            updateTotal();
            updateVoteButtons();
        }

        function updateCurrentCard() {
            var card = track.children[currentSlide];
            if (!card) return;
            var dest = destinations[currentSlide];
            var numEl = card.querySelector('.live-recommend-count-num');
            if (numEl) {
                numEl.textContent = dest.count;
                numEl.classList.remove('bump');
                void numEl.offsetWidth; // reflow
                numEl.classList.add('bump');
            }
        }

        function updateVoteButtons() {
            var allBtns = track.querySelectorAll('.live-recommend-vote-btn');
            allBtns.forEach(function(btn) {
                var destId = btn.getAttribute('data-dest-id');
                if (localVoted[destId] || votedThisSession[destId]) {
                    btn.classList.add('voted');
                    btn.textContent = '✓ 已推荐';
                }
            });
        }

        function updateDots() {
            var dots = dotsContainer.querySelectorAll('.live-recommend-dot');
            dots.forEach(function(d, i) {
                d.classList.toggle('active', i === currentSlide);
            });
        }

        // ========================================
        // 轮播控制
        // ========================================
        function goToSlide(index) {
            if (index < 0) index = totalSlides - 1;
            if (index >= totalSlides) index = 0;
            currentSlide = index;
            track.style.transform = 'translateX(-' + (currentSlide * 100) + '%)';
            updateDots();
            // 更新热门标签
            updateHotBadge();
        }

        function nextSlide() { goToSlide(currentSlide + 1); }

        function startAutoPlay() {
            stopAutoPlay();
            autoPlayTimer = setInterval(nextSlide, 4000);
        }

        function stopAutoPlay() {
            if (autoPlayTimer) { clearInterval(autoPlayTimer); autoPlayTimer = null; }
        }

        function updateHotBadge() {
            // 找出推荐数最高的前3个，标记为热门
            var sorted = destinations.slice().sort(function(a, b) { return b.count - a.count; });
            var top3Ids = sorted.slice(0, 3).map(function(d) { return d.id; });
            destinations.forEach(function(d) { d._hot = top3Ids.indexOf(d.id) !== -1; });
            // 更新所有卡片的 badge
            var cards = track.querySelectorAll('.live-recommend-card');
            cards.forEach(function(card, i) {
                var badge = card.querySelector('.live-recommend-badge');
                if (destinations[i]._hot) {
                    if (!badge) {
                        badge = document.createElement('div');
                        badge.className = 'live-recommend-badge';
                        badge.textContent = '🔥 热门';
                        card.insertBefore(badge, card.firstChild);
                    }
                } else {
                    if (badge) badge.remove();
                }
            });
        }

        // ========================================
        // 卡片点击：推荐按钮 or 跳转详情页
        // ========================================
        var hasDragged = false;
        track.addEventListener('click', function(e) {
            // 如果刚刚拖拽过，不触发点击
            if (hasDragged) { hasDragged = false; return; }

            // 点击"我也推荐"按钮
            var btn = e.target.closest('.live-recommend-vote-btn');
            if (btn) {
                e.stopPropagation();
                var destId = btn.getAttribute('data-dest-id');
                if (localVoted[destId] || votedThisSession[destId]) return;

                var dest = destinations.find(function(d) { return d.id === destId; });
                if (!dest) return;

                // 本地标记
                votedThisSession[destId] = true;
                localVoted[destId] = true;
                try { localStorage.setItem('liveRecommendVoted', JSON.stringify(localVoted)); } catch(e) {}

                // 更新计数
                dest.count++;
                updateCurrentCard();
                updateDots();
                updateTotal();
                updateHotBadge();
                updateVoteButtons();
                saveData();

                // 广播给其他标签页
                if (channel) {
                    channel.postMessage({ type: 'vote', destId: destId, tabId: tabId });
                }
                return;
            }

            // 点击卡片本身 → 跳转详情页
            var card = e.target.closest('.live-recommend-card');
            if (card) {
                var destId = card.getAttribute('data-dest-id');
                var dest = destinations.find(function(d) { return d.id === destId; });
                if (!dest) return;

                var detail = dest.detail || {};
                detail.name = dest.name;
                detail.coverGradient = dest.gradient;
                detail.coverEmoji = dest.emoji;
                detail.desc = detail.desc || dest.desc;
                detail.rating = detail.rating || 4.5;
                detail.price = detail.price || 0;
                detail.tags = detail.tags || ['热门推荐', '多人推荐'];
                detail.openTime = detail.openTime || '全天开放';
                detail.duration = detail.duration || '1天';
                detail.bestTime = detail.bestTime || '全年皆宜';
                detail.transport = detail.transport || '请查看交通方案';
                detail.tips = detail.tips || ['建议提前规划行程', '注意天气变化'];

                // 如果有真实图片URL，也传过去
                if (dest.imageUrl) {
                    detail.coverImage = dest.imageUrl;
                }

                try {
                    localStorage.setItem('_currentAttractionDetail', JSON.stringify(detail));
                } catch(e) {}
                window.location.href = 'attraction.html';
            }
        });

        // 滑动切换（鼠标拖拽 + 触摸滑动）
        var dragStartX = 0;
        var dragMoved = false;
        var isDragging = false;
        var sliderEl = track.parentElement;

        function onDragStart(e) {
            isDragging = true;
            dragMoved = false;
            hasDragged = false;
            sliderEl.style.cursor = 'grabbing';
            dragStartX = e.touches ? e.changedTouches[0].screenX : e.screenX;
            stopAutoPlay();
        }

        function onDragMove(e) {
            if (!isDragging) return;
            var currentX = e.touches ? e.changedTouches[0].screenX : e.screenX;
            if (Math.abs(dragStartX - currentX) > 5) {
                dragMoved = true;
                hasDragged = true;
            }
            e.preventDefault();
        }

        function onDragEnd(e) {
            if (!isDragging) return;
            isDragging = false;
            sliderEl.style.cursor = '';
            var endX = e.changedTouches ? e.changedTouches[0].screenX : e.screenX;
            var diff = dragStartX - endX;
            if (dragMoved && Math.abs(diff) > 30) {
                if (diff > 0) nextSlide();
                else goToSlide(currentSlide - 1);
            }
            startAutoPlay();
        }

        sliderEl.addEventListener('mousedown', onDragStart);
        sliderEl.addEventListener('mousemove', onDragMove);
        sliderEl.addEventListener('mouseup', onDragEnd);
        sliderEl.addEventListener('mouseleave', onDragEnd);
        sliderEl.addEventListener('touchstart', onDragStart, { passive: true });
        sliderEl.addEventListener('touchmove', onDragMove, { passive: false });
        sliderEl.addEventListener('touchend', onDragEnd);

        // ========================================
        // 模拟其他用户推荐（定期随机增加推荐）
        // ========================================
        function startSimulation() {
            simulateTimer = setInterval(function() {
                // 随机选一个目的地增加推荐
                var idx = Math.floor(Math.random() * destinations.length);
                var dest = destinations[idx];
                dest.count++;

                // 更新如果是当前卡片
                if (idx === currentSlide) {
                    updateCurrentCard();
                }

                updateDots();
                updateTotal();
                updateHotBadge();
                saveData();

                // 不广播模拟的推荐（模拟的是"其他用户"行为）
            }, 8000 + Math.random() * 10000); // 8-18秒随机间隔
        }

        // ========================================
        // 推荐新地点
        // ========================================
        if (addBtn) {
            addBtn.addEventListener('click', function() {
                showAddModal();
            });
        }

        function showAddModal() {
            // 移除旧弹窗
            var old = document.querySelector('.live-recommend-modal-overlay');
            if (old) old.remove();

            var overlay = document.createElement('div');
            overlay.className = 'live-recommend-modal-overlay';
            overlay.innerHTML =
                '<div class="live-recommend-modal">' +
                    '<h3>✨ 推荐新旅游地点</h3>' +
                    '<input type="text" id="newDestName" placeholder="地点名称，如：稻城亚丁" maxlength="20">' +
                    '<input type="text" id="newDestDesc" placeholder="简短描述，如：蓝色星球最后一片净土" maxlength="30">' +
                    '<div class="live-recommend-modal-hint">输入地点名称和描述，推荐给所有在线用户</div>' +
                    '<div class="live-recommend-modal-btns">' +
                        '<button class="live-recommend-modal-cancel">取消</button>' +
                        '<button class="live-recommend-modal-submit">确认推荐</button>' +
                    '</div>' +
                '</div>';
            document.body.appendChild(overlay);

            // 动画显示
            requestAnimationFrame(function() { overlay.classList.add('open'); });

            var nameInput = overlay.querySelector('#newDestName');
            var descInput = overlay.querySelector('#newDestDesc');
            var cancelBtn = overlay.querySelector('.live-recommend-modal-cancel');
            var submitBtn = overlay.querySelector('.live-recommend-modal-submit');

            function close() {
                overlay.classList.remove('open');
                setTimeout(function() { overlay.remove(); }, 300);
            }

            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) close();
            });
            cancelBtn.addEventListener('click', close);

            submitBtn.addEventListener('click', function() {
                var name = nameInput.value.trim();
                var desc = descInput.value.trim() || '值得一去的好地方';
                if (!name) { nameInput.focus(); return; }

                var gradients = [
                    'linear-gradient(135deg,#1e3a5f,#2d1b69)',
                    'linear-gradient(135deg,#0f3d3d,#1a4a2e)',
                    'linear-gradient(135deg,#4a1a2e,#6b2152)',
                    'linear-gradient(135deg,#1a3a2e,#2d5a1e)',
                    'linear-gradient(135deg,#1a3a4a,#2d5a6e)',
                    'linear-gradient(135deg,#0d3b4e,#1a6b5a)',
                    'linear-gradient(135deg,#3a2a1e,#5a3a2e)',
                    'linear-gradient(135deg,#2a1a3e,#4a2a5e)'
                ];
                var emojis = ['🏔️', '🏖️', '🏯', '🏞️', '🌊', '💎', '⛰️', '🌄', '🗻', '🏝️', '🌋', '🕌'];

                var newDest = {
                    id: 'custom_' + Date.now(),
                    name: name,
                    emoji: emojis[Math.floor(Math.random() * emojis.length)],
                    desc: desc,
                    gradient: gradients[Math.floor(Math.random() * gradients.length)],
                    count: 1,
                    _custom: true
                };

                destinations.push(newDest);
                totalSlides = destinations.length;
                renderAllCards();
                goToSlide(totalSlides - 1);
                saveData();
                updateHotBadge();

                // 广播
                if (channel) {
                    channel.postMessage({ type: 'add', dest: newDest, tabId: tabId });
                }

                close();
            });

            nameInput.focus();
        }

        // ========================================
        // 初始化
        // ========================================
        renderAllCards();
        updateHotBadge();
        startAutoPlay();
        startSimulation();
        updateOnlineCount();
    }

    // ========================================
    // 4. Calendar with Booked Days（日历网格选择器）
    // ========================================
    function initCalendar() {
        var trigger = document.getElementById('calendarTrigger');
        var overlay = document.getElementById('calendarOverlay');
        var display = document.getElementById('calendarDisplay');
        var hiddenInput = document.getElementById('travelDate');
        var grid = document.getElementById('calendarGrid');
        var monthYear = document.getElementById('calendarMonthYear');
        var prevBtn = overlay ? overlay.querySelector('.calendar-prev') : null;
        var nextBtn = overlay ? overlay.querySelector('.calendar-next') : null;
        var confirmBtn = document.getElementById('calendarConfirm');
        var cancelBtn = overlay ? overlay.querySelector('.calendar-cancel') : null;

        if (!trigger || !overlay || !grid) return;

        var today = new Date();
        var currentMonth = today.getMonth();
        var currentYear = today.getFullYear();
        var selectedDate = {
            year: today.getFullYear(),
            month: today.getMonth() + 1,
            day: today.getDate()
        };

        var weekDays = ['日', '一', '二', '三', '四', '五', '六'];
        var monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

        // Demo: mark some days as booked (next 2 weekends + random weekdays)
        function getBookedDates(year, month) {
            var booked = [];
            var d = new Date(year, month, 1);
            // Book all Saturdays and Sundays
            while (d.getMonth() === month) {
                var dow = d.getDay();
                if (dow === 0 || dow === 6) booked.push(d.getDate());
                d.setDate(d.getDate() + 1);
            }
            return booked;
        }

        function renderCalendar(year, month) {
            grid.innerHTML = '';
            monthYear.textContent = year + '年 ' + (month + 1) + '月';

            var firstDay = new Date(year, month, 1).getDay();
            var daysInMonth = new Date(year, month + 1, 0).getDate();
            var daysInPrevMonth = new Date(year, month, 0).getDate();

            var bookedDates = getBookedDates(year, month);
            var isToday = function(d) {
                return d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            };
            var isSelected = function(d) {
                return d === selectedDate.day && month === selectedDate.month - 1 && year === selectedDate.year;
            };

            // Previous month days
            for (var i = firstDay - 1; i >= 0; i--) {
                var btn = document.createElement('button');
                btn.className = 'calendar-day other-month';
                btn.textContent = daysInPrevMonth - i;
                btn.disabled = true;
                grid.appendChild(btn);
            }

            // Current month days
            for (var d = 1; d <= daysInMonth; d++) {
                var btn = document.createElement('button');
                btn.className = 'calendar-day';
                btn.textContent = d;

                if (isToday(d)) btn.classList.add('today');
                if (isSelected(d)) btn.classList.add('selected');
                if (bookedDates.indexOf(d) !== -1) btn.classList.add('booked');

                btn.addEventListener('click', (function(day) {
                    return function() {
                        selectedDate.year = year;
                        selectedDate.month = month + 1;
                        selectedDate.day = day;
                        renderCalendar(year, month);
                    };
                })(d));
                grid.appendChild(btn);
            }

            // Next month days (fill remaining cells)
            var totalCells = firstDay + daysInMonth;
            var remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
            for (var n = 1; n <= remaining; n++) {
                var btn = document.createElement('button');
                btn.className = 'calendar-day other-month';
                btn.textContent = n;
                btn.disabled = true;
                grid.appendChild(btn);
            }
        }

        function changeMonth(delta) {
            currentMonth += delta;
            if (currentMonth < 0) { currentMonth = 11; currentYear--; }
            if (currentMonth > 11) { currentMonth = 0; currentYear++; }
            renderCalendar(currentYear, currentMonth);
        }

        prevBtn.addEventListener('click', function() { changeMonth(-1); });
        nextBtn.addEventListener('click', function() { changeMonth(1); });

        // Open overlay
        trigger.addEventListener('click', function() {
            // Sync calendar month to selected date
            currentMonth = selectedDate.month - 1;
            currentYear = selectedDate.year;
            renderCalendar(currentYear, currentMonth);
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        });

        // Close overlay
        function closeOverlay() {
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeOverlay();
        });

        if (cancelBtn) cancelBtn.addEventListener('click', closeOverlay);

        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                var m = String(selectedDate.month).padStart(2, '0');
                var d = String(selectedDate.day).padStart(2, '0');
                var dateStr = selectedDate.year + '-' + m + '-' + d;
                hiddenInput.value = dateStr;
                display.textContent = selectedDate.month + '月' + selectedDate.day + '日';
                closeOverlay();
            });
        }

        // Set default date
        hiddenInput.value = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        display.textContent = (today.getMonth() + 1) + '月' + today.getDate() + '日';
    }

    // ========================================
    // 5. City Swap Button
    // ========================================
    function initCitySwap() {
        var swapBtn = document.getElementById('citySwapBtn');
        if (!swapBtn) return;

        swapBtn.addEventListener('click', function() {
            var depInput = document.getElementById('departureCity');
            var destInput = document.getElementById('destinationCity');
            var depLng = document.getElementById('departureLng');
            var destLng = document.getElementById('destinationLng');
            var depLat = document.getElementById('departureLat');
            var destLat = document.getElementById('destinationLat');

            var depSpan = document.querySelector('#departureInput .city-placeholder');
            var destSpan = document.querySelector('#destinationInput .city-placeholder');

            // Swap hidden values
            var tmp = depInput.value; depInput.value = destInput.value; destInput.value = tmp;
            var tmp2 = depLng.value; depLng.value = destLng.value; destLng.value = tmp2;
            var tmp3 = depLat.value; depLat.value = destLat.value; destLat.value = tmp3;

            // Swap display text and placeholder classes
            if (depSpan && destSpan) {
                var tmp4 = depSpan.textContent; depSpan.textContent = destSpan.textContent; destSpan.textContent = tmp4;
                if (depInput.value) { depSpan.classList.remove('city-placeholder'); } else { depSpan.classList.add('city-placeholder'); }
                if (destInput.value) { destSpan.classList.remove('city-placeholder'); } else { destSpan.classList.add('city-placeholder'); }
            }

            // Animate
            swapBtn.style.transform = 'rotate(180deg)';
            setTimeout(function() { swapBtn.style.transform = ''; }, 400);
        });
    }

    // ========================================
    // City change listener (reserved for future use)
    // ========================================
    function watchCityChanges() {
        // No globe updates needed - map handles city markers directly
    }

    // ========================================
    // Initialize all on DOM ready
    // ========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }

    function initAll() {
        initHeroParticles();
        initImageSliders();
        initLiveRecommend();
        initCalendar();
        initCitySwap();
        watchCityChanges();
    }
})();