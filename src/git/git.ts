import fs from "fs";

import { $ } from "bun";
import { wait_for_input } from "../cli";

export const transform_commit_list = (data: string) => {
    const trimmed = data.trim().split("\n").filter((l) => l != "");
    if (!trimmed) return;

   
    let current_commmit: {}[] = [];
    const commits = [];

    for (let i = 0; i < data.length; i++) {
        const line = trimmed[i];
        if (!line) continue;

        let [ key, value, ...rest ] = line.split(" ");

        if (key == "") {
            key = "name";
            value = value?.concat(rest.join(" ")).trim();
        }
        
        if (key?.endsWith(":")) {
            key = key.slice(0, key.length - 1);
        }

        if (key == "Date") {
            value = value?.concat(rest.join(" ")).trim();
        }

        current_commmit.push({ [key as any]: value });

        if (current_commmit.length == 4) {
            commits.push(Object.assign({}, ...current_commmit));
            current_commmit = [];
        }
    }

    return commits;
};

export const get_raw_commit_list = async (repo: string) => {
    const data = await $`cd ${repo} && git log`.text();
    return transform_commit_list(data);
};

export const get_commit_list = async (repo: string) => {
    if (!fs.existsSync(repo)) {
        console.error("target folder dont seem to exist");
        wait_for_input();
        return;
    }

    const data = await get_raw_commit_list(repo);

    if (!data) {
        return;
    }

    const cli_formatted = data.map((c) => ({ name: `(${c.commit}) -> ${c.name}`, value: `${c.name}-${c.commit}`}));
    cli_formatted.unshift({ name: "← back", value: "back" });

    return cli_formatted;
};

export const list_git_commits = async (repo: string) => {
    if (!fs.existsSync(repo)) {
        console.error("target folder dont seem to exist");
        wait_for_input();
        return;
    }

    const list = await get_commit_list(repo);

    if (!list) {
        console.error("failed to get commit list");
        wait_for_input();
        return;
    }

    // @TODO: uhhh, format?
    console.log(list);

    wait_for_input();
};