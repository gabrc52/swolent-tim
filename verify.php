<?php

//// FOR INTERNATIONAL SERVER /// 

define('INSTANCE', 'verify');

include 'verify_common.php';

$server = $_GET['server'];

/// Check for duplicates
$numDiscordsByKerb = mysqli_num_rows(mysqli_query($connection, "SELECT discord FROM kerbs where kerb=\"$kerb\""));
$numKerbsByDiscord = mysqli_num_rows(mysqli_query($connection, "SELECT kerb FROM kerbs where discord=\"$member\""));
if ($numKerbsByDiscord > 0) {
    // Let people rejoin after leaving
    //die("You have already verified this Discord account, no need to do it again! If you need help, please contact staff by DM or 2025discordadmin@mit.edu.");
} else if ($numDiscordsByKerb > 0) {
	die("You have already registered a Discord account with that kerb ($kerb)");
}

/// Save into database

$now = time();
$insert_query = "INSERT INTO kerbs (kerb, discord, timestamp, server) VALUES (\"$kerb\", $member, $now, $server)";
$insert_result = mysqli_query($connection, $insert_query);

if (!$insert_result) {
	echo "There was an SQL error, <strong>please report to Discord staff</strong>: " . mysqli_error($connection) . "<br>";
}

/// Give role
/// TODO: change verified role!
$discord->RunAPI("PUT", "guilds/$server/members/$member/roles/".ROLE_VERIFIED_INTL, array(), array(), 204);

echo "You have access to the server now! <br> You can introduce yourself in #intros and go to #roles to get roles for pronouns, class year, etc. <br>";

?>
</div>
</body>
</html>
