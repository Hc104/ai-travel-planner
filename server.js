require("dotenv").config({path:__dirname+"/.env"});
var express=require("express");
var cors=require("cors");
var app=express();
var PORT=process.env.PORT||3456;

// 允许高德地图 JS SDK 使用 eval（其内部有 eval 调用）
app.use(function(req, res, next) {
    res.setHeader('Content-Security-Policy', "default-src 'self' https: 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:; connect-src 'self' https: wss:; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' data: https:;");
    next();
});

app.use(cors());
app.use(express.json({limit:"1mb"}));

var OpenAI=null;
try{OpenAI=require("openai")}catch(e){console.log("openai not available:",e.message)}
var openai=null;
if(OpenAI&&process.env.LLM_API_KEY&&process.env.LLM_API_KEY!=="your-api-key-here"){
  openai=new OpenAI({apiKey:process.env.LLM_API_KEY,baseURL:process.env.LLM_BASE_URL||"https://api.openai.com/v1"});
}
var LLM_MODEL=process.env.LLM_MODEL||"gpt-4o-mini";

app.get("/api/health",function(req,res){
  res.json({status:"ok",llm:openai?"configured":"not configured",model:LLM_MODEL});
});

app.get("/api/hotels",async function(req,res){
  try{
    var city=req.query.city,lng=req.query.lng,lat=req.query.lat;
    if(!city||!lng||!lat)return res.status(400).json({error:"Missing params"});
    var key=process.env.AMAP_KEY||"b87e57c19df3b4cc00903af692340e21";
    var kw=req.query.keywords||"hotel";
    var url="https://restapi.amap.com/v3/place/text?key="+key+"&keywords="+encodeURIComponent(kw)+"&city="+encodeURIComponent(city)+"&types=hotel|lodging|inn&offset=10&page=1&extensions=all";
    var resp=await fetch(url);var data=await resp.json();
    if(data.status==="1"&&data.pois&&data.pois.length>0){
      return res.json({hotels:data.pois.slice(0,8).map(function(p){return{name:p.name,address:p.address||"",rating:parseFloat(p.biz_ext&&p.biz_ext.rating||"0")||0,price:p.biz_ext&&p.biz_ext.cost||"",distance:p.distance?Math.round(parseInt(p.distance)):0,tel:p.tel||"",type:p.type||""}})})}
    var aUrl="https://restapi.amap.com/v3/place/around?key="+key+"&location="+lng+","+lat+"&keywords="+encodeURIComponent(kw)+"&types=hotel|lodging&radius=10000&offset=10&page=1&extensions=all";
    var aResp=await fetch(aUrl);var aData=await aResp.json();
    if(aData.status==="1"&&aData.pois&&aData.pois.length>0){
      return res.json({hotels:aData.pois.slice(0,8).map(function(p){return{name:p.name,address:p.address||"",rating:parseFloat(p.biz_ext&&p.biz_ext.rating||"0")||0,price:p.biz_ext&&p.biz_ext.cost||"",distance:p.distance?Math.round(parseInt(p.distance)):0,tel:p.tel||"",type:p.type||""}})})}
    res.json({hotels:[]});
  }catch(err){console.error("Hotel:",err.message);res.status(500).json({error:"Failed"})}
});

app.post("/api/distances",async function(req,res){
  try{
    var points=req.body.points;
    if(!points||points.length<2)return res.status(400).json({error:"Need >=2 points"});
    var key=process.env.AMAP_KEY||"b87e57c19df3b4cc00903af692340e21";
    var results=[];
    for(var i=0;i<points.length-1;i++){
      var o=points[i].lng+","+points[i].lat;
      var d=points[i+1].lng+","+points[i+1].lat;
      var url="https://restapi.amap.com/v3/direction/driving?key="+key+"&origin="+o+"&destination="+d+"&strategy=0";
      try{
        var resp=await fetch(url);var data=await resp.json();
        if(data.status==="1"&&data.route&&data.route.paths&&data.route.paths[0]){
          var r=data.route.paths[0];
          results.push({from:points[i].name,to:points[i+1].name,distance:r.distance,duration:r.duration});
        }else{
          var dist=haversine(points[i].lng,points[i].lat,points[i+1].lng,points[i+1].lat);
          results.push({from:points[i].name,to:points[i+1].name,distance:Math.round(dist*1000),duration:Math.round(dist*180)});
        }
      }catch(e2){
        var dist=haversine(points[i].lng,points[i].lat,points[i+1].lng,points[i+1].lat);
        results.push({from:points[i].name,to:points[i+1].name,distance:Math.round(dist*1000),duration:Math.round(dist*180)});
      }
    }
    res.json({success:true,distances:results});
  }catch(err){res.status(500).json({error:"Failed"})}
});

function haversine(lng1,lat1,lng2,lat2){
  var R=6371;
  var dLat=(lat2-lat1)*Math.PI/180;
  var dLng=(lng2-lng1)*Math.PI/180;
  var a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

app.post("/api/generate-review", async function(req, res) {
  if (!openai) return res.status(503).json({ error: "LLM not configured. Set LLM_API_KEY in .env" });
  try {
    var body = req.body;
    var city = body.city || "目的地";
    var days = body.days || 3;
    var pace = body.pace || "compact";
    var paceLabel = { compact: "紧凑型打卡之旅", comfort: "舒适的慢游之旅", relax: "躺平式度假之旅" };
    var attractions = body.attractions || [];
    var foods = body.foods || [];
    var weather = body.weather || "天气未知";
    var budget = body.budget || 5000;

    var prompt = "你是一位热情的中国旅行博主，请根据以下信息为用户的旅行写一段约300字的回顾和旅行感受。语言风格温暖、有画面感、像朋友分享而非导游词。\n\n";
    prompt += "目的地：" + city + "\n";
    prompt += "天数：" + days + "天\n";
    prompt += "节奏：" + (paceLabel[pace] || pace) + "\n";
    prompt += "天气情况：" + weather + "\n";
    prompt += "游览景点：" + attractions.join("、") + "\n";
    prompt += "品尝美食：" + foods.join("、") + "\n";
    prompt += "预算：约" + budget + "元\n\n";
    prompt += "请写一段旅行回顾，包含以下要素：对目的地第一印象、最有记忆点的时刻、一道印象深刻的美食、一句总结。每部分用自然段落过渡，不要用序号或标题。";

    var response = await openai.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: "你是一位热情友好的中国旅行博主，写作风格温暖有画面感。" },
        { role: "user", content: prompt }
      ],
      max_tokens: 600,
      temperature: 0.8
    });

    var review = response.choices[0].message.content;
    res.json({ success: true, review: review });
  } catch (err) {
    console.error("Review generation failed:", err.message);
    res.status(500).json({ error: "生成回顾失败，请稍后重试：" + err.message });
  }
});

app.use(express.static(__dirname));

app.listen(PORT,function(){
  console.log("Server running at http://localhost:"+PORT);
  console.log("LLM: "+(openai?"configured":"NOT configured - set LLM_API_KEY in .env"));
});

// Vercel 部署需要导出 app
module.exports = app;