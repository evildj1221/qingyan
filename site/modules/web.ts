// What the site's modules add to the web pages (site/modules/index.ts).
import type { WebModule } from "@aihot/web/modules";
import digestSubscribe from "../../modules/digest-subscribe/web.tsx";
import standardCountdown from "../../modules/standard-countdown/web.tsx";

export const WEB_MODULES: readonly WebModule[] = [digestSubscribe, standardCountdown];
