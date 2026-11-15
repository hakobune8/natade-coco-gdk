import { mountControllerProfileUI, type ControllerUIModuleContextV2, type MountedControllerUIV2 } from "@natadecoco/controller-sdk";
import "./controller-ui.css";

export const controllerUIContractVersion = 2;

/** The same authenticated input facade handles both human and demo input. */
export function mountControllerUI(context: ControllerUIModuleContextV2): MountedControllerUIV2 {
  const { client, element } = context;
  element.innerHTML = '<section class="starter-controller"><p>方向とACTIONで操作</p><div class="control-surface natadecoco-control-surface"></div></section>';
  const surface = element.querySelector<HTMLElement>(".control-surface")!;
  const controls = mountControllerProfileUI({ element: surface, profile: "directional-pad", disabled: true, onInput: input => { if (client.getSyncStatus().state === "ready") client.sendInput(input); } });
  const render = () => controls.setDisabled(client.getSyncStatus().state !== "ready");
  const removeSync = client.onSyncChanged(render);
  render();
  return {
    demo: {
      contractVersion: 1,
      async prepare() { if (client.getSyncStatus().state !== "ready") throw new Error("game is not ready"); },
      async run(context) {
        while (!context.signal.aborted) {
          context.perform(() => client.sendInput({ buttons: { action1: true } }));
          await context.sleep(120);
          context.perform(() => client.sendInput({}));
          await context.sleep(380);
        }
      },
      stop() { if (client.getSyncStatus().state === "ready") client.sendInput({}); }
    },
    onPlatformSnapshot() { render(); },
    destroy() { removeSync(); controls.destroy(); element.replaceChildren(); }
  };
}
