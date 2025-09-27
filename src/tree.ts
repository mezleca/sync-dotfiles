import type { TreeNode } from "./types";

export const build_tree = (files: { path: string; name: string }[]): TreeNode => {
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

export const print_tree = (node: TreeNode, prefix = "", is_last = true) => {
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