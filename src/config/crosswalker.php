<?php

return [
    // Comma-separated proxy IPs/CIDRs. Only list proxies managed by the deployment.
    'trusted_proxies' => array_values(array_filter(array_map(
        'trim', explode(',', (string) env('TRUSTED_PROXIES', '')),
    ))),
];
