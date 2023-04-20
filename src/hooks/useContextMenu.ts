import { contextMenu, ShowContextMenuParams } from "../core";
import { Control, MenuId } from "../types";

export interface UseContextMenuParams<TProps = unknown> {
  id: MenuId;
  props?: TProps;
}

type MakeOptional<Type, Key extends keyof Type> = Omit<Type, Key> &
  Partial<Pick<Type, Key>>;

export function useContextMenu<TProps>(params: UseContextMenuParams<TProps>): {
  show: (params: MakeOptional<ShowContextMenuParams, "id">) => void;
  hideAll: () => void;
  control: (params: { control: Control }) => void;
};

export function useContextMenu<TProps>(
  params?: Partial<UseContextMenuParams<TProps>>
): {
  show: (params: ShowContextMenuParams) => void;
  hideAll: () => void;
};

export function useContextMenu(
  props?: UseContextMenuParams | Partial<UseContextMenuParams>
) {
  return {
    show(params: ShowContextMenuParams) {
      contextMenu.show({
        ...props,
        ...params,
      });
    },
    hideAll() {
      contextMenu.hideAll();
    },
    control(params: { control: Control }) {
      contextMenu.control(params);
    },
  };
}
