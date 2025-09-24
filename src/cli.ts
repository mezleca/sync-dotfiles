import inquirer from "inquirer";
import type { MENU_DATA } from "./types";

export let menu_id = "main";
export const menu_data = new Map<string, MENU_DATA>();

// main menu loop
export const show_menu = async (handle_action: Function) => {
    while (true) {
        const menu = menu_data.get(menu_id);
        
        if (!menu) {
            break;
        }
        
        console.clear();
        console.log(`\n=== ${menu.name} ===\n`);
        
        const { option } = await inquirer.prompt([{
            type: "list",
            name: "option",
            message: menu.message,
            choices: menu.choices
        }]) as { option: string };
        
        // exit :+1:
        if (option == "exit") {
            console.clear();
            break;
        }
        
        if (option == "back" && menu.parent) {
            menu_id = menu.parent;
            continue;
        }
        
        // is it a submenu
        if (menu_data.has(option)) {
            menu_id = option;
            continue;
        }
        
        // handle action
        await handle_action(option, menu);
    }
};

export const wait_for_input = () => {
    prompt("...");
};