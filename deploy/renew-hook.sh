#!/bin/sh
set -eu
case " ${RENEWED_DOMAINS:-} " in
  *" skills.itops.dev "*) /usr/sbin/nginx -t && /usr/bin/systemctl reload nginx ;;
esac
