import { CONTROLLER_PATH, DISPLAY_PATH, parseLaunchContext } from "./contract.js";
import { runControllerPreview } from "./controller.js";
import { runDisplay, runDisplayPreview } from "./display.js";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("game root is missing");

async function boot(): Promise<void> {
  const path = window.location.pathname.replace(/\/$/u, "");
  const preview = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("preview") : null;
  if (path === CONTROLLER_PATH) {
    if (preview === "controller") return runControllerPreview(root!);
    window.location.replace("/controller/");
    return;
  }
  if (path !== DISPLAY_PATH) return showError("ゲーム画面ではありません", "ランチャーからゲームを開始してください。");
  if (preview === "display" || preview === "result") return runDisplayPreview(root!, preview === "result");
  const launch = parseLaunchContext(window.location.search);
  if (!launch) returnToLauncher("ゲームを開始できません");
  else try { await runDisplay(root!, launch); } catch { returnToLauncher("ゲームへ接続できません"); }
}

function showError(title: string, message: string): void { root!.innerHTML = `<section class="boot-error"><h1>${title}</h1><p>${message}</p></section>`; }
function returnToLauncher(title: string): void { showError(title, "待機画面へ戻ります。"); window.setTimeout(() => window.location.replace("/launcher/"), 3000); }
void boot();
