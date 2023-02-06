//https://stackoverflow.com/questions/11100821/javascript-regex-for-validating-filenames
export const WIN_REGEX= new RegExp('^(con|prn|aux|nul|com[0-9]|lpt[0-9])$|([<>:"\\/\\\\|?*])|(\\.|\\s)$/ig')
export const WIN_SYMBOL_REGEX = new RegExp('([<>:"\/\\|?*])|(\.|\s)$/g')
export const WIN_RESERVE_REGEX = new RegExp('^(con|prn|aux|nul|com[0-9]|lpt[0-9])$')
