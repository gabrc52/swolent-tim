<?php

header('Content-Type: text/plain');

$name = $_GET["name"];

/// The following line removes all characters not letters or numbers, to avoid a shell injection vulnerability
/// Taken from https://stackoverflow.com/questions/5199133/function-to-return-only-alpha-numeric-characters-from-string
$name = preg_replace("/[^a-zA-Z0-9\-_.]+/", "", $name);

$output = [];
exec("blanche -info -noauth ".$name." 2>&1", $output);

foreach ($output as $line) {
	echo $line."\n";
}

?>
