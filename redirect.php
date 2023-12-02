<?php
require "constants.php";
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
<style>
.button { display: block; text-align: center; background: #9d2235; text-transform: uppercase; text-decoration: none; color: white; padding: 16px; border-radius: 4px; margin-top: 16px; margin-left: 20px; margin-right: 20px; }
</style>
</head>

<body>
<div id="main">
<?php
    if (!isset($_GET['instance'])) {
        die("Internal error: `instance` is not set! This shouldn't happen -- report to Discord staff if you weren't playing with the URL");
    }
?>
    <p>Your certificate did not work. Password authentication is experimental and may take up to 20 seconds to load.</p>
    Click on the following button to continue:
    <br>
    <a class="button" href="https://petrock.mit.edu/authorize?client_id=<?= OAUTH_ID ?>&scope=openid+profile+email&response_type=code&redirect_uri=https%3A%2F%2Fdiscord2025.mit.edu%2F<?= $_GET['instance'] ?>.php">Try password authentication</a>
    <br>
    If password authentication doesn't work, we recommend:
    <ul>
        <li>Install your certificate following <a href="https://ist.mit.edu/certificates">instructions from IS&T</a></li>
        <li>If this still doesn't work, try using an incognito window</li>
        <li>If still unsuccessful, contact Discord staff</li>
    </ul>
</div>
</body>
</html>