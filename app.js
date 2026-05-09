const destinations = normalizeDestinations(window.TRAVEL_DESTINATION_CONFIG);
const appConfig = window.TRAVEL_DESTINATION_CONFIG;

const state = {
  activeId: null,
  lastRandomId: null,
  activeDestination: null,
  currentSeason: getCurrentSeason(new Date()),
  todayLabel: formatToday(new Date())
};

const provinceFilter = document.querySelector("#provinceFilter");
const regionFilter = document.querySelector("#regionFilter");
const moodFilter = document.querySelector("#moodFilter");
const seasonFilter = document.querySelector("#seasonFilter");
const currentSeasonFilter = document.querySelector("#currentSeasonFilter");
const quietFilter = document.querySelector("#quietFilter");
const randomButton = document.querySelector("#randomButton");
const resetButton = document.querySelector("#resetButton");
const destinationList = document.querySelector("#destinationList");
const poolCount = document.querySelector("#poolCount");
const todayChip = document.querySelector("#todayChip");
const posterButton = document.querySelector("#posterButton");
const copyShareButton = document.querySelector("#copyShareButton");
const copyPosterTextButton = document.querySelector("#copyPosterTextButton");
const posterModal = document.querySelector("#posterModal");
const posterCanvas = document.querySelector("#posterCanvas");
const closePosterButton = document.querySelector("#closePosterButton");
const downloadPosterButton = document.querySelector("#downloadPosterButton");
const shareToast = document.querySelector("#shareToast");
const contributeLink = document.querySelector("#contributeLink");

function normalizeDestinations(config) {
  if (!config || !Array.isArray(config.provinces)) {
    throw new Error("目的地配置未加载，请检查 data/destinations.config.js");
  }

  return config.provinces.flatMap((provinceConfig) =>
    provinceConfig.destinations.map((item, index) => ({
      id: item.id || `${provinceConfig.code}-${index + 1}`,
      name: item.name,
      level: item.level || "县城/乡镇级",
      province: provinceConfig.name,
      region: provinceConfig.region,
      city: item.city || "",
      mood: item.mood || provinceConfig.defaultMood || ["低强度放空"],
      seasons: item.seasons || provinceConfig.defaultSeasons || ["春季", "夏季", "秋季"],
      quiet: Boolean(item.quiet),
      days: item.days || "2天",
      pace: item.pace || "轻松",
      budget: item.budget || "中等",
      summary: item.summary,
      resources: item.resources || [item.resource],
      reasons: item.reasons || [item.reason],
      route: item.route,
      transport: item.transport || provinceConfig.transport,
      sources: item.sources || provinceConfig.sources || []
    }))
  );
}

function getCurrentSeason(date) {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return "春季";
  if (month >= 6 && month <= 8) return "夏季";
  if (month >= 9 && month <= 11) return "秋季";
  return "冬季";
}

function formatToday(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(date);
}

function getEffectiveSeason() {
  if (currentSeasonFilter.checked) return state.currentSeason;
  return seasonFilter.value;
}

function getCurrentSeasonDestinations() {
  return destinations.filter((item) => item.seasons.includes(state.currentSeason));
}

function syncSeasonControl() {
  seasonFilter.disabled = currentSeasonFilter.checked;
  if (currentSeasonFilter.checked) seasonFilter.value = state.currentSeason;
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function addOptions(select, values) {
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function getFilteredDestinations() {
  const province = provinceFilter.value;
  const region = regionFilter.value;
  const mood = moodFilter.value;
  const season = getEffectiveSeason();
  const quietOnly = quietFilter.checked;

  return destinations.filter((item) => {
    const provinceMatch = province === "all" || item.province === province;
    const regionMatch = region === "all" || item.region === region;
    const moodMatch = mood === "all" || item.mood.includes(mood);
    const seasonMatch = season === "all" || item.seasons.includes(season);
    const quietMatch = !quietOnly || item.quiet;
    return provinceMatch && regionMatch && moodMatch && seasonMatch && quietMatch;
  });
}

function calculateScore(destination) {
  let score = 82;
  if (provinceFilter.value !== "all" && destination.province === provinceFilter.value) score += 5;
  if (regionFilter.value !== "all" && destination.region === regionFilter.value) score += 4;
  if (moodFilter.value !== "all" && destination.mood.includes(moodFilter.value)) score += 5;
  if (getEffectiveSeason() !== "all" && destination.seasons.includes(getEffectiveSeason())) score += 7;
  if (quietFilter.checked && destination.quiet) score += 4;
  return Math.min(score, 99);
}

function renderFacts(destination) {
  const facts = [
    ["行政层级", destination.level],
    ["适合天数", destination.days],
    ["旅行节奏", destination.pace],
    ["推荐季节", destination.seasons.join(" / ")]
  ];

  document.querySelector("#factsGrid").innerHTML = facts
    .map(([label, value]) => `<div class="fact"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
}

function renderList(items) {
  poolCount.textContent = `${items.length} 个`;
  destinationList.innerHTML = items
    .map(
      (item) => `
        <button class="mini-card ${item.id === state.activeId ? "is-active" : ""}" type="button" data-id="${item.id}">
          <strong>${item.name}</strong>
          <span>${item.province}${item.city ? " · " + item.city : ""} · ${item.mood.slice(0, 2).join(" / ")}</span>
        </button>
      `
    )
    .join("");
}

function renderDestination(destination) {
  state.activeId = destination.id;
  state.activeDestination = destination;
  document.querySelector("#destinationLevel").textContent = `${destination.level}目的地`;
  const seasonalNote = destination.seasons.includes(state.currentSeason)
    ? `当前${state.currentSeason}适宜`
    : `更适合${destination.seasons.join("、")}`;
  document.querySelector("#provinceLine").textContent = `${destination.province}${destination.city ? " · " + destination.city : ""} · ${destination.region} · ${seasonalNote}`;
  document.querySelector("#destinationName").textContent = destination.name;
  document.querySelector("#fitScore").textContent = calculateScore(destination);
  document.querySelector("#destinationSummary").textContent = destination.summary;
  document.querySelector("#resourceList").innerHTML = destination.resources.filter(Boolean).map((item) => `<li>${item}</li>`).join("");
  document.querySelector("#reasonList").innerHTML = destination.reasons.filter(Boolean).map((item) => `<li>${item}</li>`).join("");
  document.querySelector("#routePlan").textContent = destination.route;

  const transportBox = document.querySelector("#transportBox");
  if (destination.transport) {
    transportBox.style.display = "grid";
    document.querySelector("#selfDrivePlan").textContent = destination.transport.selfDrive;
    document.querySelector("#publicTransitPlan").textContent = destination.transport.publicTransit;
  } else {
    transportBox.style.display = "none";
  }

  document.querySelector("#sourceStrip").innerHTML = destination.sources
    .map(([label, url]) => `<a href="${url}" target="_blank" rel="noreferrer">${label}</a>`)
    .join("");
  renderFacts(destination);
  renderList(getFilteredDestinations());
}

function getShareUrl() {
  return window.location.href.split("#")[0];
}

function getShareText(destination = state.activeDestination) {
  if (!destination) return "";
  const reason = destination.reasons.filter(Boolean)[0] || "它很适合短假放松";
  return `我在县镇旅行随机推荐器抽到了：${destination.province} ${destination.name}。\n\n推荐理由：${reason}\n\n打开也抽一个：${getShareUrl()}`;
}

function showToast(message) {
  shareToast.textContent = message;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    shareToast.textContent = "";
  }, 2200);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const chars = String(text).split("");
  const lines = [];
  let line = "";

  chars.forEach((char) => {
    const testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = testLine;
    }
  });
  if (line) lines.push(line);

  lines.slice(0, maxLines).forEach((lineText, index) => {
    const output = index === maxLines - 1 && lines.length > maxLines ? `${lineText.slice(0, -1)}...` : lineText;
    ctx.fillText(output, x, y + index * lineHeight);
  });
  return y + Math.min(lines.length, maxLines) * lineHeight;
}

function drawPosterLandscape(ctx, destination) {
  const tags = `${destination.mood.join(" ")} ${destination.summary}`;
  const isSea = /海|岛|渔|湾|滨/.test(tags);
  const isGrass = /草原|草甸|牧场/.test(tags);
  const isWetland = /湿地|湖|河|江|水/.test(tags);
  const isAncient = /古镇|古城|古村|文化|民俗/.test(tags);

  const gradient = ctx.createLinearGradient(0, 0, 0, 520);
  gradient.addColorStop(0, isSea ? "#7bb8c9" : "#93b9cf");
  gradient.addColorStop(1, isGrass ? "#d8c982" : "#f1d6a2");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 520);

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.beginPath();
  ctx.arc(900, 96, 56, 0, Math.PI * 2);
  ctx.fill();

  if (isSea || isWetland) {
    ctx.fillStyle = isSea ? "#2f8fa0" : "#4d9b85";
    ctx.fillRect(0, 320, 1080, 200);
    ctx.strokeStyle = "rgba(255,255,255,0.58)";
    ctx.lineWidth = 8;
    for (let y = 360; y < 500; y += 38) {
      ctx.beginPath();
      ctx.moveTo(60, y);
      ctx.bezierCurveTo(250, y - 30, 390, y + 30, 570, y);
      ctx.bezierCurveTo(720, y - 22, 840, y + 18, 1020, y - 4);
      ctx.stroke();
    }
  }

  ctx.fillStyle = isGrass ? "#6c9d5a" : "#5d8a76";
  ctx.beginPath();
  ctx.moveTo(0, 350);
  ctx.lineTo(170, 185);
  ctx.lineTo(320, 340);
  ctx.lineTo(510, 130);
  ctx.lineTo(740, 360);
  ctx.lineTo(920, 205);
  ctx.lineTo(1080, 350);
  ctx.lineTo(1080, 520);
  ctx.lineTo(0, 520);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = isGrass ? "#9ab66b" : "#8eb579";
  ctx.beginPath();
  ctx.moveTo(0, 430);
  ctx.bezierCurveTo(210, 360, 410, 450, 590, 390);
  ctx.bezierCurveTo(780, 330, 930, 430, 1080, 370);
  ctx.lineTo(1080, 520);
  ctx.lineTo(0, 520);
  ctx.closePath();
  ctx.fill();

  if (isAncient) {
    ctx.fillStyle = "#8b5e44";
    ctx.fillRect(110, 360, 260, 110);
    ctx.fillStyle = "#5d4639";
    ctx.beginPath();
    ctx.moveTo(80, 360);
    ctx.lineTo(240, 288);
    ctx.lineTo(400, 360);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f4ddbd";
    ctx.fillRect(150, 392, 50, 72);
    ctx.fillRect(242, 392, 70, 42);
  }
}

function drawMiniCode(ctx, x, y, size) {
  ctx.fillStyle = "#fff";
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = "#1f2a2d";
  const cell = size / 11;
  const seed = state.activeDestination.id.length + state.activeDestination.name.length;
  for (let row = 0; row < 11; row += 1) {
    for (let col = 0; col < 11; col += 1) {
      const finder = (row < 3 && col < 3) || (row < 3 && col > 7) || (row > 7 && col < 3);
      if (finder || (row * 7 + col * 11 + seed) % 5 < 2) {
        ctx.fillRect(x + col * cell + 2, y + row * cell + 2, cell - 3, cell - 3);
      }
    }
  }
}

function renderPoster(destination = state.activeDestination) {
  const ctx = posterCanvas.getContext("2d");
  ctx.clearRect(0, 0, posterCanvas.width, posterCanvas.height);
  ctx.fillStyle = "#fffaf2";
  ctx.fillRect(0, 0, 1080, 1440);
  drawPosterLandscape(ctx, destination);

  ctx.fillStyle = "#fffaf2";
  ctx.fillRect(0, 500, 1080, 940);

  ctx.fillStyle = "#2f7d62";
  ctx.font = "700 34px Microsoft YaHei, sans-serif";
  ctx.fillText("我抽到的节假日放松目的地", 72, 590);

  ctx.fillStyle = "#1f2a2d";
  ctx.font = "900 76px Microsoft YaHei, sans-serif";
  wrapText(ctx, destination.name, 72, 690, 820, 88, 2);

  ctx.fillStyle = "#63706c";
  ctx.font = "32px Microsoft YaHei, sans-serif";
  ctx.fillText(`${destination.province}${destination.city ? " · " + destination.city : ""} · ${destination.level}`, 72, 830);

  ctx.fillStyle = "#d66247";
  ctx.font = "700 30px Microsoft YaHei, sans-serif";
  ctx.fillText(`适合：${destination.seasons.join(" / ")} · ${destination.days}`, 72, 890);

  ctx.fillStyle = "#1f2a2d";
  ctx.font = "34px Microsoft YaHei, sans-serif";
  let nextY = wrapText(ctx, destination.summary, 72, 980, 900, 52, 4);

  ctx.fillStyle = "#2f7d62";
  ctx.font = "700 30px Microsoft YaHei, sans-serif";
  ctx.fillText("推介理由", 72, nextY + 44);

  ctx.fillStyle = "#1f2a2d";
  ctx.font = "30px Microsoft YaHei, sans-serif";
  wrapText(ctx, destination.reasons[0], 72, nextY + 96, 770, 46, 3);

  drawMiniCode(ctx, 780, 1142, 190);
  ctx.fillStyle = "#63706c";
  ctx.font = "24px Microsoft YaHei, sans-serif";
  ctx.fillText("分享网址", 72, 1268);
  ctx.fillStyle = "#0d7080";
  ctx.font = "26px Microsoft YaHei, sans-serif";
  wrapText(ctx, getShareUrl(), 72, 1310, 660, 38, 2);

  ctx.fillStyle = "#b8842f";
  ctx.font = "700 24px Microsoft YaHei, sans-serif";
  ctx.fillText("县镇旅行随机推荐器", 72, 1380);
}

function openPoster() {
  renderPoster();
  posterModal.hidden = false;
}

function closePoster() {
  posterModal.hidden = true;
}

function downloadPoster() {
  const link = document.createElement("a");
  link.download = `${state.activeDestination.name}-旅行推荐.png`;
  link.href = posterCanvas.toDataURL("image/png");
  link.click();
}

function chooseRandom() {
  const filtered = getFilteredDestinations();
  const fallback = currentSeasonFilter.checked ? getCurrentSeasonDestinations() : destinations;
  const pool = filtered.length ? filtered : fallback;
  let selected = pool[Math.floor(Math.random() * pool.length)];

  if (pool.length > 1) {
    while (selected.id === state.lastRandomId) {
      selected = pool[Math.floor(Math.random() * pool.length)];
    }
  }

  state.lastRandomId = selected.id;
  renderDestination(selected);
}

function refreshPool() {
  const filtered = getFilteredDestinations();
  renderList(filtered);
  if (!filtered.some((item) => item.id === state.activeId)) {
    const fallback = currentSeasonFilter.checked ? getCurrentSeasonDestinations() : destinations;
    const next = filtered[0] || fallback[0] || destinations[0];
    renderDestination(next);
  } else {
    const active = destinations.find((item) => item.id === state.activeId);
    renderDestination(active);
  }
}

function resetFilters() {
  provinceFilter.value = "all";
  regionFilter.value = "all";
  moodFilter.value = "all";
  seasonFilter.value = state.currentSeason;
  currentSeasonFilter.checked = true;
  quietFilter.checked = false;
  syncSeasonControl();
  const currentSeasonDestinations = getFilteredDestinations();
  renderDestination(currentSeasonDestinations[0] || destinations[0]);
}

function init() {
  contributeLink.href = appConfig.contributionUrl || "https://docs.qq.com/";
  addOptions(provinceFilter, uniqueValues(destinations.map((item) => item.province)));
  addOptions(regionFilter, uniqueValues(destinations.map((item) => item.region)));
  addOptions(moodFilter, uniqueValues(destinations.flatMap((item) => item.mood)));
  addOptions(seasonFilter, uniqueValues(destinations.flatMap((item) => item.seasons)));
  seasonFilter.value = state.currentSeason;
  todayChip.textContent = `${state.todayLabel} · 当前按${state.currentSeason}推荐 · 已维护${uniqueValues(destinations.map((item) => item.province)).length}个省级区域、${destinations.length}个目的地`;

  randomButton.addEventListener("click", chooseRandom);
  resetButton.addEventListener("click", resetFilters);
  posterButton.addEventListener("click", openPoster);
  closePosterButton.addEventListener("click", closePoster);
  downloadPosterButton.addEventListener("click", downloadPoster);
  posterModal.addEventListener("click", (event) => {
    if (event.target === posterModal) closePoster();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !posterModal.hidden) closePoster();
  });
  copyShareButton.addEventListener("click", async () => {
    await copyText(getShareText());
    showToast("分享文案已复制");
  });
  copyPosterTextButton.addEventListener("click", async () => {
    await copyText(getShareText());
    showToast("分享文案已复制");
  });
  [provinceFilter, regionFilter, moodFilter, seasonFilter, currentSeasonFilter, quietFilter].forEach((control) => {
    control.addEventListener("change", refreshPool);
  });

  currentSeasonFilter.addEventListener("change", syncSeasonControl);
  syncSeasonControl();

  destinationList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-id]");
    if (!card) return;
    const destination = destinations.find((item) => item.id === card.dataset.id);
    if (destination) renderDestination(destination);
  });

  const currentSeasonDestinations = getFilteredDestinations();
  renderDestination(currentSeasonDestinations[0] || destinations[0]);
}

init();
