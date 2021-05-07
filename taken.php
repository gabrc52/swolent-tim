<?php

/* Datamodel:
 * {"available": <whether the input is available>, "errors": [<errors> ...]
 * where each error has the form {"code": "STRING_CODE", "message": "default message for the error"}.
 */
function finish($available, $errors) {
	return json_encode(array(
		"available" => $available,
		"errors" => $errors,
	));
}

function error($code, $message) {
	return array("code" => $code, "message" => $message);
}
function fail($code, $message) {
	return finish(false, array(error($code, $message)));
}

function parse($name) {
	if (!is_string($name)) {
		return fail("BAD_INPUT_TYPE", "`name` field missing from input.");
	}
	if (empty($name)) {
		return fail("EMPTY_INPUT", "Missing input string! Please provide a string to check whether it's available.");
	}
	$name = strtolower($name);
	if (!preg_match("/^[a-z0-9_.-]+$/", $name)) {
		return fail("BAD_INPUT_CHARS", "Input has invalid chars for a kerb or mailing list! Must be composed of: letters, numbers, dashes, dots, underscores.");
	}

	// TODO: Look into a less porcelain API?
	$mailingListTaken = !exec("qy glin {$name} 2>&1 | grep \"No records in database match query\"");
	if ($mailingListTaken) {
		return fail("EXISTING_LIST", "{$name} is already taken as a mailing list.");
	}
	$kerbTaken = !exec("qy gubl {$name} 2>&1 | grep \"No records in database match query\"");
	if ($kerbTaken) {
		return fail("EXISTING_KERB", "{$name} is already taken as a kerb.");
	}

	$warnings = array();
	if (!preg_match("/^[a-z0-9_]+$/", $name)) {
		$warnings[] = error("BAD_KERB_CHARS", "kerbs must be composed of letters, numbers, and underscores");
	}
	if (strlen($name) < 3) {
		$warnings[] = error("KERB_TOO_SHORT", "kerbs must be at least 3 characters long");
	}
	if (strlen($name) > 8) {
		$warnings[] = error("KERB_TOO_LONG", "kerbs must be at most 8 characters long");
	}
	
	return finish(true, $warnings);
}

header('Content-Type: application/json');
echo parse($_GET["name"]);

?>
