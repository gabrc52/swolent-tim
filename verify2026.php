<?php

//// FOR 2026 SERVER /// 

define('INSTANCE', 'verify2026');

include 'verify_common.php';

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
