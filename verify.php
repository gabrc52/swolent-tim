<?php

//// FOR INTERNATIONAL SERVER /// 

//// TODO: this is mostly copy-paste
//// so turn this into a module of sorts and make the specific verification logic and table parameters for it

/// Debug
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

/// Move GET parameters to a cookie.

/// This is because OAuth says the URL to redirect to "MUST exactly match one
/// of the Redirection URI values for the Client pre-registered at the OpenID Provider"
/// Since it's impossible to register every possible combination, saving them into a
/// cookie is the only solution I can think of to keep the parameters after authentication

/// TODO: A search on stackoverflow says that's what the state parameter is for. Implement that
/// https://stackoverflow.com/questions/55524480/should-dynamic-query-parameters-be-present-in-the-redirection-uri-for-an-oauth2

if (!isset($_SERVER['SSL_CLIENT_S_DN_Email']) && (isset($_GET['id']) || isset($_GET['auth']))) {
    /// I'm checking for cert here so using cert authentication doesn't require having cookies enabled
    if (isset($_GET['id'])) {
        setcookie('id', $_GET['id']);
    }
    if (isset($_GET['auth'])) {
        setcookie('auth', $_GET['auth']);
    }
    header("Location: https://discord2025.mit.edu/verify2026.php");   
}


/// Code to make POST requests, used for OpenID/OAuth
/// Reference: https://www.php.net/manual/en/context.http.php
function post($url, $args) {
	$postdata = http_build_query($args);
	$opts = array('http' => array(
        'method' => 'POST',
        'header' => 'Content-type: application/x-www-form-urlencoded',
        'content' => $postdata
    ));
	$context = stream_context_create($opts);
	return file_get_contents($url, false, $context);
}

/// Constants
require "constants.php";

/// SQL stuff
$connection = mysqli_connect(SQL_HOST, SQL_USERNAME, SQL_PASSWORD, SQL_DB);

/// Discord stuff
require_once "support/sdk_discord.php";
$discord = new DiscordSDK();
$discord->SetAccessInfo("Bot", TOKEN);

/// Get user email
if (isset($_SERVER['SSL_CLIENT_S_DN_Email'])) {
    /// Pure cert authentication (preferred)
    $email = $_SERVER['SSL_CLIENT_S_DN_Email'];

} else if (isset($_GET['code'])) {
    /// OAuth authentication
    $tokenstuff = post('https://oidc.mit.edu/token', array(
        'grant_type' => 'authorization_code',
        'code' => $_GET['code'],
        'redirect_uri' => 'https://discord2025.mit.edu/verify.php',
        'client_id' => OAUTH_ID,
        'client_secret' => OAUTH_SECRET
    ));
    if (!$tokenstuff) {
        /// If unable to get a token, try again
        header("Location: https://discord2025.mit.edu/verify.php");
    }
    $tokenstuff = json_decode($tokenstuff, true);
    $token = $tokenstuff['access_token'];
    // https://openid.net/specs/openid-connect-basic-1_0.html#UserInfoRequest
    $userinfo = post('https://oidc.mit.edu/userinfo', array(
        'access_token' => $token
    ));
    $userinfo = json_decode($userinfo, true);
    $email = $userinfo['email'];

} else {
    /// If cert doesn't work, fallback to OAuth
    $redirectUrl = "https://discord2025.mit.edu$_SERVER[REQUEST_URI]";
    $encodedRedirectUrl = urlencode($redirectUrl);
    header("Location: https://oidc.mit.edu/authorize?client_id=".OAUTH_ID."&response_type=code&redirect_uri=".$encodedRedirectUrl);
}
?>

<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Discord verification</title>
<link rel="preconnect" href="https://fonts.gstatic.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans&amp;display=swap" rel="stylesheet">
<!-- Credit to jt for the styling -->
<link rel="stylesheet" href="verify.css">
</head>

<body>
<div id="main">

<?php

/// Extract kerb from email
$email = strtolower($email);
if (substr($email, -8) != "@mit.edu") {
    die("Given email is $email, which is not an MIT email! If you need help, contact Discord staff.");
} 
$kerb = substr($email, 0, -8);

/// Authenticate Discord member (make sure they came from clicking the link, and therefore own the account)
if (!isset($_REQUEST['id'])) {
	die('Internal error: You didn\'t specify a Discord account to verify!');
}
$member = intval($_REQUEST['id']);
$toHash = PEPPER.":$member";
$hash = hash('sha256', $toHash);
if (!isset($_REQUEST['auth'])) {
	die('Internal error: No auth!');
}
$expectedHash = $_REQUEST['auth'];
if ($hash !== $expectedHash) {
	die('Internal error: Could not verify that you own the Discord account you\'re trying to verify!');
}

/// Check for duplicates
$numDiscordsByKerb = mysqli_num_rows(mysqli_query($connection, "SELECT discord FROM kerbsintl where kerb=\"$kerb\""));
$numKerbsByDiscord = mysqli_num_rows(mysqli_query($connection, "SELECT kerb FROM kerbsintl where discord=\"$member\""));
if ($numKerbsByDiscord > 0) {
    // Let people rejoin after leaving
    //die("You have already verified this Discord account, no need to do it again! If you need help, please contact staff by DM or 2025discordadmin@mit.edu.");
} else if ($numDiscordsByKerb > 0) {
	die("You have already registered a Discord account with that kerb ($kerb)");
}

/// Save into database

$now = time();
$insert_query = "INSERT INTO kerbsintl (kerb, discord, timestamp) VALUES (\"$kerb\", $member, $now)";
$insert_result = mysqli_query($connection, $insert_query);

if (!$insert_result) {
	echo "There was an SQL error, <strong>please report to Discord staff</strong>: " . mysqli_error($connection) . "<br>";
}

/// Give role
$discord->RunAPI("PUT", "guilds/".GUILD_INTL."/members/$member/roles/".ROLE_VERIFIED_INTL, array(), array(), 204);

echo "You have access to the server now! <br> You can introduce yourself in #intros and go to #roles to get roles for pronouns, class year, etc. <br>";

?>
</div>
</body>
</html>
