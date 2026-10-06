// Command table for the fake shell.
// SPEC[cmd] = [minArgs, maxArgs, allowedFlags]; "*" accepts anything unchecked.

export const SPEC = {
  help: [0, 0, ""],
  whoami: [0, 0, ""],
  about: [0, 0, ""],
  ls: [0, 1, "la"],
  cd: [0, 1, ""],
  pwd: [0, 0, ""],
  tree: [0, 1, ""],
  cat: [1, 9, ""],
  vim: [1, 1, ""],
  vi: [1, 1, ""],
  less: [1, 1, ""],
  grep: [1, 9, ""],
  "xdg-open": [1, 1, ""],
  mail: [0, 0, ""],
  git: [1, 1, ""],
  history: [0, 0, ""],
  export: [1, 1, ""],
  set: [1, 2, ""],
  clear: [0, 0, ""],
  exit: [0, 0, ""],
  date: [0, 0, ""],
  uname: [0, 0, "a"],
  echo: [0, 99, "*"],
  sudo: [0, 99, "*"],
  "./egg": [0, 0, ""],
  "./app": [0, 1, "*"],
};

export const ALIAS = {
  ":help": "help",
  ":h": "help",
  ":q": "exit",
  ":q!": "exit",
  ":wq": "exit",
  ":x": "exit",
};

export const USAGE = {
  cat: "cat <file…>",
  vim: "vim <file>",
  vi: "vi <file>",
  less: "less <file>",
  grep: "grep <term>",
  "xdg-open": "xdg-open <file>",
  git: "git log",
  export: "export THEME=dark|light",
  set: "set keys [on|off]",
  cd: "cd [dir]",
  ls: "ls [-la] [dir]",
  tree: "tree [dir]",
};

// `help` prints two columns: content commands on the left, shell utilities on the right.
export const HELP = {
  content: [
    ["whoami", "about me, the short version"],
    ["about", "the longer version (about.txt)"],
    ["ls [-la] [dir]", "list files"],
    ["cd [dir]", "change directory (cd .., cd ~)"],
    ["tree [dir]", "directory tree"],
    ["cat <file…>", "print files"],
    ["vim <file>", "open a file in vim (less works too)"],
    ["grep <term>", "search projects"],
    ["xdg-open <file>", "open resume.pdf or a project's links"],
    ["mail", "write me an email"],
    ["git log", "commit activity, last 12 weeks"],
    ["./egg", "cook me an egg (minigame)"],
  ],
  util: [
    ["pwd", "print working directory"],
    ["history", "previous commands"],
    ["export THEME=dark|light", "switch theme"],
    ["set keys on|off", "single-key shortcuts"],
    ["clear", "clear screen (ctrl-l)"],
    ["exit", "back to the gui (ctrl-d)"],
  ],
};

// Terminal-mode bottom bar; typing the digit on an empty prompt runs the command.
export const SHORTCUT_CMDS = [
  "whoami",
  "cat about.txt",
  "ls -la",
  "tree projects",
  "cat experience/*",
  "cat skills/*",
  "cat contact.vcf",
  "xdg-open resume.pdf",
  "./egg",
  "help",
];

export const CMDS = Object.keys(SPEC);

// A prompt as both shells print it (live and in the log): terminal mode names the host.
export const promptText = (variant, cwd) =>
  (variant === "term" ? "danny@portfolio " : "") + cwd + " %";
