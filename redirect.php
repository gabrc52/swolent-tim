<?php
require "constants.php";
header("Location: https://petrock.mit.edu/authorize?client_id=".OAUTH_ID."&scope=openid+profile+email&response_type=code&redirect_uri=https%3A%2F%2Fdiscord2025.mit.edu%2F".$_GET['instance'].".php");
die();
?>
