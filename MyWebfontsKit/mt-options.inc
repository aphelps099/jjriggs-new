<?php
// create custom plugin settings menu
add_action("admin_menu", ["MonotypeSettings_702061","addOptionsPage"]);
add_action("admin_init", ["MonotypeSettings_702061","adminInit"]);

class MonotypeSettings_702061
{

	protected static $buildID = 702061;
	protected static $fonts = [
			'{"fontFamily":"TacticSansBld" }'
			];

	public static function addOptionsPage()
	{
		add_theme_page(
			"Monotype Webfont Kit Settings",
			"Monotype Webfonts (".self::$buildID.")",
			"manage_options",
			"mt_settings_page_".self::$buildID,
			[__CLASS__, 'settingsPage']
		);
	}

    public static function adminInit()
	{

		$groupName = "mt_settings_group_".self::$buildID;
		$pageName = "mt_settings_page_".self::$buildID;
		$className = __CLASS__;

		$settingArray = [
							"monotype_site_title_".self::$buildID,
							"monotype_site_desc_".self::$buildID,
							"monotype_post_title_".self::$buildID,
							"monotype_post_body_".self::$buildID
						];

		foreach($settingArray as $setting) {
			register_setting($groupName, $setting, [$className,'sanitizeOption']);
		}

        add_settings_section(
        	'site_section',
        	'Site Settings',
        	[$className,'siteSectionText'],
        	$pageName
        );

        add_settings_section(
        	'post_section',
        	'Post Settings',
        	[$className,'postSectionText'],
        	$pageName
        );

        add_settings_field(
    		'monotype_site_title_'.self::$buildID,
    		'Site Title:',
    		[$className,'addInput'],
    		$pageName,
    		'site_section',
    		'monotype_site_title_'.self::$buildID
		);

		add_settings_field(
    		'monotype_site_desc_'.self::$buildID,
    		'Site Description:',
    		[$className,'addInput'],
    		$pageName,
    		'site_section',
    		'monotype_site_desc_'.self::$buildID
		);

		add_settings_field(
    		'monotype_post_title_'.self::$buildID,
    		'Post Title:',
    		[$className,'addInput'],
    		$pageName,
    		'post_section',
    		'monotype_post_title_'.self::$buildID
		);

		add_settings_field(
    		'monotype_post_body_'.self::$buildID,
    		'Post Body:',
    		[$className,'addInput'],
    		$pageName,
    		'post_section',
    		'monotype_post_body_'.self::$buildID
		);
	}

	public function siteSectionText()
	{
		echo '<p>Webfont changes for top of WordPress pages</p>';
    }

    public function postSectionText()
    {
        echo '<p>Webfont changes for each individual post on WordPress</p>';
    }

    public function addInput($name)
    {
        $option = get_option($name);
        echo "<select name='$name'>";
        echo "<option value='none'>none</option>";

        foreach(self::$fonts as $font) {
			$fontJson = json_decode($font);
			$joined = ''.$fontJson->fontFamily;
			if($fontJson->fontStyle) {
				$joined .= '-'.$fontJson->fontStyle;
			}
			if($fontJson->fontStretch) {
				$joined .= '-'.$fontJson->fontStretch;
			}
			if($fontJson->fontWeight) {
				$joined .= '-'.$fontJson->fontWeight;
			}
            echo "<option value='$font' ".esc_html(selected($option,$font)).">$joined</option>";
        }

        echo "</select>";
    }

    public function sanitizeOption($selection) {
        if(!in_array($selection, self::$fonts) && $selection != "none") {
            return "none";
    } else {
            return $selection;
        }
    }

    public static function settingsPage()
    {
        echo "<img src='".plugins_url('logo.png',__FILE__)."' alt='Monotype'>";
        echo "<h2>WordPress Plugin Build ID# ".esc_html(self::$buildID)."</h2>";

        if( isset($_GET["settings-updated"]) ) {
            echo "<div id='message' class='updated'>";
            echo "<p><strong>Settings saved.</strong></p></div>";
        }

        echo "<form method='post' action='options.php'>";
        settings_fields("mt_settings_group_".self::$buildID);
        do_settings_sections("mt_settings_page_".self::$buildID);
        submit_button();
        echo "</form></div>";
    }
}
