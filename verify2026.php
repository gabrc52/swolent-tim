<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Discord verification</title>
<link rel="preconnect" href="https://fonts.gstatic.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="verify.css">
</head>

<body>
<div id="main">
<?php

/// Debug
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

/// Constants
require "constants.php";

/// SQL stuff
$connection = mysqli_connect(SQL_HOST, SQL_USERNAME, SQL_PASSWORD, SQL_DB);

/// Discord stuff
require_once "support/sdk_discord.php";
$discord = new DiscordSDK();
$discord->SetAccessInfo("Bot", TOKEN);

/// Authenticate Discord member (make sure they came from clicking the link, and therefore own the account)
if (!isset($_GET['id'])) {
	die('Internal error: You didn\'t specify a Discord account to verify!');
}
$member = intval($_GET['id']);
$toHash = PEPPER.":$member";
$hash = hash('sha256', $toHash);
if (!isset($_GET['auth'])) {
	die('Internal error: No auth!');
}
$expectedHash = $_GET['auth'];
if ($hash !== $expectedHash) {
	die('Internal error: Could not verify that you own the Discord account you\'re trying to verify!');
}

/// Check for valid certificate
if (!isset($_SERVER['SSL_CLIENT_S_DN_Email'])) {
    // TODO: Do OAuth if no certificate
	die('No certificate given! See <a href="https://ist.mit.edu/certificates">https://ist.mit.edu/certificates</a> for instructions, then come back here when you have your certificate.');
} else {

    $email = $_SERVER['SSL_CLIENT_S_DN_Email'];

    if (substr($email, -8) != "@MIT.EDU") {
        die("Not an MIT certificate! Given email is $email");
    }

    /// Extract kerb
    $kerb = substr($email, 0, -8);
}

/// Check for duplicates
$numDiscordsByKerb = mysqli_num_rows(mysqli_query($connection, "SELECT discord FROM kerbs26 where kerb=\"$kerb\""));
$numKerbsByDiscord = mysqli_num_rows(mysqli_query($connection, "SELECT kerb FROM kerbs26 where discord=\"$member\""));
if ($numKerbsByDiscord > 0) {
	die("You have already verified this Discord account, no need to do it again! If you need help, please contact staff by DM or 2025discordadmin@mit.edu.");
}

if ($numDiscordsByKerb > 0) {
	die("You have already registered a Discord account with that kerb ($kerb)");
}

/// Check if kerb is a 2026

$commits = file_get_contents("2026s"); // Read file as string
$commits = explode("\n", $commits); // Convert to array
if (!in_array($kerb, $commits)) {
    die("You are not a 2026 comMIT. If this is in error, contact Discord staff.");
}

/// Check if already verified as adMIT by Swole Tim

$result = $discord->RunAPI("GET", "guilds/".GUILD_26."/members/$member");
$roles = $result["data"]["roles"];
$swoleVerified = in_array(ROLE_ADMIT_26, $roles);

/// wtf PHP turns a false into an empty string when interpolating?????
/// Workaround that madness
$swoleVerified = $swoleVerified ? 1 : 0;

/// Save into database

$now = time();
$insert_query = "INSERT INTO kerbs26 (kerb, discord, timestamp, swole) VALUES (\"$kerb\", $member, $now, $swoleVerified)";
$insert_result = mysqli_query($connection, $insert_query);

if (!$insert_result) {
	echo "There was an SQL error, <strong>please report to Discord staff</strong>: " . mysqli_error($connection) . "<br>";
}

/// Give role
$discord->RunAPI("PUT", "guilds/".GUILD_26."/members/$member/roles/".ROLE_COMMIT_26, array(), array(), 204);

echo "You have been given the comMIT role. <br>";

?>
</div>
</body>
</html>
