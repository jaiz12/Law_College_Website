/**
 * Runtime configuration for the public site.
 *
 * Mirrors Law_College_UI/public/config.json so both front ends point at the
 * same backend. When this site moves off static HTML, replace this file
 * with a fetch of a served config.json (same pattern the CMS already uses)
 * instead of hardcoding values here.
 */
window.SGLC_CONFIG = {
  API_URL: "https://localhost:7299/api",
  CMS_URL: "http://localhost:4200"
};
