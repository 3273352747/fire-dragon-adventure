(() => {
  "use strict";

  const canvas = document.querySelector("#unity-canvas");
  const loadingBar = document.querySelector("#unity-loading-bar");
  const progressBar = document.querySelector("#unity-progress-bar-full");
  const fullscreenButton = document.querySelector("#unity-fullscreen-button");
  const warningBanner = document.querySelector("#unity-warning");

  function showBanner(message, type) {
    const notice = document.createElement("div");
    notice.textContent = String(message);
    notice.style.cssText = "padding: 10px; background: " +
      (type === "error" ? "#ffc7c7" : "#fff0b3");
    warningBanner.appendChild(notice);
    warningBanner.style.display = "block";
    if (type !== "error") {
      setTimeout(() => {
        notice.remove();
        warningBanner.style.display = warningBanner.children.length ? "block" : "none";
      }, 5000);
    }
  }

  function fail(error) {
    loadingBar.style.display = "none";
    showBanner("游戏加载失败，请刷新重试。详情：" + (error.message || error), "error");
    console.error(error);
  }

  async function start() {
    loadingBar.style.display = "block";
    const response = await fetch("web/build-config.json");
    if (!response.ok) throw new Error("配置加载失败 (HTTP " + response.status + ")");
    const { loaderUrl, ...config } = await response.json();
    config.showBanner = showBanner;

    const loader = document.createElement("script");
    loader.src = loaderUrl;
    await new Promise((resolve, reject) => {
      loader.onload = resolve;
      loader.onerror = () => reject(new Error("Unity 加载脚本无法下载"));
      document.body.appendChild(loader);
    });

    const instance = await createUnityInstance(canvas, config, (progress) => {
      progressBar.style.width = (Math.min(1, Math.max(0, progress)) * 100) + "%";
    });
    loadingBar.style.display = "none";
    fullscreenButton.onclick = () => instance.SetFullscreen(1);
    canvas.focus();
  }

  start().catch(fail);
})();
