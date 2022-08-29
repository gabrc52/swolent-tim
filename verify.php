<?php

define('INSTANCE', 'verify');

include 'verify_common.php';

/// Get server and role
$server = $_GET['server'];
$serverconf = json_decode(file_get_contents('servers.json'), true);
if (!$serverconf[$server] || !$serverconf[$server]['enabled']) {
    die("Verification is not enabled for this server");
}
$role = $serverconf[$server]['role'];

/// Check for duplicates
$numDiscordsByKerb = mysqli_num_rows(mysqli_query($connection, "SELECT discord FROM kerbs where kerb=\"$kerb\""));
$numKerbsByDiscord = mysqli_num_rows(mysqli_query($connection, "SELECT kerb FROM kerbs where discord=\"$member\""));
if ($numKerbsByDiscord > 0) {
    // Let people rejoin after leaving
    /// TODO: this could be configurable (whether server owners want to allow duplicate discord accounts)
    /// the problem with this is that it requires manual intervention when people leave and rejoin the server even on the same account    
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
$discord->RunAPI("PUT", "guilds/$server/members/$member/roles/$role", array(), array(), 204);

echo "You have access to the server now! <br> You can introduce yourself in #intros and go to #roles to get roles for pronouns, class year, etc. <br>";

?>
</div>
</body>
</html>
