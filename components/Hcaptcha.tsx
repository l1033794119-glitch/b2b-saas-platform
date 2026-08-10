"use client";

import * as React from "react";

/**
 * 轻量级 hCaptcha 组件（不依赖第三方 npm 包，直接加载官方脚本）
 * 文档: https://docs.hcaptcha.com/invisible/#reference
 *
 * 用法:
 *   const captchaRef = useRef<HcaptchaHandle>(null);
 *   <Hcaptcha
 *     ref={captchaRef}
 *     sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || "10000000-ffff-ffff-ffff-000000000001"}
 *     onVerify={(token) => setCaptchaToken(token)}
 *     onExpire={() => setCaptchaToken(null)}
 *   />
 *   // 重置:
 *   captchaRef.current?.reset();
 */

declare global {
  interface Window {
    hcaptcha?: any;
    __hcaptchaOnload?: () => void;
  }
}

const SCRIPT_SRC =
  "https://js.hcaptcha.com/1/api.js?onload=__hcaptchaOnload&render=explicit";

let onloadPromise: Promise<void> | null = null;

function loadHcaptchaScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.hcaptcha) return Promise.resolve();
  if (onloadPromise) return onloadPromise;

  onloadPromise = new Promise<void>((resolve) => {
    window.__hcaptchaOnload = () => resolve();

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src^="https://js.hcaptcha.com"]`
    );
    if (existing) {
      if (window.hcaptcha) resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });

  return onloadPromise;
}

export interface HcaptchaHandle {
  reset: () => void;
}

interface HcaptchaProps {
  sitekey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (err: string) => void;
  theme?: "light" | "dark";
  size?: "normal" | "compact" | "invisible";
  language?: string;
}

export const Hcaptcha = React.forwardRef<HcaptchaHandle, HcaptchaProps>(
  function Hcaptcha(props, ref) {
    const {
      sitekey,
      onVerify,
      onExpire,
      onError,
      theme = "light",
      size = "normal",
      language,
    } = props;

    const containerRef = React.useRef<HTMLDivElement>(null);
    const widgetIdRef = React.useRef<string | null>(null);

    React.useEffect(() => {
      let cancelled = false;

      loadHcaptchaScript().then(() => {
        if (cancelled || !containerRef.current || !window.hcaptcha) return;

        try {
          widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
            sitekey,
            theme,
            size,
            languageoverride: language,
            callback: (token: string) => onVerify(token),
            "expired-callback": () => onExpire?.(),
            "error-callback": (err: string) => onError?.(err),
          });
        } catch {
          /* 已渲染过等异常，忽略 */
        }
      });

      return () => {
        cancelled = true;
        try {
          if (widgetIdRef.current && window.hcaptcha) {
            window.hcaptcha.remove(widgetIdRef.current);
            widgetIdRef.current = null;
          }
        } catch {}
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sitekey]);

    React.useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          try {
            if (widgetIdRef.current && window.hcaptcha) {
              window.hcaptcha.reset(widgetIdRef.current);
            }
          } catch {}
        },
      }),
      []
    );

    return <div ref={containerRef} className="hcaptcha-container" />;
  }
);
