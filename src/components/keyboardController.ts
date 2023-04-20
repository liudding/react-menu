import { ItemTracker, ItemTrackerRecord } from "../hooks";
import { CssClass } from "../constants";

interface Menu<T = ItemTrackerRecord> {
  items: T[];
  isRoot: boolean;
  focusedIndex: number;
  parentNode: HTMLElement;
}

export function createKeyboardController(virtalFocus: boolean = false) {
  const menuList = new Map<HTMLElement, Menu>();
  let focusedIndex: number;
  let prevFocusedIndex: number;
  let parentNode: HTMLElement;
  let isRoot: boolean;
  let currentItems: ItemTrackerRecord[];
  let forceCloseSubmenu = false;

  function init(rootMenu: ItemTracker) {
    currentItems = Array.from(rootMenu.values());
    prevFocusedIndex = -1;
    focusedIndex = -1;
    isRoot = true;
  }

  function focusSelectedItem() {
    if (virtalFocus) {
      defocusPreviousItem();
      prevFocusedIndex = focusedIndex;
    }

    if (virtalFocus) {
      currentItems[focusedIndex].node.classList.add("focused");
    } else {
      currentItems[focusedIndex].node.focus();
    }
  }

  function defocusPreviousItem() {
    if (prevFocusedIndex >= 0 && currentItems[prevFocusedIndex]) {
      currentItems[prevFocusedIndex].node.classList.remove("focused");
    }
  }

  function focusItem(node: HTMLElement) {
    let index = currentItems.findIndex((item) => item.node === node);
    let item = currentItems[index];
    let toParent = false;
    console.log(currentItems, index, item, node);

    // 不在同一级菜单（从子集菜单，移动到了父级），或者要 focus 的 item 不是 submenu
    // 则关闭 submenu

    //
    // - 不在同一级菜单（从子菜单，移动到了父级)
    // - disabled
    if (index < 0) {
      // 判断是不是 disabled item，如果是，则忽略
      const parent = menuList.get(parentNode);
      if (!parent) return;

      index = parent.items.findIndex((item) => item.node === node);
      if (index < 0) return;

      toParent = true;
      item = currentItems[index];
    }

    const prevItem = currentItems[focusedIndex];
    if (toParent || prevItem?.isSubmenu) {
      closeSubmenu();
    }

    focusedIndex = index;
    focusSelectedItem();

    if (item?.isSubmenu) {
      openSubmenu();
    }
  }

  const isSubmenuFocused = () =>
    focusedIndex >= 0 && currentItems[focusedIndex].isSubmenu;

  const getSubmenuItems = () =>
    Array.from(currentItems[focusedIndex].submenuRefTracker!.values());

  function isFocused() {
    if (focusedIndex === -1) {
      // focus first item
      moveDown();
      return false;
    }

    return true;
  }

  function moveDown() {
    if (focusedIndex + 1 < currentItems.length) {
      focusedIndex++;
    } else if (focusedIndex + 1 === currentItems.length) {
      focusedIndex = 0;
    }

    if (forceCloseSubmenu) closeSubmenu();

    focusSelectedItem();
  }

  function moveUp() {
    if (focusedIndex === -1 || focusedIndex === 0) {
      focusedIndex = currentItems.length - 1;
    } else if (focusedIndex - 1 < currentItems.length) {
      focusedIndex--;
    }

    if (forceCloseSubmenu) closeSubmenu();

    focusSelectedItem();
  }

  function openSubmenu() {
    if (isFocused() && isSubmenuFocused()) {
      const submenuItems = getSubmenuItems();
      const { node, setSubmenuPosition } = currentItems[focusedIndex];

      menuList.set(node, {
        isRoot,
        focusedIndex,
        parentNode: parentNode || node,
        items: currentItems,
      });

      setSubmenuPosition!();
      node.classList.add(CssClass.submenuOpen);
      parentNode = node;

      if (submenuItems.length > 0) {
        focusedIndex = 0;
        currentItems = submenuItems;
      } else {
        forceCloseSubmenu = true;
      }

      isRoot = false;

      focusSelectedItem();
      return true;
    }
    return false;
  }

  function closeSubmenu() {
    if (isFocused() && !isRoot) {
      defocusPreviousItem();

      const parent = menuList.get(parentNode)!;

      parentNode!.classList.remove(CssClass.submenuOpen);
      currentItems = parent.items;
      parentNode = parent.parentNode;

      if (parent.isRoot) {
        isRoot = true;
        menuList.clear();
      }

      if (!forceCloseSubmenu) {
        focusedIndex = parent.focusedIndex;
        focusSelectedItem();
      }
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
    openSubmenu,
    closeSubmenu,
    focusItem,
    matchKeys,
  };
}
