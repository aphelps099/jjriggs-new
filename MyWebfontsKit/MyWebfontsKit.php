<?php

/*
Plugin Name: MyWebfontsKit #702061
Plugin URI: https://www.monotype.com
Description: Monotype WordPress Plugin
Version: 0.1
Author: Monotype Team
Author URI: https://www.monotype.com
*/

if ( version_compare( PHP_VERSION, '5.4.0', '<') ) {
    die("Cannot activate Monotype plugin because your PHP version is out of date. <br />Please use at least PHP 5.4 (currently using ".PHP_VERSION.") with the Monotype WordPress plugin.");
}

require_once('installer.inc');
if(is_admin()) {require_once( 'mt-options.inc' ); }
add_action( 'admin_init', array('MonotypeInstaller_702061','checkInstallation'));
add_action( 'wp_enqueue_scripts', array('MonotypeInstaller_702061','monotype_loadupWebfonts' ));
