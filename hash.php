<?php if(isset($_POST["p"])){echo password_hash($_POST["p"], PASSWORD_BCRYPT);} ?>
