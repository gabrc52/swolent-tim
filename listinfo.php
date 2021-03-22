<?php

header('Content-Type: text/plain');

$name = $_GET["name"];

/// The following line removes all characters not letters or numbers, to avoid a shell injection vulnerability
/// Taken from https://stackoverflow.com/questions/5199133/function-to-return-only-alpha-numeric-characters-from-string
$name = preg_replace("/[^a-zA-Z0-9\-_.]+/", "", $name);

$output = [];
exec("qy glin -f name,description,ace_name,publicflg,active,modtime,modby ".$name." 2>&1 | tail -n +2", $output);

echo "```\n";
foreach ($output as $line) {
	echo $line."\n";
}
echo "```\n";

?>
