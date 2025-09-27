import { menu_data, show_menu } from "./cli";
import { config, get_config_data, list_config_files, move_config_files, update_config_files } from "./config/config";
import { get_commit_list, list_git_commits } from "./git/git";

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
        { name: "commit history", value: "list_commits" },
        { name: "← back", value: "back" }
    ]
});

menu_data.set("list_commits", {
    id: "list_commits",
    parent: "files",
    name: "commit list",
    message: "commit list:",
    choices: () => get_commit_list(config.target)
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

// menu actions
const handle_action = async (action: string) => {
    switch (action) {
        case "update_dotfiles":
            await update_config_files();
            await move_config_files();
            break;
        case "list_files":
            await list_config_files();
            break;
        case "delete_file":
            break;
        case "list_commits":
            await list_git_commits(config.target);
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
    get_config_data();
    await update_config_files();

    // start cli loop
    await show_menu((action: string) => handle_action(action));

    console.log("exiting...");
})();