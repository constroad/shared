/**
 * The «Continuar con Google» button as data, so Portal (web) and Dali (web and
 * Lilachat's APK) draw the same one with their own components. Google's
 * branding rules fix the logo colors and the wording; the button itself is
 * white with a gray border (light) or #131314 with a gray border (dark).
 */
export declare const GOOGLE_BUTTON_LABELS: {
    /** Connecting a mailbox to an app that already has a session. */
    readonly connect: "Continuar con Google";
    /** Signing in. */
    readonly signIn: "Acceder con Google";
};
/** The four-color «G», 48×48. Its colors are Google's and do not follow the company theme. */
export declare const GOOGLE_G_LOGO: {
    readonly viewBox: "0 0 48 48";
    readonly paths: readonly [{
        readonly fill: "#EA4335";
        readonly d: "M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z";
    }, {
        readonly fill: "#4285F4";
        readonly d: "M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z";
    }, {
        readonly fill: "#FBBC05";
        readonly d: "M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z";
    }, {
        readonly fill: "#34A853";
        readonly d: "M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z";
    }];
};
export declare const googleLogoSvg: (size?: number) => string;
