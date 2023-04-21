import { ItemTracker, ItemTrackerRecord } from "../hooks";
import { CssClass } from "../constants";

interface Menu<T = ItemTrackerRecord> {
  items: T[];
  isRoot: boolean;
  focusedIndex: number;
  parentNode: HTMLElement;
}

type Path = ItemTrackerRecord[];
type ItemEntry = [ItemTrackerRecord, Path];

type FocusType = number | "first" | "last";

interface FocusItemOptions {
  openSubmenu?: boolean;
  focusFirstItem?: boolean;
  focus?: FocusType;
}

/**
 * {
 *   Node: {
 *      node: HTMLElement;
 *      isSubmenu: boolean;
 *      submenuRefTracker?: {
 *        SubNode1: {},
 *        GroupNode: {
 *          node: HTMLElement;
 *          isGroup: boolean;
 *          submenuRefTracker?: {
 *            SubNode1: {},
 *            SubNode2: {}
 *          };
 *        }
 *      };
 *   },
 *   GroupNode: {
 *      node: HTMLElement;
 *      isGroup: boolean;
 *      submenuRefTracker?: {
 *        SubNode1: {},
 *        SubNode2: {}
 *      };
 *   }
 *
 * }
 */

export function createController(virtalFocus: boolean = false) {
  const menuList = new Map<HTMLElement, Menu>();
  let focusedIndex: number;
  let prevFocusedIndex: number;
  let focusedPath: Path;
  let parentNode: HTMLElement;
  let isRoot: boolean;
  let currentItems: ItemTrackerRecord[];
  let forceCloseSubmenu = false;
  let rootMenuTracker: ItemTracker;

  function init(rootMenu: ItemTracker) {
    rootMenuTracker = rootMenu;
    // currentItems = Array.from(rootMenu.values()).reduce((carry, item) => {
    //   if (item.isGroup) {
    //     return [...carry, ...item.submenuRefTracker!.values()];
    //   }
    //   carry.push(item);
    //   return carry;
    // }, [] as ItemTrackerRecord[]);
    currentItems = Array.from(rootMenu.values());
    prevFocusedIndex = -1;
    focusedIndex = -1;
    focusedPath = [];
    isRoot = true;
  }

  // function focusSelectedItem() {
  //   if (virtalFocus) {
  //     defocusPreviousItem();
  //     prevFocusedIndex = focusedIndex;
  //   }

  //   setFocusedState(currentItems[focusedIndex].node);
  // }

  // function defocusPreviousItem() {
  //   if (prevFocusedIndex >= 0 && currentItems[prevFocusedIndex]) {
  //     removeFocusedState(currentItems[prevFocusedIndex].node);
  //   }
  // }

  function focusNode(node: HTMLElement) {
    const entry = findTargetItem(node);
    if (!entry) return;
    focusItem(entry[1], { openSubmenu: true, focusFirstItem: false });
    syncFocusedIndex();
  }

  function focusItem(
    path: Path,
    options: FocusItemOptions = {
      openSubmenu: false,
    }
  ) {
    console.log("new focus: ", path, "prev focus: ", focusedPath);

    // 将之前的 focused item 取消 focus 状态
    focusedPath.forEach((i) => {
      if (!path.includes(i)) {
        removeFocusedState(i.node);
        if (i.isSubmenu) setMenuOpenState(i.node, false);
      }
    });

    // 将新的 focused item 设置为 focus 状态
    path.forEach((i) => {
      if (focusedPath.includes(i)) return;
      setFocusedState(i.node);
    });

    focusedPath = path;

    const current = path[path.length - 1];
    if (current.isSubmenu && options.openSubmenu) {
      openSubmenu(path, options.focus === "first" || options.focus === 0);
    }

    if (current.isGroup) {
      moveToGroup(path, options.focus);
    }
  }

  function recursiveFindItem(
    node: HTMLElement,
    itemTracker: ItemTracker,
    path: Path
  ): ItemEntry | undefined {
    let item = itemTracker.get(node);
    if (item) {
      return [item, [...path, item]];
    }

    // TODO: 直接忽略未打开的菜单

    for (let item of itemTracker.values()) {
      if (item.isGroup || item.isSubmenu) {
        const entry = recursiveFindItem(node, item.submenuRefTracker!, [
          ...path,
          item,
        ]);
        if (entry) return entry;
      }
    }
  }

  function findTargetItem(node: HTMLElement): ItemEntry | undefined {
    return recursiveFindItem(node, rootMenuTracker, []);
  }

  function isFocused() {
    return !!focusedPath.length;
  }

  function moveDown() {
    if (focusedPath.length === 0) {
      focusedIndex = -1;
    }

    const parent = focusedPath[focusedPath.length - 2];
    const isGrid = parent && parent.isGroup;

    if (!isGrid) {
      return moveNext();
    }

    const nextIndex = focusedIndex + (parent.groupColumns || 1);

    return moveTo(nextIndex);
  }

  function moveUp() {
    if (focusedPath.length === 0) {
      focusedIndex = currentItems.length;
    }
    const parent = focusedPath[focusedPath.length - 2];
    const isGrid = parent && parent.isGroup;

    if (!isGrid) {
      return movePrev();
    }

    const nextIndex = focusedIndex - (parent.groupColumns || 1);

    return moveTo(nextIndex, { direction: "up", focus: "last" });
  }

  function moveLeft() {
    const current = focusedPath[focusedPath.length - 1];

    if (current.isSubmenu) {
      return closeSubmenu(focusedPath);
    }

    const parent = focusedPath[focusedPath.length - 2];
    if (parent.isSubmenu) {
      return closeSubmenu(focusedPath.slice(0, -1));
    }

    if (!parent) return;

    if (parent.isGroup) {
      return movePrev();
    }
  }

  function moveRight() {
    const current = focusedPath[focusedPath.length - 1];

    if (current.isSubmenu) {
      return openSubmenu(focusedPath, true);
    }

    const parent = focusedPath[focusedPath.length - 2];
    if (!parent) return;

    if (parent.isGroup) {
      return moveNext();
    }
  }

  function moveNext() {
    if (focusedPath.length === 0) {
      focusedIndex = -1;
    }

    return moveTo(focusedIndex + 1);
  }

  function movePrev() {
    if (focusedPath.length === 0) {
      focusedIndex = currentItems.length;
    }

    return moveTo(focusedIndex - 1, { direction: "up", focus: "last" });
  }

  function moveTo(
    to: number,
    options?: { direction: "up" | "down"; focus: FocusType }
  ) {
    if (to < -1) {
      to = -1;
    }

    const nextItem = currentItems[to];
    console.log(currentItems, focusedPath, focusedIndex, nextItem);

    if (!nextItem) {
      const parent = focusedPath[focusedPath.length - 2];
      if (parent && parent.isGroup) {
        // 跳出 group
        const grouPath = focusedPath.slice(0, -1);

        removeFocusedState(focusedPath[focusedPath.length - 1].node);
        moveOutGroup(grouPath);

        if (options?.direction === "up") {
          moveTo(focusedIndex - 1, options);
        } else {
          moveTo(focusedIndex + 1, options);
        }

        return;
      }

      return false;
    }

    const nextPath = focusedPath.slice(0, -1);
    nextPath.push(nextItem);

    focusedIndex = to;

    focusItem(nextPath, options);

    return true;
  }

  function openSubmenu(path: Path, focusFirst: boolean = true) {
    if (!isFocused()) return false;

    // 当前如果为 false，有 bug
    focusFirst = true;

    const item = path[path.length - 1];
    if (!item.isSubmenu) return false;

    item.setSubmenuPosition!();
    setMenuOpenState(item.node, true);

    currentItems = Array.from(item.submenuRefTracker!.values());

    if (focusFirst) {
      const first = item.submenuRefTracker?.values().next().value!;
      focusItem([...path, first]);
      focusedIndex = 0;
    }

    return true;
  }

  function closeSubmenu(path: Path) {
    if (!isFocused()) return false;

    const item = path[path.length - 1];
    if (!item.isSubmenu) return false;

    setMenuOpenState(item.node, false);

    currentItems = getSiblings(path);
    focusedIndex = getItemIndex(item, currentItems);
    focusedPath = path;
  }

  function moveToGroup(path: Path, focus: FocusType = "first") {
    if (path.length === 0) return;
    const group = path[path.length - 1];
    if (!group.isGroup) return;

    currentItems = Array.from(group.submenuRefTracker!.values());

    focusedIndex = getFocusedIndex(currentItems, focus);
    focusItem([...path, currentItems[focusedIndex]]);
  }

  function moveOutGroup(path: Path) {
    if (path.length === 0) return;
    const group = path[path.length - 1];
    if (!group.isGroup) return;

    const siblings = getSiblings(path);

    currentItems = siblings;
    focusedIndex = getItemIndex(group, currentItems);
    focusedPath = path;
  }

  function click() {
    currentItems[focusedIndex].node.click();
  }

  function syncFocusedIndex() {
    focusedIndex = getItemIndex(
      focusedPath[focusedPath.length - 1],
      currentItems
    );
  }

  function getItemIndex(item: ItemTrackerRecord, items: ItemTrackerRecord[]) {
    return items.findIndex((i) => i.node === item.node);
  }

  function getSiblings(path: Path) {
    if (path.length === 0) return Array.from(rootMenuTracker.values());
    const parent = path[path.length - 2];
    if (!parent) return Array.from(rootMenuTracker.values());
    return Array.from(parent.submenuRefTracker!.values());
  }

  function getFocusedIndex(items: ItemTrackerRecord[], focus: FocusType) {
    if (focus === "first") {
      focus = 0;
    } else if (focus === "last") {
      focus = items.length - 1;
    }
    return focus;
  }

  function setFocusedState(node: HTMLElement) {
    if (virtalFocus) {
      node.classList.add("focused");
    } else {
      node.focus();
    }
  }

  function removeFocusedState(node: HTMLElement) {
    if (virtalFocus) {
      node.classList.remove("focused");
    }
  }

  function setMenuOpenState(node: HTMLElement, open: boolean) {
    if (open) {
      node.classList.add(CssClass.submenuOpen);
    } else {
      node.classList.remove(CssClass.submenuOpen);
    }
  }

  function matchKeys(e: KeyboardEvent) {
    // matches shortcut inside submenu as well even when submenu is not open
    // it matches native menu behavior
    function walkAndMatch(items: ItemTrackerRecord[]) {
      for (const item of items) {
        if (item.isSubmenu && item.submenuRefTracker)
          walkAndMatch(Array.from(item.submenuRefTracker.values()));

        item.keyMatcher && item.keyMatcher(e);
      }
    }
    walkAndMatch(currentItems);
  }

  return {
    init,
    moveDown,
    moveUp,
    moveLeft,
    moveRight,
    openSubmenu,
    closeSubmenu,
    focusNode,
    click,
    matchKeys,
  };
}
