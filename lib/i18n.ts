"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { Lang } from "./types";

// The interface language. Arabic is the default; the visitor's choice is
// remembered in the browser. Text is written inline at the point of use,
// both languages side by side — t("عربي", "English") — rather than through
// a dictionary of keys, so each screen's wording stays readable in place.

const STORAGE_KEY = "smart-tourism-lang";
const CHANGE_EVENT = "smart-tourism-lang-change";

// Used when the browser refuses localStorage (e.g. private mode).
let fallback: Lang = "ar";

function readLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "ar";
  } catch {
    return fallback;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function setLang(lang: Lang) {
  fallback = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Kept in `fallback` for this visit.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useLang() {
  // The server always renders Arabic; a visitor who chose English sees the
  // switch right after the page loads.
  const lang = useSyncExternalStore(subscribe, readLang, (): Lang => "ar");
  const t = useCallback(<T,>(ar: T, en: T): T => (lang === "en" ? en : ar), [lang]);
  return { lang, t };
}

// Keeps the document's language and text direction in step with the
// chosen language (Arabic reads right-to-left, English left-to-right).
export function LangSync() {
  const { lang } = useLang();
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  return null;
}
