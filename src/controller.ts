import { mountControllerProfileUI } from "@natadecoco/controller-sdk";

/** Development-only UI preview. The production Controller is owned by Platform. */
export async function runControllerPreview(root: HTMLElement): Promise<void> {
  const { createLocalPreviewController } = await import("@natadecoco/controller-sdk/local-dev");
  const slotValue = Number(new URLSearchParams(window.location.search).get("slot") ?? "2");
  const slot = Number.isInteger(slotValue) && slotValue >= 1 && slotValue <= 4 ? slotValue : 2;
  const local = createLocalPreviewController(slot);
  root.style.height = "100dvh";
  root.innerHTML = `<section class="game-controller"><p class="guide">ローカル開発プレビュー</p><div class="control-surface natadecoco-control-surface" aria-label="ゲーム操作"></div></section>`;
  const surface = root.querySelector<HTMLElement>(".control-surface");
  if (!surface) throw new Error("controller surface is missing");
  const controls = mountControllerProfileUI({ element: surface, profile: "directional-pad", disabled: true, onInput: (input) => local.client.sendInput(input) });
  const removeState = local.client.onStateChanged((state) => controls.setDisabled(state.state !== "connected"));
  controls.setDisabled(local.client.getState().state !== "connected");
  window.addEventListener("pagehide", () => { removeState(); controls.destroy(); local.dispose(); }, { once: true });
}
