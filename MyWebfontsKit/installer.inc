<?php

class MonotypeInstaller_702061 {

    protected static $buildID = 702061;

    //tell the user we got everything installed, but don't bug 'em
    public static function installWarning()
    {
        echo "<div id='message' class='notice notice-success is-dismissible'>";
        echo "<p>You've installed a Monotype Webfonts Kit for Wordpress.</p>";
        echo "<p>Check out your <a href='themes.php?page=mt_settings_page_".esc_html(self::$buildID)."'>settings</a> to add it to your Wordpress theme!</p>";
        echo "</div>";
    }

    //check if installation is all fine and dandy
    public static function checkInstallation()
    {
        if (!get_option("monotype_install_notice_".self::$buildID) ) {
            add_action("admin_notices", array("MonotypeInstaller_".self::$buildID,"installWarning"));
            update_option("monotype_install_notice_".self::$buildID, "true");
        }
    }

    public static function monotype_loadupWebfonts()
    {
        $css = plugins_url() . "/MyWebfontsKit/MyWebfontsKit.css";
        wp_enqueue_style("monotype_webfonts_".self::$buildID, $css);
        add_action("wp_head", array("MonotypeInstaller_".self::$buildID,"monotype_loadInline"), 100);
    }

    public static function monotype_loadInline()
    {
        $options[".site-title"] = get_option("monotype_site_title_".self::$buildID);
        $options[".site-description"] = get_option("monotype_site_desc_".self::$buildID);
        $options[".entry-title"] = get_option("monotype_post_title_".self::$buildID);
        $options[".entry-content"] = get_option("monotype_post_body_".self::$buildID);
        $data = "<style type='text/css'>";
        foreach ($options as $key => $option) {
            if ($option !== false && $option != "none" && $option != "") {
                $fontJson = json_decode($option);
                $data .= esc_html($key)." {font-family:'".esc_html($fontJson->fontFamily)."';";
                if($fontJson->fontStyle) {
                    $data .= "font-style:".esc_html($fontJson->fontStyle).";";
                }
                if($fontJson->fontStretch) {
                    $data .= "font-stretch:".esc_html($fontJson->fontStretch).";";
                }
                if($fontJson->fontWeight) {
                    $data .= "font-weight:".esc_html($fontJson->fontWeight).";";
                }
                $data .= "} ";
            }
        }
        $data .= "</style>";
        echo $data;
    }
}
