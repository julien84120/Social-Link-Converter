FROM nginx:alpine
LABEL org.opencontainers.image.title="Social Link Converter" \
      org.opencontainers.image.source="https://github.com/julien84120/Social-Link-Converter"
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html
COPY assets/ /usr/share/nginx/html/assets/
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
