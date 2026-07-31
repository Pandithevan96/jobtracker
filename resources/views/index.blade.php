<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <link type="image/png" href="{{ asset('images/logo/logo.png') }}" rel="icon" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{ config('app.name') }}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Charm:wght@400;700&family=Geist:wght@100..900&display=swap"
        rel="stylesheet">
</head>

<body class="scrollbar-hide">
    <div id="root"></div>
    @viteReactRefresh
  @vite(['resources/css/app.css', 'resources/@client/main.tsx'])
</body>

</html>
