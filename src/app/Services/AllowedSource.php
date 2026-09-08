<?php

namespace App\Services;

class AllowedSource
{
    public static function normalize(string $value): ?string
    {
        $parts = explode('/', trim($value));
        if (count($parts) > 2 || filter_var($parts[0], FILTER_VALIDATE_IP) === false) {
            return null;
        }
        $packed = inet_pton($parts[0]);
        $ip = inet_ntop($packed);
        if (count($parts) === 1) {
            return $ip;
        }
        if (! preg_match('/^(0|[1-9][0-9]{0,2})$/D', $parts[1])) {
            return null;
        }
        $prefix = (int) $parts[1];
        if ($prefix > strlen($packed) * 8) {
            return null;
        }
        for ($i = 0; $i < strlen($packed); $i++) {
            $bits = max(0, min(8, $prefix - $i * 8));
            $packed[$i] = chr(ord($packed[$i]) & (0xFF << (8 - $bits)));
        }

        return inet_ntop($packed).'/'.$prefix;
    }
}
