#!/bin/sh
# Run with sh ./install.sh (or sudo sh ./install.sh if Docker requires sudo).
set -eu
print_link() {
    if [ -t 1 ]; then
        printf '\033]8;;%s\033\\%s\033]8;;\033\\ : %s\n' "$2" "$1" "$2"
    else
        printf '%s : %s\n' "$1" "$2"
    fi
}
cd -- "$(dirname -- "$0")"
docker compose up -d --build --wait
publications=$(docker compose port link-converter 80)
# Docker can return one publication per address family. Prefer IPv4.
publication=$(printf '%s\n' "$publications" | awk '
    /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:[0-9]+$/ {print; found=1; exit}
    /./ && first=="" {first=$0}
    END {if (!found) print first}
')
port=${publication##*:}
bind=${publication%:*}
case "$port" in
    ''|*[!0-9]*) printf 'Publication Docker invalide.\n' >&2; exit 1 ;;
esac
if [ "$port" -lt 1 ] || [ "$port" -gt 65535 ] || [ "$bind" = "$publication" ]; then
    printf 'Publication Docker invalide.\n' >&2
    exit 1
fi
printf 'Accès non garanti : vérifier le pare-feu et le réseau.\n'
case "$bind" in
    127.*|'[::1]'|'::1')
        case "$bind" in
            127.0.0.1|'[::1]'|'::1') print_link 'Local' "http://localhost:$port" ;;
            *) print_link 'Local' "http://$bind:$port" ;;
        esac
        printf 'Bind loopback : aucun accès depuis une autre machine.\n'
        exit 0
        ;;
    *:*)
        printf 'Publication IPv6 : détection du lien réseau IPv4 non prise en charge.\n'
        printf 'Local : http://localhost:%s (disponibilité non vérifiée avec ce bind IPv6)\n' "$port"
        exit 0
        ;;
    0.0.0.0) ;;
    *)
        printf 'Local : http://localhost:%s (indisponible avec ce bind)\n' "$port"
        print_link 'Réseau' "http://$bind:$port"
        exit 0
        ;;
esac
case $(uname -s) in
    Linux) address=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i=1;i<NF;i++) if ($i=="src") {print $(i+1); exit}}') ;;
    Darwin)
        interface=$(route -n get default 2>/dev/null | awk '$1=="interface:" {print $2; exit}')
        address=$(ipconfig getifaddr "$interface" 2>/dev/null || true)
        ;;
    *) address='' ;;
esac
print_link 'Local' "http://localhost:$port"
if printf '%s\n' "$address" | awk -F. '
    NF != 4 {exit 1}
    {for (i=1;i<=4;i++) if ($i !~ /^[0-9]+$/ || $i > 255) exit 1}
    $1 == 0 || $1 == 127 || $1 >= 224 {exit 1}
'; then
    print_link 'Réseau' "http://$address:$port"
else
    printf 'IPv4 du réseau non détectée : aucun lien distant proposé.\n'
fi
