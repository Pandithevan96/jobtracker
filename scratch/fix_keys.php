<?php

$priv = file_get_contents(__DIR__ . '/../storage/oauth-private.key');
$priv = str_replace(["\r\n", "\r"], "\n", $priv);
file_put_contents(__DIR__ . '/../storage/oauth-private.key', $priv);

$pub = file_get_contents(__DIR__ . '/../storage/oauth-public.key');
$pub = str_replace(["\r\n", "\r"], "\n", $pub);
file_put_contents(__DIR__ . '/../storage/oauth-public.key', $pub);

echo "Keys normalized to LF successfully!\n";
