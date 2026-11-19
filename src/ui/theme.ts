/**
 * Light/dark mode, same approach as the portfolio. The visitor's own choice wins,
 * then the device setting. The inline script runs before the first paint, so the
 * page never flashes the wrong theme.
 */

export const MODE_STORAGE_KEY = "games-mode";

export const THEME_SCRIPT = `(function(){try{var d=document.documentElement,s=null;try{s=localStorage.getItem("${MODE_STORAGE_KEY}")}catch(e){}var m=s==="light"||s==="dark"?s:(window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");d.setAttribute("data-mode",m);d.style.colorScheme=m}catch(e){}})()`;
