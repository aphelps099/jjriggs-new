#!/bin/bash
# Downloads all TYM model images into img/tym-tractors/ with clean, sheet-ready names.
# Run from the jjriggs-new folder:  bash tools/fetch-tym-images.sh
cd "$(dirname "$0")/../img/tym-tractors" || exit 1
dl(){ curl -sfL -o "$1" "$2" && echo "OK   $1" || echo "FAIL $1  <- $2"; }
dl tym-t224.png     "https://jjriggsequipment.com/wp-content/uploads/2024/10/tractor-featuredimage-t224-1400px-v4.png"
dl tym-t3025h.png   "https://jjriggsequipment.com/wp-content/uploads/2026/01/3025-1.png"
dl tym-t3025ch.png  "https://jjriggsequipment.com/wp-content/uploads/2026/01/t3025c_featureimage.png"
dl tym-t474h.png    "https://jjriggsequipment.com/wp-content/uploads/2024/10/t474_t475_featuredimage.png"
dl tym-t474ch.png   "https://jjriggsequipment.com/wp-content/uploads/2024/10/tym_t474c_featuredimage_v2.png"
dl tym-t494h.png    "https://jjriggsequipment.com/wp-content/uploads/2024/10/tym_t494_t574_featuredimage_v2.png"
dl tym-t494ch.png   "https://jjriggsequipment.com/wp-content/uploads/2024/10/t494_t495_t574_t575_featuredimage.png"
dl tym-t574h.png    "https://jjriggsequipment.com/wp-content/uploads/2024/10/tym_t494_t574_featuredimage_v2-1.png"
dl tym-t574ch.png   "https://jjriggsequipment.com/wp-content/uploads/2024/10/t494_t495_t574_t575_featuredimage-1.png"
dl tym-t4058p.png   "https://jjriggsequipment.com/wp-content/uploads/2026/01/4058-tym-2515_3015_3515_4215_4815_frontleft_optimized.png"
dl tym-t4058pc.png  "https://jjriggsequipment.com/wp-content/uploads/2026/01/t4058pc_360image_1.png"
dl tym-t5075.png    "https://jjriggsequipment.com/wp-content/uploads/2026/01/t5075_features-image-shadow_optimized_v2.png"
dl tym-t115.png     "https://jjriggsequipment.com/wp-content/uploads/2024/10/tym_130na_featureimage_v3.png"
dl tym-t130.png     "https://jjriggsequipment.com/wp-content/uploads/2024/10/tym_130na_featureimage_v3.png"
echo; echo "Done. tym-t2025.jpeg was added manually and is already in place."
