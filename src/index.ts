import fs from "fs";
import os from "os";
import path from "path";

import { menu_data, show_menu, wait_for_input } from "./cli";
import { $, Glob } from "bun";
import type { CONFIG_DATA, FILE_DATA, TreeNode } from "./types";

let config: CONFIG_DATA;
const config_dir = path.resolve(process.cwd(), "dot.config.json");

export const DEFAULT_CONFIG: CONFIG_DATA = {
    "target": "",
    "last_checksum": "",
    "directories": [
        ".config/alacritty",
        ".config/hypr",
        ".config/i3", 
        ".config/nvim",
        ".config/polybar",
        ".config/tofi",
        ".config/waybar",
        ".config/dunst",
        ".config/compfy",
        ".config/rofi",
        ".config/kitty",
        ".config/tmux",
        ".config/zsh",
        ".config/fish",
        ".config/starship",
        ".config/git",
        ".config/gtk-3.0",
        ".bashrc",
        ".zshrc",
        ".vimrc",
        ".xinitrc",
        ".xprofile"
    ],
    "ignore": [
        "**/.env",
        "**/.env.local", 
        "**/.env.production",
        "**/.env.development",
        "**/id_rsa",
        "**/id_ed25519", 
        "**/*.pem",
        "**/*.key",
        "**/secrets.json",
        "**/auth.json",
        "**/.authinfo",
        "**/cache/**",
        "**/Cache/**", 
        "**/tmp/**",
        "**/temp/**",
        "**/.cache/**",
        "**/node_modules/**",
        "**/__pycache__/**",
        "**/.pytest_cache/**",
        "**/*.log",
        "**/logs/**",
        "**/*.db",
        "**/*.sqlite",
        "**/*.sqlite3",
        "**/*.o",
        "**/*.so", 
        "**/*.dylib",
        "**/.git/**"
    ]
};

const get_config_data = () => {
    if (!fs.existsSync(config_dir)) {
        console.log("creating config file at:", config_dir);
        fs.writeFileSync(config_dir, JSON.stringify(DEFAULT_CONFIG, null, 4), "utf-8");
        return DEFAULT_CONFIG;
    }

    const data: CONFIG_DATA = JSON.parse(fs.readFileSync(config_dir, "utf-8"));

    if (!data.target || data.target == "") {
        throw new Error("config: missing target");
    }

    if (!fs.existsSync(data.target)) {
        console.warn("config: target location does not exist");
    }

    return data;
};

// check if a file should be ignored
const should_ignore_file = (file_path: string) => {
    for (const pattern of config.ignore) {
        const glob = new Glob(pattern);
        if (glob.match(file_path)) {
            return true;
        }
    }
    return false;
};

// scan directory and filter ignored files
const scan_directory= async (dir_path: string) => {
    const glob = new Glob("**/*");
    const files: FILE_DATA[] = [];

    if (!fs.existsSync(dir_path)) {
        return files;
    }

    const is_dir = fs.lstatSync(dir_path).isDirectory();

    if (is_dir) {
        for await (const file of glob.scan({ cwd: dir_path, dot: true, onlyFiles: true })) {
            if (!should_ignore_file(file)) {
                files.push({ path: path.resolve(dir_path, path.dirname(file)), name: path.basename(file) });
            }
        }
    } else {
        if (!should_ignore_file(dir_path)) {
            files.push({ path: path.dirname(dir_path), name: path.basename(dir_path) });
        }
    }
    
    return files;
};

menu_data.set("main", {
    id: "main",
    parent: null,
    name: "main menu",
    message: "options:",
    choices: [
        { name: "dotfiles", value: "files" },
        { name: "config", value: "config" },
        { name: "exit", value: "exit" }
    ]
});

menu_data.set("files", {
    id: "files",
    parent: "main",
    name: "manage dotfiles",
    message: "options:",
    choices: [
        { name: "update", value: "update_dotfiles" },
        { name: "list files", value: "list_files" },
        { name: "← back", value: "back" }
    ]
});

menu_data.set("config", {
    id: "config",
    parent: "main",
    name: "config",
    message: "options:",
    choices: [
        { name: "set target", value: "set_target" },
        { name: "add directory", value: "manage_dirs" },
        { name: "remove directory", value: "remove_directory" },
        { name: "← back", value: "back" }
    ]
});

const build_tree = (files: { path: string; name: string }[]): TreeNode => {
    const root: TreeNode = { name: "", is_dir: true, children: [] };
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;

        const full_path = `${file.path}/${file.name}`.replace(/\/+/g, "/");
        const parts = full_path.split("/").filter(p => p.length > 0);
        
        let current = root;
        
        // navigate/create directories
        for (let j = 0; j < parts.length - 1; j++) {
            const part = parts[j];
            if (!part) continue;
            let found = false;
            
            for (let k = 0; k < current.children.length; k++) {
                const child = current.children[k];
                if (!child) continue;
                if (child.name == part && child.is_dir) {
                    current = child;
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                const new_dir: TreeNode = { name: part, is_dir: true, children: [] };
                current.children.push(new_dir);
                current = new_dir;
            }
        }
        
        // add file
        const file_name = parts[parts.length - 1];
        if (file_name) {
            current.children.push({ name: file_name, is_dir: false, children: [] });
        }
    }
    
    return root;
};

const print_tree = (node: TreeNode, prefix = "", is_last = true) => {
    if (node.name) {
        const connector = is_last ? "└── " : "├── ";
        const display_name = node.is_dir ? `${node.name}/` : node.name;
        console.log(prefix + connector + display_name);
    }
    
    // sort: dirs first, then alphabetically
    node.children.sort((a, b) => {
        if (a.is_dir != b.is_dir) {
            return a.is_dir ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });
    
    for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (!child) continue;
        const is_child_last = i == node.children.length - 1;
        const new_prefix = node.name ? prefix + (is_last ? "    " : "│   ") : "";
        print_tree(child, new_prefix, is_child_last);
    }
};

const list_dotfiles = async () => {
    if (!config.files || config.files.length == 0) {
        console.log("no files to list ;-;");
    } else {
        const tree = build_tree(config.files as { path: string; name: string }[]);
        print_tree(tree);
        wait_for_input();
    }
};

const update_config_files = async () => {
    console.log("updating files...");
    const files = [];

    for await (const dir of config.directories) {
        const found = await scan_directory(path.resolve(os.homedir(), dir));
        if (found.length > 0) files.push(...found);
    }
    
    if (files.length == 0) {
        console.log("found 0 files ;-; ...");
        await new Promise((r) => setTimeout(r, 1000));
    }

    config.files = files;
};

const save_config = () => {
    const config_ref = config;

    // we dont need this
    if (config_ref.files) delete config_ref.files;

    fs.writeFileSync(config_dir, JSON.stringify(config, null, 4));
};

const update_dotfiles = async () => {
    if (!config.files) {
        console.log("failed to get files...");
        wait_for_input();
        return;
    }

    if (config.target == "") {
        console.log("no target path found on config...");
        wait_for_input();
        return;
    }

    // create path list
    const files = Array.from(new Set(config.files.map((v) => path.resolve(v.path, v.name))));

    // get checksum from all of the files
    const checksum = await $`tar -c --mtime=1970-01-01 ${files} | sha1sum`.text();

    // check if something changed
    if (checksum == config.last_checksum) {
        console.log("0 changes since last update bro");
        wait_for_input();
        return;
    }

    // now that we know ts is different, copy the files to target
    if (!fs.existsSync(config.target)) {
        fs.mkdirSync(config.target, { recursive: true });
    }

    const home = os.homedir();

    for await (const file of config.files) {
        const file_location = path.resolve(file.path, file.name);
        const relative = path.relative(home, file_location);
        const target = path.join(config.target, relative);

        console.log("updating:", target);

        // create recursive folders
        await $`mkdir -p ${path.dirname(target)}`;

        // copy the file
        await $`cp -r ${file_location} ${target}`;
    }
    
    // update config
    config.last_checksum = checksum;
    save_config();

    console.log("\n\n=== updated :3 ===\n\n");

    wait_for_input();
};

// menu actions
const handle_action = async (action: string, config: CONFIG_DATA) => {
    switch (action) {
        case "update_dotfiles":
            // update config files from the directory
            await update_config_files();
            await update_dotfiles();
            break;
        case "list_files":
            await list_dotfiles();
            break;
        case "delete_file":
            break;
        case "set_target":
            break;
        case "manage_dirs":
            break;
        case "remove_directory":
            break;
        default:
            break;
    }
};

(async () => {
    config = get_config_data();

    // update dotfiles list
    await update_config_files();

    // start cli loop
    await show_menu((action: string) => handle_action(action, config));

    console.log("exiting...");
})();