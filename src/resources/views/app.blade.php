<!DOCTYPE html>
<html lang="ja">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="csrf-token" content="{{ csrf_token() }}" />
        <title>CROSSWALK 商品識別子管理システム</title>
        @vite(['resources/css/app.css', 'resources/js/app.ts'])
    </head>
    <body class="bg-slate-50 antialiased">
        <div id="app"></div>
    </body>
</html>
