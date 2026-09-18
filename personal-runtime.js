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

export function projectMediaStatement(description) {
  const text = String(description ?? "").trim();
  if (!text) return "";
  return text
    .split(/[，。！？；\n]/u)
    .map(part => part.trim())
    .find(Boolean) ?? "";
}

export function syncProjectMediaLabel(documentObject = document) {
  const details = documentObject.querySelector("#project-details");
  const title = documentObject.querySelector("#project-details-title");
  const description = documentObject.querySelector("#project-details-desc");
  const item = documentObject.querySelector(
    "#project-details-items-move-container .project-details-item",
  );
  if (!title || !item) return null;

  let overlay = item.querySelector(".personal-project-media-overlay");
  if (!overlay) {
    overlay = documentObject.createElement("div");
    overlay.className = "personal-project-media-overlay";
    overlay.setAttribute("aria-hidden", "true");

    const eyebrow = documentObject.createElement("span");
    eyebrow.className = "personal-project-media-overlay-eyebrow";

    const overlayTitle = documentObject.createElement("span");
    overlayTitle.className = "personal-project-media-overlay-title";
    overlay.append(eyebrow, overlayTitle);
    item.append(overlay);
  }

  const eyebrow = overlay.querySelector(".personal-project-media-overlay-eyebrow");
  const overlayTitle = overlay.querySelector(".personal-project-media-overlay-title");
  const tags = Array.from(
    documentObject.querySelectorAll?.("#project-details-side-list-services span") ?? [],
  )
    .map(tag => tag.textContent.trim())
    .filter(Boolean)
    .slice(0, 2);
  const nextEyebrow = tags.length ? tags.join(" · ") : "Morgan · 项目实践";
  const nextTitle = details?.dataset?.personalMediaCaption?.trim()
    || projectMediaStatement(description?.textContent)
    || title.textContent.trim();
  if (eyebrow && eyebrow.textContent !== nextEyebrow) {
    eyebrow.textContent = nextEyebrow;
  }
  if (overlayTitle && overlayTitle.textContent !== nextTitle) {
    overlayTitle.textContent = nextTitle;
  }
  return overlay;
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

function installProjectMediaLabel(documentObject, windowObject) {
  const sync = () => syncProjectMediaLabel(documentObject);
  sync();
  if (!windowObject.MutationObserver || !documentObject.documentElement) return;
  const observer = new windowObject.MutationObserver(sync);
  observer.observe(documentObject.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

function installBrowserRuntime(documentObject, windowObject) {
  const start = () => {
    prepareInitialMusic(documentObject);
    installBrandVisibility(documentObject, windowObject);
    installProjectMediaLabel(documentObject, windowObject);
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
