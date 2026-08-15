export const THEME_STORAGE_KEY = "xradar.theme";

export const THEME_INIT_SCRIPT = `(()=>{try{const t=localStorage.getItem("${THEME_STORAGE_KEY}");const v=t==="light"||t==="dark"?t:"dark";const r=document.documentElement;r.setAttribute("data-theme",v);r.style.colorScheme=v;}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;
