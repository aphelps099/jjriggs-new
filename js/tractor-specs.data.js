/* Tractor spec sheets — keyed by "Brand|Model".
   `quick` powers the 2x2 highlight box; `groups` powers the full spec sheet under the image.
   Source: jjriggsequipment.com product pages + TYM Series 1 published specs. */
window.TRACTOR_SPECS = {
  "TYM|T224": {
    quick: [
      ["Engine power", "21.5 HP"],
      ["3-pt lift capacity", "1,100 lb"],
      ["Drive", "4WD"],
      ["Transmission", "Hydrostatic"]
    ],
    groups: [
      { group: "Engine", rows: [
        ["Engine power", "21.5 HP"],
        ["Make", "Yanmar diesel"],
        ["Configuration", "3-cylinder, water-cooled"],
        ["Emissions", "Tier 4"]
      ]},
      { group: "Drivetrain", rows: [
        ["Drive", "4WD"],
        ["Transmission", "Hydrostatic (HST)"],
        ["Steering", "Power"]
      ]},
      { group: "Hitch & PTO", rows: [
        ["3-point lift capacity", "1,100 lb"],
        ["Mid-mount mower", "Up to 54 in"],
        ["PTO control", "Dedicated lever, variable rpm"]
      ]},
      { group: "Operator station", rows: [
        ["Station", "Open, flat floor"],
        ["ROPS", "Foldable"],
        ["Front loader", "Optional, loader-ready"]
      ]}
    ]
  }
};

/* Extra product photos shown in the gallery — keyed by "Brand|Model". */
window.TRACTOR_GALLERY = {
  "TYM|T224": [
    "https://jjriggsequipment.com/wp-content/uploads/2024/10/t224_ld_360_1_front.png",
    "https://jjriggsequipment.com/wp-content/uploads/2024/10/t224_ld_360_2_frontright.png",
    "https://jjriggsequipment.com/wp-content/uploads/2024/10/t224_ld_360_3_right.png",
    "https://jjriggsequipment.com/wp-content/uploads/2024/10/t224_ld_360_4_backright.png",
    "https://jjriggsequipment.com/wp-content/uploads/2024/10/t224_ld_360_5_back.png",
    "https://jjriggsequipment.com/wp-content/uploads/2024/10/t224_ld_360_6_backleft.png",
    "https://jjriggsequipment.com/wp-content/uploads/2024/10/t224_ld_360_7_left.png",
    "https://jjriggsequipment.com/wp-content/uploads/2024/10/t224_ld_360_8_frontleft.png"
  ]
};
