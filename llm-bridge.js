/**
 * LLM Bridge - 前端与后端代理的通信模块
 * 负责调用 LLM 行程生成、酒店搜索、距离计算等后端 API
 */

const API_BASE = 'http://localhost:3456';

// ========================================
// 缓存管理
// ========================================
const llmCache = {
    _cache: {},
    _load() {
        try {
            const raw = localStorage.getItem('_llm_cache');
            if (raw) this._cache = JSON.parse(raw);
        } catch(e) { this._cache = {}; }
    },
    _save() {
        try {
            localStorage.setItem('_llm_cache', JSON.stringify(this._cache));
        } catch(e) {}
    },
    get(key) {
        this._load();
        return this._cache[key] || null;
    },
    set(key, value, ttlHours) {
        this._load();
        this._cache[key] = { data: value, ts: Date.now(), ttl: (ttlHours || 24) * 3600000 };
        // Clean expired
        const now = Date.now();
        for (const k in this._cache) {
            if (now - this._cache[k].ts > this._cache[k].ttl) delete this._cache[k];
        }
        this._save();
    }
};

// ========================================
// P0: LLM 行程生成
// ========================================
async function callLLMForItinerary(params) {
    const cacheKey = 'itinerary_' + params.city + '_' + params.days + '_' + (params.preferences || []).join(',');
    const cached = llmCache.get(cacheKey);
    if (cached) {
        console.log('[LLM] 使用缓存的行程数据');
        return cached.data;
    }

    try {
        const res = await fetch(API_BASE + '/api/llm/itinerary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        const json = await res.json();
        if (!json.success) {
            throw new Error(json.error || '行程生成失败');
        }
        // Cache for 24 hours
        llmCache.set(cacheKey, json.data, 24);
        return json.data;
    } catch (err) {
        console.error('[LLM] 行程生成失败，将使用规则引擎兜底:', err.message);
        return null;
    }
}

// ========================================
// P2: LLM 为未知目的地生成数据
// ========================================
async function callLLMForDestination(city) {
    const cacheKey = 'dest_' + city;
    const cached = llmCache.get(cacheKey);
    if (cached) {
        console.log('[LLM] 使用缓存的目的地数据 for ' + city);
        return cached.data;
    }

    try {
        const res = await fetch(API_BASE + '/api/llm/destination', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ city: city })
        });
        const json = await res.json();
        if (!json.success) {
            throw new Error(json.error || '目的地数据生成失败');
        }
        // Cache for 7 days
        llmCache.set(cacheKey, json.data, 168);
        return json.data;
    } catch (err) {
        console.error('[LLM] 目的地数据生成失败:', err.message);
        return null;
    }
}

// ========================================
// P1: 高德酒店搜索
// ========================================
async function fetchHotelsFromAmap(city, lng, lat) {
    const cacheKey = 'hotels_' + city;
    const cached = llmCache.get(cacheKey);
    if (cached) {
        console.log('[AMAP] 使用缓存的酒店数据 for ' + city);
        return cached.data;
    }

    try {
        const url = API_BASE + '/api/hotels?city=' + encodeURIComponent(city) + '&lng=' + lng + '&lat=' + lat;
        const res = await fetch(url);
        const json = await res.json();
        if (json.hotels && json.hotels.length > 0) {
            llmCache.set(cacheKey, json, 1); // Cache for 1 hour
            return json;
        }
        return null;
    } catch (err) {
        console.error('[AMAP] 酒店搜索失败:', err.message);
        return null;
    }
}

// ========================================
// P1: 景点间距离计算
// ========================================
async function calculateAttractionDistances(attractions) {
    if (!attractions || attractions.length < 2) return [];

    const points = attractions.filter(a => a.lng && a.lat).map(a => ({
        name: a.name, lng: a.lng, lat: a.lat
    }));

    if (points.length < 2) return [];

    try {
        const res = await fetch(API_BASE + '/api/distances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ points })
        });
        const json = await res.json();
        return json.distances || [];
    } catch (err) {
        console.error('[AMAP] 距离计算失败:', err.message);
        return [];
    }
}

// ========================================
// 行程合理性校验
// ========================================
async function validateItineraryRoutes(attractions) {
    if (!attractions || attractions.length < 2) return { valid: true, warnings: [] };

    const distances = await calculateAttractionDistances(attractions);
    const warnings = [];

    for (const d of distances) {
        const durationMin = Math.round(d.duration / 60);
        if (durationMin > 60) {
            warnings.push({
                type: 'distance',
                message: d.from + ' 到 ' + d.to + ' 驾车约 ' + Math.round(durationMin) + ' 分钟（' + d.distance + '公里），当天路线较长，建议调整',
                from: d.from,
                to: d.to,
                duration: durationMin,
                distance: d.distance
            });
        }
    }

    return { valid: warnings.length === 0, warnings };
}

// ========================================
// 将 LLM 数据转换为应用使用的格式
// ========================================
function convertLLMItinerary(llmData) {
    if (!llmData || !llmData.days) return [];

    return llmData.days.map(day => ({
        day: day.day,
        date: day.date,
        theme: day.theme || '',
        schedule: (day.schedule || []).map(item => ({
            time: item.time,
            title: item.title,
            desc: item.desc || '',
            category: item.category || 'attraction'
        }))
    }));
}

function convertLLMDestination(llmData) {
    if (!llmData) return null;

    return {
        name: llmData.name,
        features: llmData.features || [],
        description: llmData.description || '',
        attractions: (llmData.attractions || []).map((a, i) => ({
            name: a.name,
            desc: a.desc,
            rating: a.rating || 4.5,
            price: a.price || 0,
            tags: a.tags || [],
            openTime: a.openTime || '全天开放',
            duration: a.duration || '2小时',
            bestTime: a.bestTime || '上午',
            transport: a.transport || '公交可达',
            tips: a.tips || []
        })),
        foods: (llmData.foods || []).map(f => ({
            name: f.name,
            icon: f.icon || '🍽️',
            desc: f.desc || '',
            price: f.price || 50,
            specialty: f.specialty || '地方特色'
        })),
        itineraries: {}
    };
}
