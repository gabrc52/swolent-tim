<?php

$name = $_GET["name"];

/// The following line removes all characters not letters or numbers, to avoid a shell injection vulnerability
/// Taken from https://stackoverflow.com/questions/5199133/function-to-return-only-alpha-numeric-characters-from-string
$name = preg_replace("/[^a-zA-Z0-9\-_]+/", "", $name);

$mailingListTaken = !exec("blanche -noauth ".$name." 2>&1 | grep \"No such list\"");
$kerbTaken = !exec("stanley -noauth ".$name." 2>&1 | grep \"No records in database match query\"");

if ($mailingListTaken) {
	echo ":x: ".$name." is taken as a mailing list";
} else if ($kerbTaken) {
	echo ":x: ".$name." is taken as a kerb";
} else {
	echo ":white_check_mark: ".$name." is available!";
	if (strlen($name) < 3) {
		echo " However, it is too short for a kerb. You can still create a mailing list with that name.";
	} else if (strlen($name) > 8) {
		echo " However, it is too long for a kerb. You can still create a mailing list with that name.";
	} else if (!ctype_lower($name)) {
		echo " It is strongly recommended to only use lowercase letters in your kerb.";
	}
}

?>
