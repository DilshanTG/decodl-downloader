export const LANG = {
  en: {
    hero_title: "Sri Lanka's #1 Stock Media Downloader",
    hero_subtitle: "Download from Shutterstock, Freepik, Adobe Stock & more. Pay in LKR.",
    cta_get_started: "Get Started Free",
    cta_buy_credits: "Buy Credits",
    cta_download: "Download",
    nav_pricing: "Pricing",
    nav_dashboard: "Dashboard",
    nav_login: "Login",
    nav_signup: "Sign Up",
    credit_balance: "Credit Balance",
    paste_url: "Paste your stock media URL here...",
    detecting_provider: "Detecting provider...",
    submit_download: "Download Now",
    insufficient_credits: "Insufficient credits",
    insufficient_credits_msg: (need: number, have: number) => `You need ${need} credits but only have ${have.toFixed(1)}. Buy more to continue.`,
    download_submitted: "Download submitted! We'll notify you when it's ready.",
    download_completed: "Download ready!",
    download_failed: "Download failed — credits refunded.",
    err_invalid_url: "Please enter a valid stock media URL.",
    err_provider_not_found: "This provider is not supported yet.",
  },
  si: {
    hero_title: "ශ්‍රී ලංකාවේ #1 Stock Media Downloader",
    hero_subtitle: "Shutterstock, Freepik, Adobe Stock සහ තවත් බොහෝ ස්ථාන වලින් LKR වලින් ගෙවා download කරන්න.",
    cta_get_started: "නොමිලේ ආරම්භ කරන්න",
    cta_buy_credits: "ක්‍රෙඩිට් මිලදී ගන්න",
    cta_download: "Download කරන්න",
    nav_pricing: "මිල ගණන්",
    nav_dashboard: "Dashboard",
    nav_login: "ඇතුල් වන්න",
    nav_signup: "ලියාපදිංචි වන්න",
    credit_balance: "ක්‍රෙඩිට් ශේෂය",
    paste_url: "ඔබේ stock media URL මෙහි paste කරන්න...",
    detecting_provider: "Provider හඳුනාගනිමින්...",
    submit_download: "දැන් Download කරන්න",
    insufficient_credits: "ක්‍රෙඩිට් මදි",
    insufficient_credits_msg: (need: number, have: number) => `ඔබට ${need} ක්‍රෙඩිට් අවශ්‍යයි. ඔබ සතු ඇත්තේ ${have.toFixed(1)} ක් පමණි.`,
    download_submitted: "Download ඉල්ලීම ඉදිරිපත් කෙරිණි!",
    download_completed: "Download සූදානම්!",
    download_failed: "Download අසාර්ථකයි — ක්‍රෙඩිට් ආපසු ලැබිණි.",
    err_invalid_url: "කරුණාකර වලංගු stock media URL ඇතුළත් කරන්න.",
    err_provider_not_found: "මෙම provider තවම සහාය නොදක්වයි.",
  },
}

export type Lang = 'en' | 'si'

export function getLang(): Lang {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('lang') as Lang) || 'en'
  }
  return 'en'
}

export function setLang(lang: Lang) {
  localStorage.setItem('lang', lang)
}

export function t(lang: Lang = 'en') {
  return LANG[lang]
}
