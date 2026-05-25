let rainData;
let myMap;
let canvas;
let mappa; // 先宣告，不在此處初始化以避免載入順序錯誤

// 使用公共 CORS 代理伺服器以避開瀏覽器跨來源請求限制
// 更換為 corsproxy.io，通常對本地開發環境 (127.0.0.1) 較為友善
let targetUrl = 'https://wic.gov.taipei/OpenData/API/Rain/Get?stationNo=&loginId=open_rain&dataKey=85452C1D';
let url = 'https://corsproxy.io/?' + encodeURIComponent(targetUrl);

// 地圖預設參數 (台北市中心)
const options = {
  lat: 25.0478,
  lng: 121.5319,
  zoom: 12,
  style: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
};

function preload() {
  // 預載入 API 資料
  rainData = loadJSON(url);
}

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  
  // 在 setup 中初始化 Mappa，確保 HTML 中的函式庫已載入
  mappa = new Mappa('Leaflet');
  
  // 初始化地圖
  myMap = mappa.tileMap(options);
  myMap.overlay(canvas);

  textFont('sans-serif');

  // 每 10 分鐘 (600,000 毫秒) 自動抓取一次資料
  setInterval(updateData, 600000);
}

function updateData() {
  loadJSON(url, (newData) => {
    rainData = newData;
    console.log("資料已更新:", new Date().toLocaleTimeString());
  });
}

function draw() {
  // 清除背景，以便顯示下方地圖層
  clear();

  // 彈性解析資料：如果代理伺服器直接回傳 JSON 陣列，則直接使用；
  // 如果回傳的是像 allorigins 那樣包裝在 .contents 裡的，則進行二次解析。
  let data = rainData;
  
  if (rainData && rainData.contents) {
    try {
      data = typeof rainData.contents === 'string' ? JSON.parse(rainData.contents) : rainData.contents;
    } catch (e) {
      console.error("JSON 解析錯誤:", e);
    }
  }

  if (data && (Array.isArray(data) || typeof data === 'object')) {
    let dataArray = Array.isArray(data) ? data : Object.values(data);
    let hoveredStation = null;

    for (let i = 0; i < dataArray.length; i++) {
      let station = dataArray[i];
      // API 提供的經緯度欄位通常為 lon (經度) 與 lat (緯度)
      if (!station.stationName || !station.lat || !station.lon) continue;

      // 將經緯度轉換為畫布像素座標
      const pos = myMap.latLngToPixel(station.lat, station.lon);
      
      // 繪製測站點
      let rainVal = parseFloat(station.nowRain);
      noStroke();
      
      if (rainVal > 0) {
        fill(0, 100, 255, 180); // 有雨：藍色
        ellipse(pos.x, pos.y, 10 + rainVal * 2, 10 + rainVal * 2);
      } else {
        fill(100, 100, 100, 150); // 無雨：灰色
        ellipse(pos.x, pos.y, 10, 10);
      }

      // 判斷滑鼠是否懸停在圓點上 (距離小於圓點半徑)
      let d = dist(mouseX, mouseY, pos.x, pos.y);
      if (d < 15) {
        hoveredStation = station;
        hoveredStation.px = pos.x;
        hoveredStation.py = pos.y;
      }
    }

    // 最後才繪製 Tooltip，確保它蓋在所有測站點上方
    if (hoveredStation) {
      drawTooltip(hoveredStation);
    }
  } else {
    fill(30, 40, 60);
    textAlign(CENTER, CENTER);
    text("資料載入中或發生錯誤...", width / 2, height / 2);
  }
}

function drawTooltip(s) {
  let padding = 10;
  let info = `測站: ${s.stationName}\n雨量: ${s.nowRain} mm\n更新時間: ${s.nowDate}`;
  
  textSize(14);
  let tw = textWidth(info) + padding * 2;
  let th = 65;

  fill(255, 240); // 半透明白色背景
  stroke(0, 50);
  rect(mouseX + 15, mouseY - 20, tw, th, 5);
  
  fill(0);
  noStroke();
  textAlign(LEFT, TOP);
  text(info, mouseX + 15 + padding, mouseY - 20 + padding);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
