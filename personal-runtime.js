const SOUND_BUTTON_SELECTOR = "#header-right-sound-btn";
const INITIAL_MUSIC_URL = "/assets/audios/generic.ogg";

export function isFirstSceneActive(rect, viewportHeight) {
  if (!rect || viewportHeight <= 0) return false;
  return rect.top >= -viewportHeight * 0.08
    && rect.bottom > viewportHeight * 0.55;
}

export function syncBrandVisibility(brand, firstSceneRect, viewportHeight) {
  if (!brand) return;
  brand.classList.toggle(
    "personal-brand-hidden",
    !isFirstSceneActive(firstSceneRect, viewportHeight),
  );
}

export function prepareInitialMusic(documentObject = document) {
  const existing = documentObject.querySelector("[data-personal-audio-warmup]");
  if (existing) return existing;
  const audio = documentObject.createElement("audio");
  audio.setAttribute("data-personal-audio-warmup", "true");
  audio.setAttribute("aria-hidden", "true");
  audio.preload = "auto";
  audio.src = INITIAL_MUSIC_URL;
  audio.hidden = true;
  documentObject.body.append(audio);
  audio.load();
  return audio;
}

export function createFirstSoundClickGuard(selector = SOUND_BUTTON_SELECTOR) {
  let suppressNextClick = false;
  return {
    onPointerDown(event) {
      if (event.target?.closest?.(selector)) suppressNextClick = true;
    },
    onClick(event) {
      if (!suppressNextClick || !event.target?.closest?.(selector)) return;
      suppressNextClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
  };
}

function installBrandVisibility(documentObject, windowObject) {
  let lastBrand;
  let lastHidden;
  const update = () => {
    const brand = documentObject.querySelector("#header-logo");
    const firstScene = documentObject.querySelector("#page-container .page .section");
    if (brand && firstScene) {
      const hidden = !isFirstSceneActive(
        firstScene.getBoundingClientRect(),
        windowObject.innerHeight,
      );
      if (brand !== lastBrand || hidden !== lastHidden) {
        brand.classList.toggle("personal-brand-hidden", hidden);
        lastBrand = brand;
        lastHidden = hidden;
      }
    }
    windowObject.requestAnimationFrame(update);
  };
  windowObject.requestAnimationFrame(update);
}

function installBrowserRuntime(documentObject, windowObject) {
  const start = () => {
    prepareInitialMusic(documentObject);
    installBrandVisibility(documentObject, windowObject);
    const guard = createFirstSoundClickGuard();
    documentObject.addEventListener("pointerdown", guard.onPointerDown, true);
    documentObject.addEventListener("click", guard.onClick, true);
  };
  if (documentObject.readyState === "loading") {
    documentObject.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  installBrowserRuntime(document, window);
}
