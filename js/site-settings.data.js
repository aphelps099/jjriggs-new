// Site-wide appearance settings, editable from /admin (Site appearance card)
// and published live through the same allowlisted pipeline as inventory data.
// Loaded on every page BEFORE header.js so the header renders in the right
// theme on first paint (no flash).
//   headerTheme: "dark"  = current look (transparent over hero, dark on scroll)
//                "white" = white bg + black text from the top, like the old
//                          jjriggsequipment.com header (sticky stays white too)
window.JJ_SITE_SETTINGS={"headerTheme":"dark"};
