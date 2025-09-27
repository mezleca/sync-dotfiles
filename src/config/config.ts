import fs from "fs";
import os from "os";
import path from "path";

import { $, Glob } from "bun";
import type { CONFIG_DATA, FILE_DATA } from "../types";
import { wait_for_input } from "../cli";
import { build_tree, print_tree } from "../tree";
import { DEFAULT_CONFIG } from "./default";

const config_dir = path.resolve(process.cwd(), "dot.config.json");

export const get_config_data = () => {
    if (!fs.existsSync(config_dir)) {
        fs.writeFileSync(config_dir, JSON.stringify(DEFAULT_CONFIG, null, 4), "utf-8");
    }

    const data: CONFIG_DATA = JSON.parse(fs.readFileSync(config_dir, "utf-8"));

    if (!data.target || data.target == "") {
        throw new Error("config: missing target");
    }

    if (!fs.existsSync(data.target)) {
        console.warn("config: target location does not exist");
    }

    config = data;
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
export const scan_directory = async (dir_path: string) => {
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

export const list_config_files = async () => {
    if (!config.files || config.files.length == 0) {
        console.log("no files to list ;-;");
    } else {
        const tree = build_tree(config.files as { path: string; name: string }[]);
        print_tree(tree);
        wait_for_input();
    }
};

export const update_config_files = async () => {
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

export const save_config = () => {
    const config_ref = config;

    // we dont need this
    if (config_ref.files) delete config_ref.files;

    fs.writeFileSync(config_dir, JSON.stringify(config, null, 4));
};

export const move_config_files = async () => {
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

export let config: CONFIG_DATA = DEFAULT_CONFIG;