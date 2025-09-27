export type FILE_DATA = {
    path: string,
    name: string
};

export type CONFIG_DATA = {
    target: string,
    directories: string[],
    ignore: string[],
    files?: FILE_DATA[],
    last_checksum: string
};

export type MENU_DATA = {
    id: string;
    parent: string | null;
    name: string;
    message: string;
    choices: MenuChoice[] | (() => MenuChoice[] | Promise<MenuChoice[] | undefined>) | undefined;
};

export type MenuChoice = {
    name: string;
    value: string;
}

export type TreeNode = {
  name: string;
  is_dir: boolean;
  children: TreeNode[];
};
