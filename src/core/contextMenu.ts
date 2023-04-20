import { eventManager } from "./eventManager";
import { Control, MenuId, TriggerEvent } from "../types";
import { SyntheticEvent } from "react";

import { EVENT } from "../constants";

export interface ContextMenu {
  show: <TProps>(params: ShowContextMenuParams<TProps>) => void;
  hideAll: () => void;
  keydown: (event: KeyboardEvent) => void;
  control: (params: { control: Control }) => void;
}

export interface ShowContextMenuParams<TProps = unknown> {
  id: MenuId;
  event?: TriggerEvent;
  props?: TProps;
  position?: {
    x: number;
    y: number;
  } | null;
}

const contextMenu: ContextMenu = {
  show({ event, id, props, position }) {
    if (event?.preventDefault) event.preventDefault();

    eventManager.emit(EVENT.HIDE_ALL).emit(id, {
      event: (event as SyntheticEvent)?.nativeEvent || event,
      props,
      position,
    });
  },
  hideAll() {
    eventManager.emit(EVENT.HIDE_ALL);
  },
  keydown(event: KeyboardEvent) {
    eventManager.emit(EVENT.KEYDOWN, event);
  },
  control(params) {
    eventManager.emit(EVENT.CONTROL, params);
  },
};

export { contextMenu };
